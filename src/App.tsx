import { Children, createContext, useContext, useEffect, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowDownLeft, ArrowLeft, ArrowRight, ArrowUpRight, Bell, BookOpen, CalendarDays, Check, ChevronRight,
  CircleHelp, Clock3, CreditCard, Download, Droplets, Eye, EyeOff, Fingerprint,
  Globe2, HandCoins, HelpCircle, House, Landmark, LockKeyhole, LogOut,
  MoonStar, PiggyBank, Plus, QrCode, ReceiptText, Search, Send, Settings, ShieldCheck,
  Smartphone, Sparkles, SunMedium, Target, TrendingUp, Users, Wallet, Wifi, Zap,
  type LucideIcon,
} from 'lucide-react'
import { Link, NavLink, Navigate, Route, Routes, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import { createSavingsGoal, createSavingsGroup, loadWorkspace, savePreferredLanguage, submitKycForReview, submitLoanApplication, uploadKycDocument } from './lib/workspace'
import { isAppLanguage, languageTag, translate } from './lib/localization'
import './App.css'

type Goal = { id: string; name: string; target: number; saved: number; date: string }
type SavingsGroup = { id: string; name: string; purpose: string; target: number }
type Transaction = { id: string; title: string; detail: string; amount: number; date: string; status: string }
type Draft = { kind: string; recipient: string; amount: number; account: string }
type DemoState = {
  language: string
  theme: 'light' | 'dark'
  email: string
  phone: string
  name: string
  balance: number
  goals: Goal[]
  groups: SavingsGroup[]
  transactions: Transaction[]
  draft: Draft | null
  result: Transaction | null
  kycComplete: boolean
  kycStatus: 'not_started' | 'pending' | 'verified' | 'rejected'
  biometrics: boolean
  offline: boolean
}

const startingState: DemoState = {
  language: 'English', theme: 'light', email: '', phone: '', name: 'Jean Claude', balance: 250000,
  goals: [
    { id: 'rainy-day', name: 'Emergency fund', target: 500000, saved: 175000, date: '31 Dec 2026' },
    { id: 'school-fees', name: 'School fees', target: 300000, saved: 120000, date: '15 Jan 2027' },
  ],
  groups: [],
  transactions: [
    { id: 'TX-24810', title: 'MTN Rwanda', detail: 'Airtime · Today, 9:42 AM', amount: -5000, date: 'Today', status: 'Successful' },
    { id: 'TX-24792', title: 'REG Electricity', detail: 'Bill payment · Yesterday', amount: -12500, date: 'Yesterday', status: 'Successful' },
    { id: 'TX-24614', title: 'Wallet deposit', detail: 'Mobile Money · 24 Sep 2026', amount: 50000, date: '24 Sep', status: 'Successful' },
  ],
  draft: null, result: null, kycComplete: false, kycStatus: 'not_started', biometrics: true, offline: false,
}

type DemoContextValue = {
  data: DemoState
  t: (text: string) => string
  update: (patch: Partial<DemoState>) => void
  transact: (title: string, detail: string, amount: number) => Transaction
  isPreview: boolean
  backendError: string
}

const DemoContext = createContext<DemoContextValue | null>(null)
const services: { name: string; detail: string; code: string; icon: LucideIcon; accent: string }[] = [
  { name: 'Electricity', detail: 'REG prepaid & postpaid', code: 'REG', icon: Zap, accent: 'amber' },
  { name: 'Water', detail: 'WASAC water services', code: 'WASAC', icon: Droplets, accent: 'sky' },
  { name: 'Airtime & data', detail: 'MTN · Airtel · Tigo', code: 'MTN', icon: Smartphone, accent: 'mint' },
  { name: 'Internet', detail: 'Broadband & Wi-Fi', code: 'Internet', icon: Wifi, accent: 'violet' },
  { name: 'TV subscription', detail: 'Canal+ · StarTimes', code: 'TV', icon: CreditCard, accent: 'coral' },
  { name: 'School fees', detail: 'Tuition & education', code: 'School', icon: BookOpen, accent: 'blue' },
]

const STORAGE_KEY = 'akibaos-demo'

function readState(): DemoState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...startingState, ...JSON.parse(saved) as Partial<DemoState> } : startingState
  } catch {
    return startingState
  }
}

function formatRwf(value: number) {
  return `${Math.abs(value).toLocaleString('en-US')} RWF`
}

function App() {
  const { isAuthenticated, isPreview, user } = useAuth()
  const [data, setData] = useState<DemoState>(() => {
    const initial = isPreview ? readState() : {
      ...startingState,
      name: 'Akiba member',
      phone: '',
      balance: 0,
      goals: [],
      groups: [],
      transactions: [],
      kycComplete: false,
      kycStatus: 'not_started' as const,
    }
    const savedLanguage = localStorage.getItem('akibaos-language')
    return { ...initial, language: savedLanguage && isAppLanguage(savedLanguage) ? savedLanguage : initial.language }
  })
  const [backendError, setBackendError] = useState('')
  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = data.theme
    root.lang = languageTag(data.language)
    root.style.colorScheme = data.theme
    localStorage.setItem('akibaos-language', data.language)
    if (isPreview) localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }, [data, isPreview])
  useEffect(() => {
    if (!isAuthenticated || isPreview || !user) return
    let active = true
    void loadWorkspace(user.id).then((workspace) => {
      if (!active) return
      setData((current) => ({
        ...current,
        ...workspace,
        draft: null,
        result: null,
        biometrics: true,
        offline: false,
      }))
    }).catch((error: unknown) => {
      if (!active) return
      setBackendError(error instanceof Error ? error.message : 'Unable to load your account data.')
    })
    return () => { active = false }
  }, [isAuthenticated, isPreview, user])
  useEffect(() => {
    if (!user || isPreview) return
    void savePreferredLanguage(user.id, data.language)
  }, [data.language, isPreview, user])
  const update = (patch: Partial<DemoState>) => setData((current) => ({ ...current, ...patch }))
  const transact = (title: string, detail: string, amount: number) => {
    if (!isPreview) throw new Error('Wallet operations are disabled until a payment provider is connected.')
    const transaction: Transaction = { id: `AK-${Date.now().toString().slice(-7)}`, title, detail, amount, date: 'Just now', status: 'Successful' }
    setData((current) => ({ ...current, balance: current.balance + amount, result: transaction, transactions: [transaction, ...current.transactions] }))
    return transaction
  }
  const value = { data, t: (text: string) => translate(data.language, text), update, transact, isPreview, backendError }
  return <DemoContext.Provider value={value}><AppFrame /></DemoContext.Provider>
}

function useDemo() {
  const context = useContext(DemoContext)
  if (!context) throw new Error('AkibaOS screens must be rendered inside the app provider.')
  return context
}

function AppFrame() {
  const { isLoading, isAuthenticated, isConfigured, isPreview, user } = useAuth()
  const { data, backendError, t } = useDemo()
  const location = useLocation()
  const isOnboarding = location.pathname.startsWith('/onboarding')
  const isResult = location.pathname.endsWith('/result') || location.pathname.endsWith('/success') || location.pathname.endsWith('journey-complete')
  const setupRoutes = ['/onboarding/profile', '/onboarding/complete', '/onboarding/kyc']
  const isSetupRoute = setupRoutes.includes(location.pathname)
  const showApp = isAuthenticated && !isSetupRoute && !isOnboarding
  const authName = isPreview ? data.name : user?.user_metadata.full_name || user?.phone || 'Akiba member'

  if (isLoading) return <div className="auth-loading"><span className="brand-symbol large"><span /><span /></span><strong>AkibaOS</strong><i /></div>
  if (!isAuthenticated && isSetupRoute) return <Navigate to="/onboarding" replace />
  if (!isAuthenticated && !isOnboarding) return <Navigate to="/onboarding" replace />
  if (isAuthenticated && isOnboarding && !isSetupRoute) return <Navigate to="/" replace />

  if (!showApp) return <div className="auth-shell"><Link to="/onboarding" className="wordmark auth-wordmark"><span className="brand-symbol"><span /><span /></span><span><strong>AkibaOS</strong><small>{t('Financial freedom for every Rwandan')}</small></span></Link><main className="auth-main"><OutletScreen /></main><footer className="auth-trust"><ShieldCheck size={14} /> {t('Protected with secure account sign-in')} <span>•</span> {t('Made for Rwanda')}</footer></div>

  return <AuthenticatedShell authName={authName} isConfigured={isConfigured} isPreview={isPreview} backendError={backendError} isResult={isResult}><OutletScreen /></AuthenticatedShell>
}

function AuthenticatedShell({ children, authName, isConfigured, isPreview, backendError, isResult }: { children: ReactNode; authName: string; isConfigured: boolean; isPreview: boolean; backendError: string; isResult: boolean }) {
  const { t } = useDemo()
  const location = useLocation()
  const isHome = location.pathname === '/'
  const isCompactPage = ['/wallet', '/bills', '/transactions', '/profile'].some((path) => location.pathname === path || location.pathname.startsWith(`${path}/`))
  return <div className="app-shell">
    <header className="site-header">
      <Link to="/" className="wordmark"><span className="brand-symbol"><span /><span /></span><span><strong>AkibaOS</strong><small>{t('Financial freedom for every Rwandan')}</small></span></Link>
      <div className="header-tools">
        <Link to="/notifications" aria-label={t('Notifications')} className="header-icon"><Bell size={18} /><i /></Link>
        <Link to="/profile" className="profile-chip" aria-label={t('Profile & settings')}><span className="user-avatar">{authName.split(/\s+/).map((part) => part[0]).slice(0, 2).join('').toUpperCase()}</span><span>{authName}</span></Link>
      </div>
    </header>
    {isPreview && <div className="preview-banner"><Sparkles size={14} /><span><strong>{t('Local preview')}</strong> {t('Sample data only. Payments and credit are simulated.')}</span><span>{isConfigured ? t('Preview mode') : t('Connect Supabase to enable secure sign-in')}</span></div>}
    {backendError && <div className="backend-error" role="alert"><ShieldCheck size={15} /><span>{backendError}</span><button onClick={() => window.location.reload()}>{t('Retry')}</button></div>}
    <main className={`main-content${isResult ? ' result-content' : ''}${isHome ? ' dashboard-content' : ''}${isCompactPage ? ' compact-content' : ''}`}>{children}</main>
    <footer className="site-footer"><span>AkibaOS <i>•</i> Rwanda</span><div><Link to="/help">{t('Help & support')}</Link><Link to="/profile">{t('Privacy & security')}</Link><span>{isPreview ? t('Local preview · No real money moves') : t('Your account is protected')}</span></div></footer>
    <nav className="bottom-nav" aria-label={t('Primary navigation')}>
      <NavLink to="/" end><House size={17} /><span>{t('Home')}</span></NavLink>
      <NavLink to="/wallet"><Wallet size={17} /><span>{t('Wallet')}</span></NavLink>
      <NavLink to="/bills"><ReceiptText size={17} /><span>{t('Bills')}</span></NavLink>
      <NavLink to="/transactions"><Clock3 size={17} /><span>{t('Activity')}</span></NavLink>
      <NavLink to="/profile"><Settings size={17} /><span>{t('Profile')}</span></NavLink>
    </nav>
  </div>
}

function OutletScreen() {
  return <Routes>
    <Route path="/onboarding" element={<WelcomeScreen />} /><Route path="/onboarding/language" element={<LanguageScreen />} /><Route path="/onboarding/register" element={<EmailPasswordScreen mode="signup" />} /><Route path="/onboarding/login" element={<EmailPasswordScreen mode="signin" />} /><Route path="/onboarding/profile" element={<ProfileSetupScreen />} /><Route path="/onboarding/complete" element={<AccountCreatedScreen />} /><Route path="/onboarding/kyc" element={<KycScreen />} />
    <Route path="/" element={<HomeScreen />} /><Route path="/wallet" element={<WalletScreen />} /><Route path="/wallet/action/:kind" element={<WalletActionScreen />} /><Route path="/wallet/review" element={<WalletReviewScreen />} /><Route path="/wallet/result" element={<WalletResultScreen />} />
      <Route path="/savings" element={<SavingsScreen />} /><Route path="/savings/new" element={<CreateGoalScreen />} /><Route path="/savings/vault" element={<VaultScreen />} /><Route path="/savings/groups" element={<GroupsScreen />} /><Route path="/savings/groups/create" element={<CreateGroupScreen />} /><Route path="/savings/groups/current" element={<GroupDetailScreen />} /><Route path="/goals" element={<GoalsScreen />} />
    <Route path="/bills" element={<BillsScreen />} /><Route path="/bills/:provider" element={<BillDetailsScreen />} /><Route path="/bills/review" element={<BillReviewScreen />} /><Route path="/bills/result" element={<BillResultScreen />} />
    <Route path="/credit" element={<CreditScreen />} /><Route path="/credit/apply" element={<LoanApplicationScreen />} /><Route path="/credit/schedule" element={<RepaymentScreen />} /><Route path="/credit/score" element={<AkibaScoreScreen />} /><Route path="/credit/success" element={<LoanSuccessScreen />} />
    <Route path="/transactions" element={<TransactionsScreen />} /><Route path="/notifications" element={<NotificationsScreen />} /><Route path="/profile/edit" element={<ProfileEditScreen />} /><Route path="/profile" element={<ProfileScreen />} /><Route path="/help" element={<HelpScreen />} /><Route path="/offline" element={<OfflineScreen />} /><Route path="/ussd" element={<UssdScreen />} /><Route path="/journey-complete" element={<JourneyCompleteScreen />} /><Route path="*" element={<HomeScreen />} />
  </Routes>
}

function ScreenTitle({ eyebrow, title, description, back = false }: { eyebrow?: string; title: string; description?: string; back?: boolean }) {
  const { t } = useDemo()
  const navigate = useNavigate()
  return <div className="screen-title">{back && <button className="back-button" onClick={() => navigate(-1)} aria-label={t('Back')}><ArrowLeft size={18} /></button>}<div>{eyebrow && <p className="eyebrow">{t(eyebrow)}</p>}<h1>{t(title)}</h1>{description && <p>{t(description)}</p>}</div></div>
}

function PrimaryButton({ children, to, onClick, type = 'button', disabled = false }: { children: ReactNode; to?: string; onClick?: () => void; type?: 'button' | 'submit'; disabled?: boolean }) {
  const { t } = useDemo()
  const localizedChildren = Children.map(children, (child) => typeof child === 'string' ? t(child.trim()) : child)
  if (to) return <Link className="primary-button" to={to}>{localizedChildren}<ArrowRight size={16} /></Link>
  return <button className="primary-button" type={type} onClick={onClick} disabled={disabled}>{localizedChildren}<ArrowRight size={16} /></button>
}

function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return <div className="section-heading"><h2>{children}</h2>{action}</div>
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`surface-card ${className}`}>{children}</section>
}

function Field({ label, id, ...props }: { label: string; id: string; type?: string; placeholder?: string; value?: string | number; onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void; required?: boolean; autoComplete?: string; inputMode?: 'text' | 'numeric' | 'tel' | 'email' | 'decimal'; min?: string | number; max?: string | number; minLength?: number }) {
  const { t } = useDemo()
  return <label className="field" htmlFor={id}><span>{t(label)}</span><input id={id} {...props} placeholder={props.placeholder ? t(props.placeholder) : undefined} /></label>
}

function BalanceCard({ compact = false }: { compact?: boolean }) {
  const { data } = useDemo()
  const [visible, setVisible] = useState(true)
  return <section className={`balance-card${compact ? ' balance-compact' : ''}`}><div className="balance-card-top"><span>Available balance</span><button onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide balance' : 'Show balance'}>{visible ? <Eye size={17} /> : <EyeOff size={17} />}</button></div><strong>{visible ? `${data.balance.toLocaleString('en-US')} RWF` : '•••••• RWF'}</strong><span className="balance-card-foot"><TrendingUp size={13} /> Wallet is active and ready to use</span><div className="balance-watermark"><Wallet size={100} /></div></section>
}

function QuickAction({ to, label, icon: Icon, color = 'blue' }: { to: string; label: string; icon: LucideIcon; color?: string }) {
  return <Link to={to} className="quick-action"><span className={`quick-action-icon ${color}`}><Icon size={20} /></span><span>{label}</span></Link>
}

function GoalRow({ goal }: { goal: Goal }) {
  const percent = Math.min(100, Math.round((goal.saved / goal.target) * 100))
  return <Link className="goal-row" to="/savings/vault"><span className="goal-row-icon"><Target size={18} /></span><span className="goal-row-main"><strong>{goal.name}</strong><small>{goal.saved.toLocaleString('en-US')} of {goal.target.toLocaleString('en-US')} RWF</small><span className="progress-bar"><i style={{ width: `${percent}%` }} /></span></span><b>{percent}%</b></Link>
}

function TransactionRows({ items, limit }: { items: Transaction[]; limit?: number }) {
  return <div className="transaction-rows">{items.slice(0, limit).map((item) => <Link key={item.id} to={`/transactions#${item.id}`} className="transaction-row"><span className={`transaction-symbol ${item.amount > 0 ? 'incoming' : ''}`}>{item.amount > 0 ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span><span className="transaction-description"><strong>{item.title}</strong><small>{item.detail}</small></span><span className={`transaction-value${item.amount > 0 ? ' incoming-text' : ''}`}>{item.amount > 0 ? '+' : '−'}{formatRwf(item.amount)}</span></Link>)}</div>
}

function ActivitySummary({ items, title = 'Activity summary' }: { items: Transaction[]; title?: string }) {
  const received = items.filter((item) => item.amount > 0).reduce((total, item) => total + item.amount, 0)
  const spent = items.filter((item) => item.amount < 0).reduce((total, item) => total + Math.abs(item.amount), 0)
  return <Card className="activity-summary"><SectionTitle>{title}</SectionTitle><div className="activity-summary-grid"><span><small>Received</small><strong>{formatRwf(received)}</strong></span><span><small>Spent</small><strong>{formatRwf(spent)}</strong></span><span><small>Transactions</small><strong>{items.length}</strong></span></div></Card>
}

function HomeScreen() {
  const { data, isPreview } = useDemo()
  return <>
    <div className="welcome-row"><div><p className="eyebrow">MONDAY, 28 SEPTEMBER</p><h1>Welcome back, {data.name.split(' ')[0]} <span>👋</span></h1><p>Your account is ready when you are.</p></div><Link className="welcome-bell" to="/notifications" aria-label="Notifications"><Bell size={19} /><i /></Link></div>
    <div className="home-grid">
      <div className="home-primary">
        <BalanceCard />
        <div className="quick-actions">
          <QuickAction to="/wallet/action/deposit" label="Add money" icon={Plus} />
          <QuickAction to="/wallet/action/send" label="Send" icon={Send} color="mint" />
          <QuickAction to="/wallet/action/withdraw" label="Withdraw" icon={ArrowUpRight} color="amber" />
          <QuickAction to="/ussd" label="USSD" icon={QrCode} color="violet" />
        </div>
        <section className="home-bill-services" aria-labelledby="home-bill-heading">
          <div className="home-bill-heading"><h2 id="home-bill-heading">Pay bills</h2><Link className="inline-link" to="/bills">All services <ArrowRight size={14} /></Link></div>
          <div className="home-bill-grid">{services.map(({ code, name, icon: Icon, accent }) => <Link key={code} to={`/bills/${encodeURIComponent(code)}`} className="home-bill-service"><span className={`home-bill-icon ${accent}`}><Icon size={19} /></span><span>{name}</span></Link>)}</div>
        </section>
        <Card className="bill-card"><SectionTitle action={<Link className="inline-link" to="/bills">View all <ArrowRight size={14} /></Link>}>Upcoming bills</SectionTitle>{isPreview ? <><BillMini name="REG Electricity" due="Due 30 Sep · sample" amount={12000} icon={Zap} /><BillMini name="WASAC Water" due="Due 04 Oct · sample" amount={8500} icon={Droplets} /></> : <p className="empty-note">No bill reminders are connected yet. Browse services to make a payment.</p>}</Card>
      </div>
      <div className="home-secondary">
        <Card><SectionTitle action={<Link className="inline-link" to="/savings">See all <ArrowRight size={14} /></Link>}>My savings</SectionTitle>{data.goals.slice(0, 2).map((goal) => <GoalRow key={goal.id} goal={goal} />)}<Link className="add-goal-link" to="/savings/new"><Plus size={15} /> Start a new goal</Link></Card>
        <Card><SectionTitle action={<Link className="inline-link" to="/transactions">See all <ArrowRight size={14} /></Link>}>Recent activity</SectionTitle>{data.transactions.length ? <TransactionRows items={data.transactions} limit={3} /> : <p className="empty-note">Your activity will appear here.</p>}</Card>
      </div>
    </div>
    <div className="home-footer-actions"><Link to="/credit/score"><span><ShieldCheck size={18} /></span><strong>Akiba Score</strong><small>{isPreview ? 'Sample score insights' : 'Score data is not available yet'}</small><ChevronRight size={17} /></Link><Link to={data.kycStatus === 'pending' ? '/profile' : '/onboarding/kyc'}><span><Fingerprint size={18} /></span><strong>{data.kycComplete ? 'Identity verified' : data.kycStatus === 'pending' ? 'Verification in review' : 'Verify your account'}</strong><small>{data.kycComplete ? 'Your profile is complete' : data.kycStatus === 'pending' ? 'We’ll update you when review is complete' : 'Unlock account features'}</small><ChevronRight size={17} /></Link></div>
  </>
}

function BillMini({ name, due, amount, icon: Icon }: { name: string; due: string; amount: number; icon: LucideIcon }) {
  return <Link to={`/bills/${encodeURIComponent(name.split(' ')[0])}`} className="bill-mini"><span className="bill-mini-icon"><Icon size={17} /></span><span><strong>{name}</strong><small>{due}</small></span><span className="bill-mini-amount">{amount.toLocaleString('en-US')} RWF</span><ChevronRight size={15} /></Link>
}

function WalletScreen() {
  const { data } = useDemo()
  return <><ScreenTitle eyebrow="MY WALLET" title="Your money, at a glance" description="Manage your balance and move money safely." /><BalanceCard /><div className="quick-actions wallet-actions"><QuickAction to="/wallet/action/deposit" label="Add money" icon={Plus} /><QuickAction to="/wallet/action/send" label="Send money" icon={Send} color="mint" /><QuickAction to="/wallet/action/withdraw" label="Withdraw" icon={ArrowUpRight} color="amber" /><QuickAction to="/transactions" label="Activity" icon={Clock3} color="violet" /></div><Card><SectionTitle action={<Link className="inline-link" to="/transactions">View all <ArrowRight size={14} /></Link>}>Recent transactions</SectionTitle><TransactionRows items={data.transactions} /></Card><ActivitySummary items={data.transactions} title="Wallet activity" /></>
}

function WalletActionScreen() {
  const { kind = 'send' } = useParams()
  const { data, update, isPreview } = useDemo()
  const navigate = useNavigate()
  const [recipient, setRecipient] = useState('')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const isSend = kind === 'send'
  const isWithdraw = kind === 'withdraw'
  const title = isSend ? 'Send money' : isWithdraw ? 'Withdraw cash' : 'Add money'
  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!data.phone) { setMessage('Add your payment phone in profile settings before continuing.'); return }
    if (!isPreview) { setMessage('Transfers are disabled until a payment provider is connected. Your live balance cannot be changed from this app.'); return }
    update({ draft: { kind, recipient, amount: Number(amount), account: '' } })
    navigate('/wallet/review')
  }
  return <><ScreenTitle eyebrow="WALLET" title={title} description={isSend ? 'Send to an Akiba wallet or mobile money number.' : isWithdraw ? 'Move funds from your wallet to mobile money.' : 'Top up your Akiba wallet securely.'} back /><div className="two-column"><Card className="form-card"><form onSubmit={onSubmit}>{isSend || isWithdraw ? <Field id="recipient" label={isSend ? 'Recipient phone number' : 'Mobile money number'} type="tel" inputMode="tel" placeholder="+250 7XX XXX XXX" value={recipient} onChange={(event) => setRecipient(event.target.value)} required /> : <label className="field"><span>Choose a source</span><select value={recipient} onChange={(event) => setRecipient(event.target.value)} required><option value="">Select a payment method</option><option>MTN Mobile Money</option><option>Airtel Money</option><option>Bank transfer</option></select></label>}<Field id="wallet-amount" label="Amount (RWF)" type="number" min="500" placeholder="10,000" value={amount} onChange={(event) => setAmount(event.target.value)} required /><label className="field"><span>Note <small>Optional</small></span><input placeholder="What is this for?" /></label><div className="secure-note"><ShieldCheck size={16} /> {isPreview ? `Payment phone: ${data.phone || 'not set'}. Preview only; no real money moves.` : 'Live balance is read-only until a payment provider is connected.'}</div>{!data.phone && <p className="form-error">Add your phone number in <Link to="/profile/edit">profile settings</Link> before continuing.</p>}{message && <p className="form-error">{message}</p>}<PrimaryButton type="submit" disabled={!isPreview || !data.phone}>Review {isSend ? 'transfer' : 'payment'}</PrimaryButton></form></Card><aside className="info-panel"><span className="info-icon"><Wallet size={19} /></span><strong>Wallet balance</strong><b>{data.balance.toLocaleString('en-US')} RWF</b><small>Available to use</small><div className="info-divider" /><p>Transfers are protected by server-side payment processing when enabled.</p></aside></div></>
}

function WalletReviewScreen() {
  const { data, transact, isPreview } = useDemo()
  const navigate = useNavigate()
  const draft = data.draft
  if (!draft) return <EmptyState title="Nothing to review yet" action="Start a transfer" to="/wallet" />
  const confirm = () => {
    const delta = draft.kind === 'deposit' ? draft.amount : -draft.amount
    transact(draft.kind === 'send' ? `Sent to ${draft.recipient}` : draft.kind === 'withdraw' ? 'Mobile money withdrawal' : 'Wallet deposit', `${draft.kind} · Just now`, delta)
    navigate('/wallet/result')
  }
  return <><ScreenTitle eyebrow="CONFIRM DETAILS" title="Review your transfer" description="Check the details before you confirm." back /><Card className="review-card"><ReviewLine label="Transfer type" value={draft.kind === 'send' ? 'Send money' : draft.kind === 'withdraw' ? 'Withdraw cash' : 'Add money'} /><ReviewLine label={draft.kind === 'deposit' ? 'Source' : 'Recipient'} value={draft.recipient} /><ReviewLine label="Payment phone" value={data.phone || 'Not set'} /><ReviewLine label="Amount" value={`${draft.amount.toLocaleString('en-US')} RWF`} prominent /><ReviewLine label="Transfer fee" value="0 RWF" /><div className="review-total"><span>Total</span><strong>{draft.amount.toLocaleString('en-US')} RWF</strong></div>{!isPreview && <p className="provider-required">Live transfer processing is not enabled yet. No money will be moved.</p>}<PrimaryButton onClick={confirm} disabled={!isPreview || !data.phone}>Confirm & continue</PrimaryButton></Card></>
}

function WalletResultScreen() {
  const { data } = useDemo()
  const result = data.result
  if (!result || result.title.toLowerCase().includes('bill')) return <EmptyState title="No completed transfer" action="Back to wallet" to="/wallet" />
  return <SuccessPanel title="Transfer complete" description="Preview transfer only. No real money moved." amount={formatRwf(result.amount)} reference={result.id} to="/wallet" button="Back to wallet" />
}

function SavingsScreen() {
  const { data, isPreview } = useDemo()
  const saved = data.goals.reduce((total, goal) => total + goal.saved, 0)
  return <><ScreenTitle eyebrow="SAVE FOR WHAT MATTERS" title="Your savings" description="Build steady habits and make progress toward your goals." /><div className="savings-overview"><div><span>{isPreview ? 'Total preview savings' : 'Total saved'}</span><strong>{saved.toLocaleString('en-US')} RWF</strong><small>{isPreview ? 'Sample data · not a real balance' : 'Based on posted contributions'}</small></div><span className="overview-icon"><PiggyBank size={25} /></span></div><div className="page-actions"><PrimaryButton to="/savings/new"><Plus size={16} /> Create a goal</PrimaryButton><Link className="secondary-button" to="/savings/vault">Open savings vault <ArrowRight size={15} /></Link></div><SectionTitle action={<Link to="/goals" className="inline-link">View all goals <ArrowRight size={14} /></Link>}>My goals</SectionTitle>{data.goals.length ? <div className="goal-list">{data.goals.map((goal) => <Card key={goal.id}><GoalRow goal={goal} /><p className="goal-date">Target date: {goal.date}</p></Card>)}</div> : <Card className="empty-groups"><Target size={20} /><strong>No savings goals yet</strong><p>Create a goal and start planning your next step.</p></Card>}<Card className="group-callout"><span className="callout-icon"><Users size={20} /></span><div><strong>Save together</strong><p>Join a trusted group and make progress as a team.</p></div><Link to="/savings/groups" className="inline-link">Explore groups <ArrowRight size={14} /></Link></Card></>
}

function CreateGoalScreen() {
  const { data, update, isPreview } = useDemo()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [target, setTarget] = useState('')
  const [date, setDate] = useState('')
  const [cadence, setCadence] = useState('weekly')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (isPreview) {
        const goal: Goal = { id: `goal-${Date.now()}`, name, target: Number(target), saved: 0, date: date || 'Choose a date' }
        update({ goals: [goal, ...data.goals] })
      } else if (user) {
        const goal = await createSavingsGoal(user.id, { name, target: Number(target), date, cadence })
        update({ goals: [goal, ...data.goals] })
      }
      navigate('/savings')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save this goal.')
    } finally {
      setBusy(false)
    }
  }
  return <><ScreenTitle eyebrow="SAVINGS GOAL" title="Create a goal" description="Give your next big thing a name and a plan." back /><Card className="form-card goal-form"><form onSubmit={(event) => void submit(event)}><Field id="goal-name" label="Goal name" placeholder="e.g. New laptop" value={name} onChange={(event) => setName(event.target.value)} required /><Field id="goal-target" label="Target amount (RWF)" type="number" min="1000" placeholder="500,000" value={target} onChange={(event) => setTarget(event.target.value)} required /><Field id="goal-date" label="Target date" type="date" value={date} onChange={(event) => setDate(event.target.value)} required /><label className="field"><span>How often would you like to save?</span><select value={cadence} onChange={(event) => setCadence(event.target.value)}><option value="weekly">Every week</option><option value="fortnightly">Every two weeks</option><option value="monthly">Every month</option></select></label><div className="plan-hint"><Sparkles size={16} /><span>Save around <strong>{target ? Math.ceil(Number(target) / 12).toLocaleString('en-US') : '41,700'} RWF</strong> each month to reach your goal.</span></div>{error && <p className="form-error">{error}</p>}<PrimaryButton type="submit" disabled={busy}>{busy ? 'Saving goal…' : 'Create my goal'}</PrimaryButton></form></Card></>
}

function VaultScreen() {
  const { data, update, transact, isPreview } = useDemo()
  const [goalId, setGoalId] = useState(data.goals[0]?.id || '')
  const [amount, setAmount] = useState('')
  const [message, setMessage] = useState('')
  const total = data.goals.reduce((value, goal) => value + goal.saved, 0)
  const contribute = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!isPreview) { setMessage('Contributions will be enabled when a server-side payment provider is connected.'); return }
    const goal = data.goals.find((item) => item.id === goalId)
    const value = Number(amount)
    if (!goal || value <= 0 || value > data.balance || value > goal.target - goal.saved) {
      setMessage('Check the amount against your balance and the remaining goal target.')
      return
    }
    update({ goals: data.goals.map((item) => item.id === goalId ? { ...item, saved: item.saved + value } : item) })
    transact('Savings contribution', `Savings goal · ${goal.name}`, -value)
    setAmount('')
    setMessage(`${value.toLocaleString('en-US')} RWF added to ${goal.name}.`)
  }
  return <><ScreenTitle eyebrow="AKIBA SAVINGS VAULT" title="Your savings vault" description="Your saved money, protected and growing." back /><section className="vault-card"><span><LockKeyhole size={17} /> SECURE SAVINGS</span><strong>{total.toLocaleString('en-US')} RWF</strong><small>Across {data.goals.length} active goals</small><div className="vault-card-mark"><ShieldCheck size={78} /></div></section><div className="stat-grid"><Stat label="Interest earned" value={isPreview ? '2,450 RWF' : '—'} note={isPreview ? 'This month · sample' : 'Awaiting account data'} icon={TrendingUp} /><Stat label="Auto-save" value={isPreview ? 'Active' : 'Not set'} note={isPreview ? 'Every Friday · sample' : 'Configure after setup'} icon={Clock3} /><Stat label="Next deposit" value={isPreview ? '27 Sep' : '—'} note={isPreview ? 'Sample schedule' : 'No deposit scheduled'} icon={CalendarDays} /></div><Card className="form-card vault-deposit"><SectionTitle>Add to a goal</SectionTitle>{data.goals.length === 0 ? <><p className="empty-note">Create a savings goal before making a contribution.</p><PrimaryButton to="/savings/new">Create a goal</PrimaryButton></> : <form onSubmit={contribute}><label className="field"><span>Choose a goal</span><select value={goalId || data.goals[0].id} onChange={(event) => setGoalId(event.target.value)}>{data.goals.map((goal) => <option value={goal.id} key={goal.id}>{goal.name}</option>)}</select></label><Field id="vault-amount" label="Contribution (RWF)" type="number" min="500" placeholder="10,000" value={amount} onChange={(event) => { setAmount(event.target.value); setMessage('') }} required />{message && <p className={`form-message${message.startsWith('Check') || message.startsWith('Contributions') ? ' form-error' : ''}`}>{message}</p>}{!isPreview && <p className="provider-required">Live contributions are disabled until a payment provider is connected.</p>}<PrimaryButton type="submit" disabled={!isPreview}>Add money</PrimaryButton></form>}</Card><SectionTitle>Vault activity</SectionTitle><Card><TransactionRows items={data.transactions.filter((item) => item.detail.toLowerCase().includes('saving') || item.title.toLowerCase().includes('goal'))} /></Card><Link className="secondary-button vault-manage" to="/savings">Manage savings goals <ArrowRight size={15} /></Link></>
}

function Stat({ label, value, note, icon: Icon }: { label: string; value: string; note: string; icon: LucideIcon }) {
  return <Card className="stat-card"><span className="stat-icon"><Icon size={17} /></span><small>{label}</small><strong>{value}</strong><span>{note}</span></Card>
}

function GoalsScreen() {
  const { data } = useDemo()
  return <><ScreenTitle eyebrow="PERSONAL GOALS" title="Every goal starts somewhere" description="Keep your plans close and your progress visible." /><PrimaryButton to="/savings/new"><Plus size={16} /> Create a goal</PrimaryButton><div className="goal-list goals-page">{data.goals.map((goal) => <Card key={goal.id}><GoalRow goal={goal} /><p className="goal-date">Target date: {goal.date}</p></Card>)}</div></>
}

function GroupsScreen() {
  const { data, isPreview } = useDemo()
  return <><ScreenTitle eyebrow="COMMUNITY SAVINGS" title="Save better, together" description="Join a trusted group and reach your shared goals." />{isPreview && <Card className="group-feature"><span className="group-art"><Users size={32} /></span><p className="eyebrow">SAMPLE GROUP</p><h2>Umuryango Savings Circle</h2><p>Sample group for a year-end family celebration.</p><div className="group-numbers"><span><small>Group balance</small><strong>620,000 RWF</strong></span><span><small>Members</small><strong>8 people</strong></span></div><div className="progress-bar"><i style={{ width: '62%' }} /></div><small>62% of the group goal</small><PrimaryButton to="/savings/groups/current">View sample group</PrimaryButton></Card>}{data.groups.length > 0 && <><SectionTitle>{isPreview ? 'Your groups' : 'Your savings groups'}</SectionTitle><div className="discovery-list">{data.groups.map((group) => <DiscoveryGroup key={group.id} title={group.name} detail={`${group.purpose} · ${isPreview ? 'Preview group' : 'Created by you'}`} saved={`${group.target.toLocaleString('en-US')} RWF goal`} />)}</div></>}{isPreview && <><SectionTitle>Discover groups · sample data</SectionTitle><div className="discovery-list"><DiscoveryGroup title="Kigali Builders" detail="Home projects · 12 sample members" saved="1.8M RWF" /><DiscoveryGroup title="Mothers in Business" detail="Business growth · 9 sample members" saved="940K RWF" /><DiscoveryGroup title="Weekend Getaway" detail="Travel fund · 6 sample members" saved="380K RWF" /></div></>}{!isPreview && data.groups.length === 0 && <Card className="empty-groups"><span className="group-art"><Users size={25} /></span><strong>No savings groups yet</strong><p>Create a private group and invite people you trust.</p></Card>}<PrimaryButton to="/savings/groups/create"><Plus size={16} /> Create a savings group</PrimaryButton></>
}

function GroupDetailScreen() {
  const { data, isPreview } = useDemo()
  const [inviteReady, setInviteReady] = useState(false)
  const shareInvite = () => {
    void navigator.clipboard?.writeText(`${window.location.origin}/savings/groups/current`)
    setInviteReady(true)
  }
  const group = data.groups[0]
  if (!isPreview && !group) return <><ScreenTitle eyebrow="SAVINGS GROUP" title="No group selected" description="Create a group first, then manage members and invites." back /><PrimaryButton to="/savings/groups/create">Create a group</PrimaryButton></>
  const name = group?.name || 'Umuryango Savings Circle'
  const target = group?.target || 1000000
  const saved = isPreview ? 620000 : 0
  const progress = Math.min(100, Math.round((saved / target) * 100))
  return <><ScreenTitle eyebrow="SAVINGS GROUP" title={name} description={group?.purpose || 'A sample group for a family celebration.'} back /><Card className="group-feature"><span className="group-art"><Users size={32} /></span><div className="group-numbers"><span><small>Group balance</small><strong>{isPreview ? `${saved.toLocaleString('en-US')} RWF` : '—'}</strong></span><span><small>Group target</small><strong>{target.toLocaleString('en-US')} RWF</strong></span></div><div className="progress-bar"><i style={{ width: `${progress}%` }} /></div><small>{isPreview ? `${progress}% of the sample goal` : 'Contributions appear after a payment provider is connected.'}</small>{isPreview ? <PrimaryButton onClick={shareInvite}><Users size={16} /> {inviteReady ? 'Invite link copied' : 'Copy preview invite'}</PrimaryButton> : <p className="provider-required">Member invitations will be enabled after secure invite links are configured.</p>}</Card><SectionTitle>Group members</SectionTitle>{isPreview ? <div className="member-list">{[['JC', 'Jean Claude', 'You · Organizer'], ['AM', 'Alice Mukamana', 'Sample member'], ['PK', 'Patrick Kayitesi', 'Sample member'], ['EN', 'Esther Niyonsaba', 'Sample member']].map(([initials, memberName, role]) => <Card className="member-row" key={memberName}><span className="user-avatar">{initials}</span><span><strong>{memberName}</strong><small>{role}</small></span><Check size={15} /></Card>)}</div> : <Card className="empty-groups"><Users size={19} /><p>Members will appear here after they join.</p></Card>}<Card className="group-tip"><ShieldCheck size={17} /><span><strong>Everyone saves securely</strong><small>{isPreview ? 'Sample group data only; no contributions move.' : 'Contributions are not enabled until payment processing is connected.'}</small></span></Card></>
}

function DiscoveryGroup({ title, detail, saved }: { title: string; detail: string; saved: string }) {
  const [joined, setJoined] = useState(false)
  return <Card className="discovery-row"><span className="discovery-avatar"><Users size={18} /></span><span><strong>{title}</strong><small>{detail}</small></span><span className="discovery-balance">{saved}<small>saved</small></span><button disabled={joined} onClick={() => setJoined(true)}>{joined ? 'Requested' : 'Join'}</button></Card>
}

function CreateGroupScreen() {
  const { data, update, isPreview } = useDemo()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [purpose, setPurpose] = useState('')
  const [target, setTarget] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      if (isPreview) update({ groups: [{ id: `group-${Date.now()}`, name, purpose, target: Number(target) }, ...data.groups] })
      else if (user) update({ groups: [await createSavingsGroup(user.id, { name, purpose, target: Number(target) }), ...data.groups] })
      navigate('/savings/groups')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to create this group.')
    } finally {
      setBusy(false)
    }
  }
  return <><ScreenTitle eyebrow="COMMUNITY SAVINGS" title="Create a group" description="Set a shared goal and invite people you trust." back /><Card className="form-card"><form onSubmit={(event) => void submit(event)}><Field id="group-name" label="Group name" placeholder="e.g. December together" value={name} onChange={(event) => setName(event.target.value)} required /><Field id="group-purpose" label="What are you saving for?" placeholder="A family celebration" value={purpose} onChange={(event) => setPurpose(event.target.value)} required /><Field id="group-target" label="Shared goal (RWF)" type="number" min="10000" placeholder="1,000,000" value={target} onChange={(event) => setTarget(event.target.value)} required /><label className="field"><span>Who can join?</span><select><option>Invite only</option><option>Anyone with the invite link</option></select></label><div className="secure-note"><Users size={15} /> You can invite members after creating your group.</div>{error && <p className="form-error">{error}</p>}<PrimaryButton type="submit" disabled={busy}>{busy ? 'Creating group…' : 'Create group'}</PrimaryButton></form></Card></>
}

function BillsScreen() {
  const { data } = useDemo()
  const billTransactions = data.transactions.filter((item) => item.detail.toLowerCase().includes('bill payment'))
  return <><ScreenTitle eyebrow="EVERYDAY PAYMENTS" title="Bills & top-ups" description="Choose a service to make a quick payment." />{!data.phone && <p className="provider-required">Add your phone number before paying bills. <Link to="/profile/edit">Set payment phone</Link></p>}<div className="bill-search"><Search size={17} /><input placeholder="Search services" aria-label="Search services" onChange={(event) => document.querySelectorAll<HTMLElement>('.service-card').forEach((card) => { card.hidden = !card.textContent?.toLowerCase().includes(event.target.value.toLowerCase()) })} /></div><div className="service-grid">{services.map(({ code, name, detail, icon: Icon, accent }) => <Link key={code} to={`/bills/${encodeURIComponent(code)}`} className="service-card"><span className={`service-icon ${accent}`}><Icon size={21} /></span><span><strong>{name}</strong><small>{detail}</small></span><ChevronRight size={16} /></Link>)}</div><Card className="saved-biller-card"><SectionTitle>Saved billers</SectionTitle><BillMini name="REG Electricity" due="Meter ···· 2841" amount={12000} icon={Zap} /><BillMini name="WASAC Water" due="Account ···· 0962" amount={8500} icon={Droplets} /></Card><Card><SectionTitle action={<Link className="inline-link" to="/transactions">View activity <ArrowRight size={14} /></Link>}>Recent bill payments</SectionTitle>{billTransactions.length ? <TransactionRows items={billTransactions} /> : <p className="empty-note">Your bill payment history will appear here.</p>}</Card></>
}

function BillDetailsScreen() {
  const { data, update, isPreview } = useDemo()
  const { provider = 'REG' } = useParams()
  const navigate = useNavigate()
  const [account, setAccount] = useState('')
  const [amount, setAmount] = useState('')
  const [error, setError] = useState('')
  const service = services.find((item) => item.code.toLowerCase() === decodeURIComponent(provider).toLowerCase()) || services[0]
  const Icon = service.icon
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!data.phone) { setError('Add your payment phone in profile settings before continuing.'); return }
    update({ draft: { kind: 'bill', recipient: service.name, account, amount: Number(amount) } })
    navigate('/bills/review')
  }
  return <><ScreenTitle eyebrow="BILL PAYMENT" title={service.name} description={service.detail} back /><Card className="provider-card"><span className={`service-icon ${service.accent}`}><Icon size={23} /></span><div><strong>{service.name}</strong><small>{isPreview ? 'Preview only' : 'Provider checkout is not connected'}</small></div><span className="secure-tag"><ShieldCheck size={14} /> Akiba</span></Card><Card className="form-card"><form onSubmit={submit}><Field id="bill-account" label={service.name === 'Airtime & data' ? 'Recipient phone number' : 'Account or meter number'} type={service.name === 'Airtime & data' ? 'tel' : 'text'} placeholder={service.name === 'Airtime & data' ? '+250 7XX XXX XXX' : 'Enter your account number'} value={account} onChange={(event) => setAccount(event.target.value)} required /><Field id="bill-amount" label="Amount (RWF)" type="number" min="500" placeholder="Enter amount" value={amount} onChange={(event) => setAmount(event.target.value)} required /><div className="amount-shortcuts">{['5,000', '10,000', '20,000'].map((item) => <button type="button" key={item} onClick={() => setAmount(item.replace(',', ''))}>{item}</button>)}</div><div className="secure-note"><LockKeyhole size={15} /> {isPreview ? `Payment phone: ${data.phone || 'not set'}. Preview only; no bill will be sent.` : 'Live payments remain disabled until a provider is connected.'}</div>{!data.phone && <p className="form-error">Add a phone number in <Link to="/profile/edit">profile settings</Link> before continuing.</p>}{error && <p className="form-error">{error}</p>}<PrimaryButton type="submit" disabled={!isPreview || !data.phone}>Continue to review</PrimaryButton></form></Card></>
}

function BillReviewScreen() {
  const { data, transact, isPreview } = useDemo()
  const navigate = useNavigate()
  const draft = data.draft
  if (!draft || draft.kind !== 'bill') return <EmptyState title="No bill to review" action="Choose a service" to="/bills" />
  const pay = () => { transact(`${draft.recipient} bill`, `Bill payment · ${draft.account}`, -draft.amount); navigate('/bills/result') }
  const providerCode = services.find((service) => service.name === draft.recipient)?.code || 'REG'
  return <><ScreenTitle eyebrow="PAYMENT REVIEW" title="Check your payment" description="Make sure these details are correct." back /><Card className="review-card"><div className="review-provider"><span className="service-icon blue"><Zap size={19} /></span><span><strong>{draft.recipient}</strong><small>Utility bill</small></span></div><ReviewLine label="Account number" value={draft.account} /><ReviewLine label="Payment phone" value={data.phone || 'Not set'} /><ReviewLine label="Payment method" value="Akiba wallet" /><ReviewLine label="Amount" value={`${draft.amount.toLocaleString('en-US')} RWF`} prominent /><ReviewLine label="Service fee" value="0 RWF" /><div className="review-total"><span>Total to pay</span><strong>{draft.amount.toLocaleString('en-US')} RWF</strong></div><p className="secure-note"><ShieldCheck size={15} /> {isPreview ? 'Preview only. No provider will be contacted.' : 'Payment processing is not connected; no money will be moved.'}</p><PrimaryButton onClick={pay} disabled={!isPreview || !data.phone}>Pay now</PrimaryButton><Link to={`/bills/${encodeURIComponent(providerCode)}`} className="edit-details">Edit details</Link></Card></>
}

function ReviewLine({ label, value, prominent = false }: { label: string; value: string; prominent?: boolean }) {
  return <div className={`review-line${prominent ? ' review-prominent' : ''}`}><span>{label}</span><strong>{value}</strong></div>
}

function BillResultScreen() {
  const { data } = useDemo()
  if (!data.result || !data.result.title.toLowerCase().includes('bill')) return <EmptyState title="No completed bill payment" action="Browse services" to="/bills" />
  return <SuccessPanel title="Payment preview complete" description="This local preview did not contact a provider or move real money." amount={formatRwf(data.result.amount)} reference={data.result.id} to="/transactions" button="View activity" />
}

function SuccessPanel({ title, description, amount, reference, to, button }: { title: string; description: string; amount: string; reference: string; to: string; button: string }) {
  return <div className="success-page"><span className="success-mark"><Check size={32} /></span><p className="eyebrow">ALL DONE</p><h1>{title}</h1><p>{description}</p><strong className="success-amount">{amount}</strong><Card className="receipt-card"><ReviewLine label="Reference" value={reference} /><ReviewLine label="Date" value="28 Sep 2026 · Just now" /><ReviewLine label="Status" value="Successful" /></Card><PrimaryButton to={to}>{button}</PrimaryButton><Link to="/" className="text-link centered-link">Back to home</Link></div>
}

function CreditScreen() {
  const { isPreview } = useDemo()
  return <><ScreenTitle eyebrow="CREDIT THAT MOVES WITH YOU" title="Borrow with confidence" description="Fair terms, clear repayments, and no surprises." /><Card className="credit-offer"><span className="credit-offer-icon"><HandCoins size={23} /></span><p className="eyebrow">{isPreview ? 'SAMPLE CREDIT ESTIMATE' : 'CREDIT APPLICATIONS'}</p><strong>{isPreview ? 'Up to 500,000 RWF' : 'Request a review'}</strong><p>{isPreview ? 'Preview an example plan. It is not a real offer or approval.' : 'You can submit a request for review. Offers and disbursements require a connected lending provider.'}</p><PrimaryButton to="/credit/apply">{isPreview ? 'View sample plan' : 'Submit a request'}</PrimaryButton><small>No credit is issued by this prototype.</small></Card><div className="credit-tools"><Link to="/credit/score"><span className="tool-icon"><ShieldCheck size={19} /></span><span><strong>Your Akiba Score</strong><small>Know what shapes your score</small></span><ChevronRight size={16} /></Link><Link to="/credit/schedule"><span className="tool-icon"><CalendarDays size={19} /></span><span><strong>Repayment schedule</strong><small>Track upcoming payments</small></span><ChevronRight size={16} /></Link><Link to="/savings/groups"><span className="tool-icon"><Users size={19} /></span><span><strong>Community savings</strong><small>Build goals as a group</small></span><ChevronRight size={16} /></Link></div></>
}

function LoanApplicationScreen() {
  const { update } = useDemo()
  const navigate = useNavigate()
  const [amount, setAmount] = useState(200000)
  const [term, setTerm] = useState(6)
  const submit = (event: FormEvent<HTMLFormElement>) => { event.preventDefault(); update({ draft: { kind: 'loan', recipient: 'Personal loan', amount, account: `${term} months` } }); navigate('/credit/schedule') }
  return <><ScreenTitle eyebrow="LOAN APPLICATION" title="Choose your loan plan" description="Adjust the amount and term to fit your budget." back /><Card className="form-card loan-form"><form onSubmit={submit}><label className="range-label"><span>Loan amount</span><strong>{amount.toLocaleString('en-US')} RWF</strong></label><input className="range-slider" type="range" min="50000" max="500000" step="10000" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /><div className="range-ends"><span>50,000</span><span>500,000 RWF</span></div><label className="field"><span>Repayment period</span><select value={term} onChange={(event) => setTerm(Number(event.target.value))}><option value={3}>3 months</option><option value={6}>6 months</option><option value={9}>9 months</option><option value={12}>12 months</option></select></label><div className="loan-estimate"><span>Estimated monthly repayment</span><strong>{Math.ceil((amount * (1 + 0.02 * term)) / term).toLocaleString('en-US')} RWF</strong><small>Includes interest at 2% per month</small></div><div className="secure-note"><ShieldCheck size={15} /> No commitment until you accept the full schedule.</div><PrimaryButton type="submit">Review repayment plan</PrimaryButton></form></Card></>
}

function RepaymentScreen() {
  const { data, transact, isPreview, update } = useDemo()
  const { user } = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const draft = data.draft
  const amount = draft?.amount || 200000
  const months = Number(draft?.account.split(' ')[0] || 6)
  const monthly = Math.ceil((amount * (1 + 0.02 * months)) / months)
  const confirm = async () => {
    setBusy(true)
    setError('')
    try {
      if (isPreview) {
        transact('Loan application preview', `${amount.toLocaleString('en-US')} RWF · ${months} months`, 0)
        update({ draft: { kind: 'loan', recipient: 'PREVIEW-LOAN', amount, account: `${months} months` } })
      } else if (user) {
        const application = await submitLoanApplication(user.id, amount, months)
        update({ draft: { kind: 'loan', recipient: application.id, amount, account: `${months} months` } })
      }
      navigate('/credit/success')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit the application.')
    } finally {
      setBusy(false)
    }
  }
  return <><ScreenTitle eyebrow="REPAYMENT SCHEDULE" title="Your plan, clearly laid out" description="Review every payment before you apply." back /><Card className="schedule-summary"><span>Loan amount</span><strong>{amount.toLocaleString('en-US')} RWF</strong><div><span>Term</span><b>{months} months</b><span>Monthly payment</span><b>{monthly.toLocaleString('en-US')} RWF</b><span>Total repayment</span><b>{(monthly * months).toLocaleString('en-US')} RWF</b></div></Card><SectionTitle>Payment schedule</SectionTitle><div className="schedule-list">{Array.from({ length: Math.min(months, 6) }, (_, index) => <Card className="schedule-row" key={index}><span className="schedule-date"><small>PAYMENT {String(index + 1).padStart(2, '0')}</small><strong>{new Date(2026, 9 + index, 5).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</strong></span><span><strong>{monthly.toLocaleString('en-US')} RWF</strong><small>Principal + interest estimate</small></span><Clock3 size={16} /></Card>)}</div>{months > 6 && <p className="remaining-note">Plus {months - 6} more monthly payments of {monthly.toLocaleString('en-US')} RWF</p>}{!isPreview && <p className="provider-required">This is an estimate, not a credit offer. Approval and disbursement require a connected lending provider.</p>}{error && <p className="form-error">{error}</p>}<div className="schedule-actions"><button className="secondary-button" onClick={() => window.print()}><Download size={15} /> Save schedule</button><PrimaryButton onClick={() => void confirm()} disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</PrimaryButton></div></>
}

function LoanSuccessScreen() {
  const { data, isPreview } = useDemo()
  if (data.draft?.kind !== 'loan') return <EmptyState title="No loan application found" action="Review a plan" to="/credit/apply" />
  return <SuccessPanel title="Application received" description={isPreview ? 'Preview only. No lender was contacted and no credit decision was made.' : 'Your request was saved for review. No funds are approved or disbursed by this prototype.'} amount="Pending review" reference={data.draft.recipient} to="/credit" button="Back to credit" />
}

function AkibaScoreScreen() {
  const { data, isPreview } = useDemo()
  if (!isPreview) return <><ScreenTitle eyebrow="YOUR FINANCIAL PROFILE" title="Your Akiba Score" description="Your score will appear after enough account activity." back /><Card className="score-tip"><ShieldCheck size={18} /><span><strong>Score not available yet</strong><small>We’ll calculate your score from verified account activity after scoring is enabled.</small></span></Card></>
  return <><ScreenTitle eyebrow="PREVIEW SCORE · SAMPLE DATA" title="Your Akiba Score" description="This illustrative score is not a credit decision." back /><Card className="score-card"><div className="score-gauge"><div><strong>720</strong><small>PREVIEW</small></div></div><p>Sample insight for {data.name.split(' ')[0]}. This is not a real financial score.</p><div className="score-change"><TrendingUp size={15} /> Sample score trend</div></Card><SectionTitle>Sample score factors</SectionTitle><div className="score-factors"><ScoreFactor icon={Wallet} title="Wallet activity" status="Sample" value={92} /><ScoreFactor icon={Clock3} title="Bill payments" status="Sample" value={88} /><ScoreFactor icon={PiggyBank} title="Savings consistency" status="Sample" value={74} /></div><Card className="score-tip"><Sparkles size={18} /><span><strong>Preview insights only</strong><small>A real score requires a validated scoring model and account data.</small></span></Card></>
}

function ScoreFactor({ icon: Icon, title, status, value }: { icon: LucideIcon; title: string; status: string; value: number }) {
  return <Card className="score-factor"><span className="tool-icon"><Icon size={18} /></span><span><strong>{title}</strong><small>{status}</small><i className="progress-bar"><b style={{ width: `${value}%` }} /></i></span><b>{value}</b></Card>
}

function TransactionsScreen() {
  const { data, t } = useDemo()
  const [filter, setFilter] = useState('All activity')
  const filtered = data.transactions.filter((item) => filter === 'All activity' || (filter === 'Payments' ? item.amount < 0 : item.amount > 0))
  return <><ScreenTitle eyebrow="WALLET HISTORY" title="Transactions" description="A clear view of money moving in and out." /><div className="transaction-filter">{['All activity', 'Payments', 'Deposits'].map((item) => <button className={filter === item ? 'active' : ''} key={item} onClick={() => setFilter(item)}>{t(item)}</button>)}<button onClick={() => window.print()}><Download size={14} /> {t('Export')}</button></div><Card><div className="transaction-list-heading"><span>TRANSACTION</span><span>AMOUNT</span></div>{filtered.length ? <TransactionRows items={filtered} /> : <p className="empty-note">No {filter.toLowerCase()} yet.</p>}</Card><ActivitySummary items={data.transactions} /></>
}

function NotificationsScreen() {
  const { isPreview } = useDemo()
  const [read, setRead] = useState(false)
  return <><ScreenTitle eyebrow="YOUR UPDATES" title="Notifications" description="Important activity and reminders, all in one place." />{isPreview ? <><div className="notification-heading"><span>Recent · sample</span><button onClick={() => setRead(true)}>{read ? 'All caught up' : 'Mark all as read'}</button></div><div className="notification-list"><Notice icon={Check} title="Bill payment successful" description="Your REG electricity payment was completed." time="Today · 9:42 AM" tone="mint" read={read} /><Notice icon={PiggyBank} title="Savings goal update" description="You’re 35% of the way to your emergency fund." time="Yesterday · 6:00 PM" tone="blue" read={read} /><Notice icon={ShieldCheck} title="Verify your account" description="Complete your profile to unlock more Akiba features." time="24 Sep · 11:10 AM" tone="amber" read={read} /></div></> : <Card className="empty-groups"><Bell size={20} /><strong>You’re all caught up</strong><p>Account alerts will appear here when notifications are enabled.</p></Card>}</>
}

function Notice({ icon: Icon, title, description, time, tone, read }: { icon: LucideIcon; title: string; description: string; time: string; tone: string; read: boolean }) {
  return <Card className={`notice-card${read ? ' notice-read' : ''}`}><span className={`notice-icon ${tone}`}><Icon size={18} /></span><span><strong>{title}</strong><small>{description}</small><i>{time}</i></span>{!read && <b />}</Card>
}

function ProfileScreen() {
  const { data, update, t } = useDemo()
  const { isPreview, signOut, user } = useAuth()
  const languageOptions = ['English', 'Kinyarwanda', 'Français', 'Kiswahili']
  const nextLanguage = languageOptions[(languageOptions.indexOf(data.language) + 1) % languageOptions.length]
  const themeLabel = data.theme === 'dark' ? t('Dark mode') : t('Light mode')
  return <>
    <ScreenTitle eyebrow="YOUR AKIBA ACCOUNT" title={t('Profile & settings')} description={t('Keep your account details and preferences up to date.')} />
    <Card className="profile-summary"><span className="large-avatar">{data.name.split(' ').map((part) => part[0]).join('')}</span><span><strong>{data.name}</strong><small>{data.phone || t('Add a phone number to enable payments')}</small><i><ShieldCheck size={13} /> {isPreview ? t('Local preview profile') : data.phone ? t('Payment phone saved') : t('Payment phone needed')}</i></span><Link to="/profile/edit" aria-label={t('Edit your profile')}><Settings size={18} /></Link></Card>
    <div className="settings-list">
      <SettingsRow icon={Globe2} title={t('Language')} detail={data.language} onClick={() => update({ language: nextLanguage })} />
      <SettingsRow icon={data.theme === 'dark' ? MoonStar : SunMedium} title={t('Theme')} detail={themeLabel} onClick={() => update({ theme: data.theme === 'dark' ? 'light' : 'dark' })} />
      <SettingsRow icon={Fingerprint} title={t('PIN & biometrics')} detail={t('Device security is managed by your phone')} to="/help" />
      <SettingsRow icon={Bell} title={t('Notifications')} detail={t('Push, SMS and email alerts')} to="/notifications" />
      <SettingsRow icon={CircleHelp} title={t('Help & support')} detail={t('We’re here to help')} to="/help" />
      <SettingsRow icon={Wifi} title={t('Offline access')} detail={t('Use Akiba with limited connectivity')} to="/offline" />
      <SettingsRow icon={QrCode} title={t('USSD access')} detail={t('Use Akiba on any phone')} to="/ussd" />
    </div>
    <Card className="profile-readiness"><SectionTitle>Account readiness</SectionTitle><div className="readiness-row"><span className="readiness-icon"><Smartphone size={16} /></span><span><strong>Payment phone</strong><small>{data.phone || 'Not added yet'}</small></span><Link to="/profile/edit">{data.phone ? 'Edit' : 'Add'}</Link></div><div className="readiness-row"><span className="readiness-icon"><ShieldCheck size={16} /></span><span><strong>Sign-in status</strong><small>{isPreview ? 'Local preview' : user ? 'Connected account' : 'Not signed in'}</small></span></div></Card>
    <button className="signout-button" onClick={() => void signOut()}><LogOut size={16} /> {t('Sign out')}</button>
  </>
}

function ProfileEditScreen() {
  const { data, update, isPreview } = useDemo()
  const { updateAccountProfile } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(data.name)
  const [email, setEmail] = useState(data.email || '')
  const [phone, setPhone] = useState(data.phone)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const paymentPhone = normalizePaymentPhone(phone)
    if (!/^\+[1-9]\d{7,14}$/.test(paymentPhone)) { setError('Enter a valid phone number with its country code.'); return }
    setBusy(true)
    setError('')
    try {
      await updateAccountProfile(name.trim(), email.trim() || undefined, paymentPhone)
      update({ name: name.trim(), email: email.trim() || data.email, phone: paymentPhone })
      navigate('/profile')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your profile.')
    } finally {
      setBusy(false)
    }
  }
  return <><ScreenTitle eyebrow="YOUR AKIBA ACCOUNT" title="Edit your profile" description="Update the details connected to your wallet." back /><Card className="form-card"><form onSubmit={(event) => void submit(event)}><Field id="profile-name" label="Full name" value={name} onChange={(event) => setName(event.target.value)} required /><Field id="profile-email" label="Email address" type="email" placeholder={isPreview ? 'preview@example.com' : 'Optional'} value={email} onChange={(event) => setEmail(event.target.value)} /><Field id="profile-phone" label="Phone number for payments" type="tel" inputMode="tel" autoComplete="tel" placeholder="+250 78 123 4567" value={phone} onChange={(event) => setPhone(event.target.value)} required /><div className="secure-note"><ShieldCheck size={15} /> Used for bill and mobile money payments. This does not change how you sign in.</div>{error && <p className="form-error">{error}</p>}<PrimaryButton type="submit" disabled={busy}>{busy ? 'Saving changes…' : 'Save changes'}</PrimaryButton></form></Card></>
}

function normalizePaymentPhone(value: string) {
  const trimmed = value.trim()
  const digits = trimmed.replace(/\D/g, '')
  if (trimmed.startsWith('+')) return `+${digits}`
  if (digits.startsWith('250')) return `+${digits}`
  if (digits.startsWith('0')) return `+250${digits.slice(1)}`
  if (digits.startsWith('7')) return `+250${digits}`
  return ''
}

function SettingsRow({ icon: Icon, title, detail, to, action, onClick }: { icon: LucideIcon; title: string; detail: string; to?: string; action?: ReactNode; onClick?: () => void }) {
  const content = <><span className="setting-icon"><Icon size={17} /></span><span><strong>{title}</strong><small>{detail}</small></span>{action || <ChevronRight size={16} />}</>
  if (to) return <Link className="settings-row" to={to}>{content}</Link>
  if (action) return <div className="settings-row">{content}</div>
  return <button className="settings-row" onClick={onClick}>{content}</button>
}

function HelpScreen() {
  const [query, setQuery] = useState('')
  const questions = ['How do I add money to my wallet?', 'How long does a bill payment take?', 'How do I reset my PIN?', 'Where can I see my transaction receipt?']
  return <><ScreenTitle eyebrow="AKIBA SUPPORT" title="How can we help?" description="Find a quick answer or get in touch with our team." /><div className="help-search"><Search size={17} /><input placeholder="Search help articles" value={query} onChange={(event) => setQuery(event.target.value)} /></div><SectionTitle>Popular questions</SectionTitle><div className="faq-list">{questions.filter((item) => item.toLowerCase().includes(query.toLowerCase())).map((question) => <details key={question}><summary>{question}<ChevronRight size={16} /></summary><p>You can manage this directly in AkibaOS. Open the relevant section from the Home screen and follow the on-screen steps. If you need more help, contact our support team.</p></details>)}</div><Card className="contact-support"><span><HelpCircle size={20} /></span><strong>Still need help?</strong><p>Our support team is available Monday to Saturday.</p><a href="mailto:support@akiba.rw">Email support@akiba.rw <ArrowRight size={14} /></a></Card></>
}

function OfflineScreen() {
  const { data, update, t } = useDemo()
  return <><ScreenTitle eyebrow={t('CONNECTIVITY')} title={t('Offline mode')} description={t('Your last known balance and saved details remain available here.')} back /><Card className="offline-card"><span className="offline-icon"><Wifi size={27} /></span><p className="eyebrow">{data.offline ? t('OFFLINE MODE ON') : t('YOU’RE ONLINE')}</p><h2>{data.offline ? t('Your account is available offline.') : t('Your account is synced.')}</h2><p>{t('Balance and recent activity are saved securely on this device. Payments need an internet connection to complete.')}</p><div className="offline-balance"><span>{t('Last synced balance')}</span><strong>{data.balance.toLocaleString('en-US')} RWF</strong><small>{t('Synced just now')}</small></div><button className="primary-button" onClick={() => update({ offline: !data.offline })}>{data.offline ? t('Turn offline mode off') : t('Turn offline mode on')} <ArrowRight size={16} /></button></Card><p className="offline-footnote"><LockKeyhole size={14} /> {t('Your private information stays protected on this device.')}</p></>
}

function UssdScreen() {
  return <><ScreenTitle eyebrow="AKIBA ON ANY PHONE" title="USSD access" description="No smartphone or internet? You can still reach your wallet." back /><Card className="ussd-card"><span className="ussd-symbol"><Smartphone size={24} /></span><p className="eyebrow">DIAL THIS CODE</p><strong>*182*6*1#</strong><p>Use the phone number linked to your Akiba account. Standard network charges may apply.</p><div className="qr-grid" aria-label="Decorative QR code"><QrPattern /></div><small>Scan to open Akiba on another device</small><button className="secondary-button" onClick={() => navigator.clipboard?.writeText('*182*6*1#')}><Download size={15} /> Copy USSD code</button></Card><div className="ussd-steps"><span>1</span><p>Dial <strong>*182*6*1#</strong> from your phone.</p><span>2</span><p>Enter your Akiba PIN to sign in.</p><span>3</span><p>Choose a wallet service from the menu.</p></div></>
}

function QrPattern() {
  const cells = Array.from({ length: 225 }, (_, index) => {
    const row = Math.floor(index / 15)
    const column = index % 15
    const finder = (x: number, y: number) => row >= y && row < y + 5 && column >= x && column < x + 5 && (row === y || row === y + 4 || column === x || column === x + 4 || (row === y + 2 && column === x + 2))
    return <i key={index} className={finder(0, 0) || finder(10, 0) || finder(0, 10) || ((row * 7 + column * 3 + row * column) % 5 < 2) ? 'filled' : ''} />
  })
  return <div className="qr-pattern">{cells}</div>
}

function WelcomeScreen() {
  const { enterPreview } = useAuth()
  const { update, t } = useDemo()
  const navigate = useNavigate()
  return <div className="welcome-screen"><div className="hero-logo"><span className="brand-symbol large"><span /><span /></span><strong>AkibaOS</strong></div><p className="eyebrow">{t('FINANCIAL FREEDOM FOR EVERY RWANDAN')}</p><h1>{t('Welcome to a brighter way to bank.')}</h1><p>{t('Save with purpose, pay with ease, and take your next step with confidence.')}</p><PrimaryButton to="/onboarding/register">{t('Create an account')}</PrimaryButton><Link className="onboarding-secondary" to="/onboarding/login">{t('I already have an account')}</Link><button className="preview-entry" onClick={() => { update(readState()); enterPreview(); navigate('/') }}>{t('Explore local preview')} <ArrowRight size={14} /></button><div className="welcome-wave"><span><ShieldCheck size={13} /> {t('Secure email sign-in')}</span><span>{t('Made for Rwanda')}</span></div></div>
}

function FlowScreen({ step, title, description, children }: { step?: string; title: string; description: string; children: ReactNode }) {
  const { t } = useDemo()
  return <div className="flow-screen">{step && <span className="flow-step">{step}</span>}<h1>{t(title)}</h1><p>{t(description)}</p>{children}</div>
}

function LanguageScreen() {
  const { data, update, t } = useDemo()
  const navigate = useNavigate()
  const options = [{ name: 'Kinyarwanda', flag: '🇷🇼', note: 'Ikinyarwanda' }, { name: 'English', flag: '🇬🇧', note: 'English' }, { name: 'Français', flag: '🇫🇷', note: 'French' }, { name: 'Kiswahili', flag: '🇹🇿', note: 'Kiswahili' }]
  return <FlowScreen step="01 / 04" title={t('Choose your language')} description={t('Select your preferred language to continue.')}><div className="language-options">{options.map((option) => <button type="button" className={`language-option${data.language === option.name ? ' selected' : ''}`} key={option.name} onClick={() => update({ language: option.name })}><span>{option.flag}</span><strong>{option.name}</strong><small>{option.note}</small>{data.language === option.name && <Check size={17} />}</button>)}</div><PrimaryButton onClick={() => navigate('/onboarding/register')}>{t('Continue')}</PrimaryButton></FlowScreen>
}

function EmailPasswordScreen({ mode }: { mode: 'signup' | 'signin' }) {
  const { data, update } = useDemo()
  const { isConfigured, signUpWithPassword, signInWithPassword, signInWithGoogle, enterPreview } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState(data.email)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setNotice('')
    try {
      if (mode === 'signup') {
        const hasSession = await signUpWithPassword(email.trim(), password)
        update({ email: email.trim() })
        if (hasSession) navigate('/onboarding/profile')
        else setNotice('Check your email to confirm your account, then sign in.')
      } else {
        await signInWithPassword(email.trim(), password)
        update({ email: email.trim() })
        navigate('/')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to authenticate.')
    } finally {
      setBusy(false)
    }
  }
  const startGoogleSignIn = async () => {
    setBusy(true)
    setError('')
    try {
      await signInWithGoogle()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to continue with Google.')
      setBusy(false)
    }
  }
  return <FlowScreen title={mode === 'signup' ? 'Create your account' : 'Welcome back'} description={mode === 'signup' ? 'Use your email and password to get started.' : 'Sign in with your email and password.'}><form className="flow-form" onSubmit={(event) => void submit(event)}><Field id="auth-email" label="Email address" type="email" autoComplete="email" placeholder="you@example.com" value={email} onChange={(event) => setEmail(event.target.value)} required /><Field id="auth-password" label="Password" type="password" autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} placeholder="At least 8 characters" value={password} onChange={(event) => setPassword(event.target.value)} minLength={mode === 'signup' ? 8 : undefined} required />{error && <p className="form-error" role="alert">{error}</p>}{notice && <p className="auth-notice" role="status">{notice}</p>}<p className="field-caption"><LockKeyhole size={13} /> {isConfigured ? 'Your sign-in is secured by Supabase.' : 'Supabase is not configured. You can explore the local preview.'}</p><PrimaryButton type="submit" disabled={busy || !isConfigured}>{busy ? 'Please wait…' : mode === 'signup' ? 'Create account' : 'Sign in'}</PrimaryButton></form><div className="auth-divider"><span>or</span></div><button type="button" className="google-signin" onClick={() => void startGoogleSignIn()} disabled={busy || !isConfigured}><span className="google-mark" aria-hidden="true">G</span> Continue with Google</button>{!isConfigured && <button className="preview-entry auth-preview" onClick={() => { update(readState()); enterPreview(); navigate('/') }}>Explore local preview <ArrowRight size={14} /></button>}<p className="flow-footnote">{mode === 'signup' ? 'Already have an account?' : 'New to AkibaOS?'} <Link to={mode === 'signup' ? '/onboarding/login' : '/onboarding/register'}>{mode === 'signup' ? 'Sign in' : 'Create an account'}</Link></p></FlowScreen>
}

function ProfileSetupScreen() {
  const { data, update } = useDemo()
  const { updateAccountProfile, isPreview, user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState(isPreview ? data.name : String(user?.user_metadata.full_name ?? ''))
  const [phone, setPhone] = useState(data.phone)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const paymentPhone = normalizePaymentPhone(phone)
    if (!/^\+[1-9]\d{7,14}$/.test(paymentPhone)) { setError('Enter a valid phone number with its country code.'); return }
    setBusy(true)
    setError('')
    try {
      await updateAccountProfile(name.trim(), undefined, paymentPhone)
      update({ name: name.trim(), phone: paymentPhone, email: user?.email || data.email })
      navigate('/onboarding/complete')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to save your profile.')
    } finally {
      setBusy(false)
    }
  }
  return <FlowScreen step="02 / 02" title="Set up your profile" description="Add your name and a phone number for payments."><form className="flow-form" onSubmit={(event) => void submit(event)}><Field id="full-name" label="Full name" autoComplete="name" placeholder="As it appears on your ID" value={name} onChange={(event) => setName(event.target.value)} required /><Field id="payment-phone" label="Phone number for payments" type="tel" inputMode="tel" autoComplete="tel" placeholder="+250 78 123 4567" value={phone} onChange={(event) => setPhone(event.target.value)} required /><p className="field-caption"><ShieldCheck size={14} /> Used for bills and mobile money. Sign-in remains email/password or Google.</p>{error && <p className="form-error">{error}</p>}<PrimaryButton type="submit" disabled={busy}>{busy ? 'Saving profile…' : 'Continue'}</PrimaryButton></form></FlowScreen>
}

function AccountCreatedScreen() {
  const { data } = useDemo()
  return <div className="account-created"><span className="success-mark"><Check size={31} /></span><p className="eyebrow">ACCOUNT CREATED</p><h1>Welcome, {data.name}!</h1><p>Your email account is ready.</p><div className="created-details"><span><Check size={15} /> Email account created</span><span><Check size={15} /> Profile details saved</span><span><Clock3 size={15} /> Identity review available</span></div><PrimaryButton to="/onboarding/kyc">Verify your identity</PrimaryButton><Link className="onboarding-secondary" to="/">Go to home</Link></div>
}

function KycScreen() {
  const { data, update } = useDemo()
  const { isPreview, user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [documents, setDocuments] = useState<(File | null)[]>([null, null, null])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const documentTypes = ['identity', 'selfie', 'residence'] as const
  const documentNames = ['Identity document', 'Selfie verification', 'Proof of residence']
  const next = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const file = documents[step]
    if (!file) { setError('Choose a document to continue.'); return }
    setError('')
    if (isPreview) {
      if (step < 2) { setStep(step + 1); return }
      navigate('/')
      return
    }
    if (!user) { setError('Sign in again before submitting verification documents.'); return }
    setBusy(true)
    try {
      await uploadKycDocument(user.id, documentTypes[step], file)
      if (step < 2) {
        setStep(step + 1)
        setDocuments((current) => current.map((item, index) => index === step ? null : item))
        return
      }
      await submitKycForReview()
      update({ kycComplete: false, kycStatus: 'pending' })
      navigate('/')
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to submit your documents.')
    } finally {
      setBusy(false)
    }
  }
  const progress = data.kycComplete ? 100 : Math.round((step / 3) * 100)
  return <><ScreenTitle eyebrow="ACCOUNT VERIFICATION" title="Complete your KYC" description="Documents are private and submitted for review; verification is never self-approved." back /><div className="kyc-progress"><span>Profile completion</span><strong>{data.kycComplete ? 'Verified' : `Step ${step + 1} of 3`}</strong><i><b style={{ width: `${data.kycComplete ? 100 : Math.max(progress, 12)}%` }} /></i></div><div className="kyc-steps">{documentNames.map((name, index) => { const Icon = [Fingerprint, Users, Landmark][index]; return <Card className={`kyc-step${step === index ? ' current' : ''}`} key={name}><span className="kyc-step-number">{index < step ? <Check size={13} /> : `0${index + 1}`}</span><span className="kyc-step-icon"><Icon size={19} /></span><span><strong>{name}</strong><small>{index < step ? 'Uploaded securely' : index === step ? 'In progress' : 'Up next'}</small></span><ChevronRight size={17} /></Card> })}</div><Card className="form-card kyc-form"><form onSubmit={(event) => void next(event)}><label className="field"><span>{documentNames[step]}</span><input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(event) => { setDocuments((current) => current.map((item, index) => index === step ? event.target.files?.[0] ?? null : item)); setError('') }} required /><small>JPG, PNG, or PDF · Up to 10 MB</small></label><p className="secure-note"><LockKeyhole size={15} /> {isPreview ? 'Preview only. Files are not uploaded.' : 'Uploaded directly to your private account storage.'}</p>{error && <p className="form-error">{error}</p>}<PrimaryButton type="submit" disabled={busy}>{busy ? 'Uploading securely…' : step === 2 ? 'Submit for review' : 'Continue'}</PrimaryButton></form></Card><button className="skip-button" onClick={() => navigate('/')}>Do this later</button></>
}

function EmptyState({ title, action, to }: { title: string; action: string; to: string }) {
  return <div className="empty-state"><span><Wallet size={24} /></span><h1>{title}</h1><PrimaryButton to={to}>{action}</PrimaryButton></div>
}

function JourneyCompleteScreen() {
  return <SuccessPanel title="You’re all set!" description="Your AkibaOS journey is ready. Your money tools are all in one place." amount="Welcome to AkibaOS" reference="Made for your next step" to="/" button="Go to home" />
}

export default App