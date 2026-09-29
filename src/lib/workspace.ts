import { getSupabase } from './supabase'

export type WorkspaceGoal = {
  id: string
  name: string
  target: number
  saved: number
  date: string
}

export type WorkspaceGroup = { id: string; name: string; purpose: string; target: number }

export type WorkspaceSnapshot = {
  name: string
  phone: string
  language: string
  balance: number
  goals: WorkspaceGoal[]
  groups: WorkspaceGroup[]
  transactions: { id: string; title: string; detail: string; amount: number; date: string; status: string }[]
  kycComplete: boolean
  kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected'
}

export async function loadWorkspace(userId: string): Promise<WorkspaceSnapshot> {
  const supabase = await getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')

  const [profileResult, walletResult, goalsResult, groupsResult, transactionsResult] = await Promise.all([
    supabase.from('profiles').select('full_name, phone, preferred_language, kyc_status').eq('id', userId).maybeSingle(),
    supabase.from('wallet_accounts').select('balance_rwf').eq('user_id', userId).maybeSingle(),
    supabase.from('savings_goals').select('id, name, target_rwf, target_date, status').eq('user_id', userId).eq('status', 'active').order('created_at', { ascending: false }),
    supabase.from('savings_groups').select('id, name, purpose, target_rwf').eq('owner_id', userId).order('created_at', { ascending: false }),
    supabase.from('transactions').select('id, kind, amount_rwf, description, status, created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(20),
  ])

  const firstError = profileResult.error || walletResult.error || goalsResult.error || groupsResult.error || transactionsResult.error
  if (firstError) throw firstError

  const goalRows = goalsResult.data ?? []
  const goalIds = goalRows.map((goal) => goal.id)
  const contributionsResult = goalIds.length
    ? await supabase.from('savings_contributions').select('goal_id, amount_rwf').in('goal_id', goalIds).eq('status', 'posted')
    : { data: [], error: null }
  if (contributionsResult.error) throw contributionsResult.error

  const contributions = new Map<string, number>()
  for (const contribution of contributionsResult.data ?? []) {
    contributions.set(contribution.goal_id, (contributions.get(contribution.goal_id) ?? 0) + Number(contribution.amount_rwf))
  }

  return {
    name: profileResult.data?.full_name || 'Akiba member',
    phone: profileResult.data?.phone || '',
    language: profileResult.data?.preferred_language || 'English',
    balance: Number(walletResult.data?.balance_rwf ?? 0),
    goals: goalRows.map((goal) => ({
      id: goal.id,
      name: goal.name,
      target: Number(goal.target_rwf),
      saved: contributions.get(goal.id) ?? 0,
      date: goal.target_date || 'No target date',
    })),
    groups: (groupsResult.data ?? []).map((group) => ({ id: group.id, name: group.name, purpose: group.purpose, target: Number(group.target_rwf) })),
    transactions: (transactionsResult.data ?? []).map((transaction) => ({
      id: transaction.id,
      title: transaction.description,
      detail: `${transaction.kind.replaceAll('_', ' ')} · ${new Date(transaction.created_at).toLocaleDateString()}`,
      amount: Number(transaction.amount_rwf),
      date: new Date(transaction.created_at).toLocaleDateString(),
      status: transaction.status,
    })),
    kycComplete: profileResult.data?.kyc_status === 'verified',
    kycStatus: (profileResult.data?.kyc_status || 'not_started') as WorkspaceSnapshot['kycStatus'],
  }
}

export async function savePreferredLanguage(userId: string, language: string) {
  const supabase = await getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('profiles').update({ preferred_language: language }).eq('id', userId)
  if (error) throw error
}

export async function createSavingsGoal(userId: string, goal: { name: string; target: number; date: string; cadence: string }) {
  const supabase = await getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('savings_goals').insert({
    user_id: userId,
    name: goal.name,
    target_rwf: goal.target,
    target_date: goal.date || null,
    cadence: goal.cadence,
  }).select('id, name, target_rwf, target_date').single()
  if (error) throw error
  return { id: data.id, name: data.name, target: Number(data.target_rwf), saved: 0, date: data.target_date || 'No target date' }
}

export async function createSavingsGroup(userId: string, group: { name: string; purpose: string; target: number }) {
  const supabase = await getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('savings_groups').insert({
    owner_id: userId,
    name: group.name,
    purpose: group.purpose,
    target_rwf: group.target,
  }).select('id, name, purpose, target_rwf').single()
  if (error) throw error
  return { id: data.id, name: data.name, purpose: data.purpose, target: Number(data.target_rwf) }
}

export async function submitLoanApplication(userId: string, amount: number, termMonths: number) {
  const supabase = await getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.from('loan_applications').insert({
    user_id: userId,
    requested_rwf: amount,
    term_months: termMonths,
  }).select('id, status').single()
  if (error) throw error
  return data
}

export async function uploadKycDocument(userId: string, documentType: 'identity' | 'selfie' | 'residence', file: File) {
  const supabase = await getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf']
  if (!allowedTypes.includes(file.type)) throw new Error('Choose a JPG, PNG, or PDF document.')
  if (file.size > 10 * 1024 * 1024) throw new Error('Documents must be smaller than 10 MB.')

  const extension = file.name.split('.').pop()?.replace(/[^a-zA-Z0-9]/g, '') || 'upload'
  const storagePath = `${userId}/${crypto.randomUUID()}.${extension}`
  const { error: uploadError } = await supabase.storage.from('kyc-documents').upload(storagePath, file, {
    cacheControl: '0',
    contentType: file.type,
    upsert: false,
  })
  if (uploadError) throw uploadError

  const { error: metadataError } = await supabase.from('kyc_documents').insert({
    user_id: userId,
    document_type: documentType,
    storage_path: storagePath,
  })
  if (metadataError) {
    await supabase.storage.from('kyc-documents').remove([storagePath])
    throw metadataError
  }

  return storagePath
}

export async function submitKycForReview() {
  const supabase = await getSupabase()
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase.rpc('submit_kyc_for_review')
  if (error) throw error
  return data as string
}
