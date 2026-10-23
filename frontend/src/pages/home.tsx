import { Link } from 'react-router'
import { ArrowRight, CircleCheck, EyeOff, Fingerprint, Gauge, KeyRound, Lock, MailCheck, RefreshCcw, ShieldCheck, UserPlus, type LucideIcon } from 'lucide-react'
import { useAuth } from '@/lib/auth.tsx'
import { Badge } from '@/components/ui/badge.tsx'
import { Button } from '@/components/ui/button.tsx'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card.tsx'
import { useDocumentTitle } from '@/lib/use-document-title.ts'

export function Home() {
  useDocumentTitle()
  return (
    <>
      <Hero />
      <Ticker />
      <Defenses />
      <HowItWorks />
      <Security />
      <FinalCall />
    </>
  )
}

function PrimaryActions() {
  const { user } = useAuth()

  if(user) {
    return (
      <Button asChild size="lg">
        <Link to="/dashboard">Go to dashboard<ArrowRight /></Link>
      </Button>
    )
  }
  return (
    <>
      <Button asChild size="lg">
        <Link to="/sign-up">Create an account<ArrowRight /></Link>
      </Button>
      <Button asChild size="lg" variant="outline">
        <Link to="/sign-in">Sign in</Link>
      </Button>
    </>
  )
}

const heroStats = [
  { value: '15 min', label: 'Email link lifetime' },
  { value: '1 use', label: 'Per refresh token' },
  { value: '0', label: 'Answers that reveal an account' },
]

// the checks authenticateToken runs on every protected request, in the same order and with the same failure codes
const requestChecks: { stage: string, checks: { label: string, detail: string, fails?: string }[] }[] = [
  {
    stage: 'Authentication · who is asking',
    checks: [
      { label: 'Session cookie present', detail: 'httpOnly, never readable by scripts', fails: '401' },
      { label: 'Access token verified', detail: 'signature and 15 min expiry', fails: '401' },
      { label: 'Account still exists', detail: 'looked up on every request', fails: '401' },
    ],
  },
  {
    stage: 'Authorization · what they may do',
    checks: [
      { label: 'Email verified', detail: 'unverified accounts get no session', fails: '403' },
      { label: 'Own data only', detail: 'every query is scoped to the token\'s user id' },
    ],
  },
]

function Hero() {
  return (
    <section className="relative isolate overflow-hidden border-b">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <div aria-hidden className="bg-wall pointer-events-none absolute inset-0 -z-10" />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-[1.1fr_1fr]">
        {/* slides in but never fades: text that starts at opacity 0 doesn't count as painted, which delays lcp by the whole fade */}
        <div className="animate-in slide-in-from-bottom-2 duration-700">
          <Badge variant="outline" className="gap-1.5 bg-card px-3 py-1">
            <ShieldCheck className="text-primary" />Authentication &amp; authorization
          </Badge>
          <h1 className="font-display mt-6 text-4xl leading-[1.1] font-semibold sm:text-6xl">
            Know who's signing in.<br /><span className="text-primary">Decide what gets through.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            CKAuth verifies every account by email and password, keeps sessions in rotating httpOnly cookies, and checks each request before it reaches your data.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <PrimaryActions />
          </div>
          <dl className="mt-12 grid max-w-lg grid-cols-3 divide-x border-t pt-6">
            {heroStats.map(stat => (
              <div key={stat.label} className="px-4 first:pl-0">
                <dd className="font-display text-2xl font-semibold">{stat.value}</dd>
                <dt className="mt-1 text-xs leading-snug text-muted-foreground">{stat.label}</dt>
              </div>
            ))}
          </dl>
        </div>

        <RequestCard />
      </div>
    </section>
  )
}

// a protected request walking through the checks; decorative, so screen readers get the summary line instead
function RequestCard() {
  return (
    <Card className="dossier gap-0 py-0 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <CardHeader className="flex flex-row items-center justify-between border-b py-4 [.border-b]:pb-4">
        <div className="flex items-center gap-2 font-mono text-sm">
          <Badge variant="secondary" className="font-mono">GET</Badge>/auth/me
        </div>
        <Badge className="bg-success/15 font-mono text-success">200 OK</Badge>
      </CardHeader>
      <CardContent className="space-y-6 py-6">
        <p className="sr-only">A request to a protected endpoint passes three authentication checks and two authorization checks before it is answered.</p>
        {requestChecks.map(({ stage, checks }) => (
          <div key={stage} aria-hidden>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{stage}</p>
            <ul className="mt-3 space-y-3">
              {checks.map(({ label, detail, fails }) => (
                <li key={label} className="flex items-start gap-3">
                  <CircleCheck className="mt-0.5 size-4 shrink-0 text-success" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{detail}</p>
                  </div>
                  {fails && <span className="font-mono text-xs text-muted-foreground">else {fails}</span>}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
      <CardFooter className="justify-between border-t py-4 text-xs text-muted-foreground [.border-t]:pt-4">
        <span className="flex items-center gap-1.5"><Lock className="size-3.5" />Signed in as ada@example.com</span>
        <span className="font-mono">12 ms</span>
      </CardFooter>
    </Card>
  )
}

const tickerItems = ['Verified sign-ups', 'Rotating sessions', 'No account enumeration', 'Rate-limited gates', 'Hashed tokens', 'bcrypt passwords', 'httpOnly cookies', 'Single-use links']

function Ticker() {
  return (
    <div className="overflow-hidden border-y bg-secondary py-3.5 text-secondary-foreground" aria-hidden>
      <div className="flex w-max animate-marquee">
        {[0, 1].map(copy => (
          <div key={copy} className="flex shrink-0 items-center">
            {tickerItems.map(item => (
              <span key={item} className="font-display flex items-center gap-6 px-6 text-sm tracking-[0.25em] whitespace-nowrap uppercase">
                {item}<span className="text-primary">✦</span>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string, title: string, body: string }) {
  return (
    <div className="max-w-2xl">
      <p className="eyebrow flex items-center gap-3"><span className="h-px w-8 bg-primary" />{eyebrow}</p>
      <h2 className="font-display mt-4 text-4xl font-medium uppercase sm:text-5xl">{title}</h2>
      <p className="mt-4 text-lg leading-relaxed text-muted-foreground">{body}</p>
    </div>
  )
}

// named outermost to innermost, the way the three walls stand
const defenses: { wall: string, name: string, icon: LucideIcon, summary: string, points: string[] }[] = [
  {
    wall: 'Maria',
    name: 'The outer wall',
    icon: Gauge,
    summary: 'Every gate that checks a password, sends an email or spends a token is rate limited.',
    points: ['Limits per IP, per email and per user', 'Same 429 whether or not an account exists', 'IPv6 grouped by /56, so rotating addresses doesn\'t help'],
  },
  {
    wall: 'Rose',
    name: 'The second wall',
    icon: Fingerprint,
    summary: 'No session until the inbox owner proves they\'re also the person who signed up.',
    points: ['Single-use email links that expire in 15 minutes', 'Verification asks for the sign-up password', 'Unverified accounts get no cookies at all'],
  },
  {
    wall: 'Sina',
    name: 'The inner wall',
    icon: Lock,
    summary: 'Even with the database in hand, there\'s nothing an attacker can replay.',
    points: ['Passwords hashed with bcrypt', 'Every token stored as a SHA-256 hash', 'Sessions live in httpOnly cookies scripts can\'t read'],
  },
]

function Defenses() {
  return (
    <section id="defenses" className="relative scroll-mt-20 border-b py-24 sm:py-32">
      <div aria-hidden className="bg-wall pointer-events-none absolute inset-0" />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="The defenses" title="Three walls, no weak gate" body="Most breaches walk through the one door nobody guarded. CKAuth guards every one of them the same way, whether the account exists or not." />
        <div className="mt-16 grid gap-6 md:grid-cols-3">
          {defenses.map(({ wall, name, icon: Icon, summary, points }) => (
            <article key={name} className="dossier group relative flex flex-col rounded-2xl border bg-card p-7 transition-all duration-300 hover:-translate-y-1">
              <span aria-hidden className="font-display absolute top-6 right-7 text-sm font-semibold tracking-[0.3em] text-muted-foreground uppercase transition-colors group-hover:text-primary">Wall {wall}</span>
              <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon className="size-5" />
              </span>
              <h3 className="font-display mt-6 text-xl font-semibold">{name}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{summary}</p>
              <ul className="mt-6 space-y-2.5 border-t pt-5 text-sm">
                {points.map(point => (
                  <li key={point} className="flex gap-2.5">
                    <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" />
                    {point}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

const steps: { icon: LucideIcon, title: string, body: string }[] = [
  { icon: UserPlus, title: 'Enlist', body: 'Sign up with your name, email and a strong password. The meter shows how well it holds.' },
  { icon: MailCheck, title: 'Take the oath', body: 'Open the link we email you and confirm with your password. You\'re signed in on the spot.' },
  { icon: RefreshCcw, title: 'Hold your post', body: 'Short-lived access, silently refreshed. Each refresh token works once, then it\'s replaced.' },
  { icon: KeyRound, title: 'Find your way back', body: 'Forgot it? A reset link puts you back inside, and signs out every other device on the way.' },
]

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative scroll-mt-20 overflow-hidden border-b bg-muted/40 py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <SectionHeading eyebrow="Field manual" title="From cadet to inside, in four moves" body="No passwords in emails, no codes to copy, no guessing which step comes next." />
        <ol className="relative mt-16 grid gap-10 md:grid-cols-4 md:gap-6">
          <span aria-hidden className="absolute top-6 right-[12%] left-[12%] hidden h-px bg-[repeating-linear-gradient(90deg,var(--border)_0_8px,transparent_8px_14px)] md:block" />
          {steps.map(({ icon: Icon, title, body }, index) => (
            <li key={title} className="relative">
              <div className="flex items-center gap-4 md:flex-col md:items-start">
                <span className="relative z-10 flex size-12 items-center justify-center rounded-full border-2 border-primary bg-background text-primary">
                  <Icon className="size-5" />
                </span>
                <span className="font-display text-xs tracking-[0.3em] text-muted-foreground uppercase">Step {String(index + 1).padStart(2, '0')}</span>
              </div>
              <h3 className="font-display mt-4 text-2xl font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const guarantees: { icon: LucideIcon, title: string, body: string }[] = [
  { icon: EyeOff, title: 'Silent on who\'s registered', body: 'Sign-up, sign-in and recovery answer identically for every email. Only the inbox owner learns the difference.' },
  { icon: Fingerprint, title: 'No one can wear your face', body: 'Registering your address with their password gets an impostor nothing: verifying needs both the inbox and the password.' },
  { icon: RefreshCcw, title: 'A stolen refresh token dies on use', body: 'Tokens rotate on every refresh, and changing or resetting your password ends every other session.' },
]

const logLines = [
  { method: 'POST', path: '/auth/sign-up', status: '201', note: 'cadet enlisted' },
  { method: 'POST', path: '/auth/verify-email/••••', status: '200', note: 'oath taken · cookies set' },
  { method: 'GET', path: '/auth/me', status: '200', note: 'inside the walls' },
  { method: 'GET', path: '/auth/me', status: '401', note: 'access expired' },
  { method: 'POST', path: '/auth/refresh', status: '200', note: 'token rotated' },
  { method: 'POST', path: '/auth/sign-in', status: '429', note: 'titan at the gate · held' },
]

function Security() {
  return (
    <section id="security" className="scroll-mt-20 border-b py-24 sm:py-32">
      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 sm:px-6 lg:grid-cols-2">
        <div>
          <SectionHeading eyebrow="Security" title="Built for the worst day" body="Assume the attacker knows your users' emails, has a botnet, and one day gets a copy of your database. The walls still hold." />
          <ul className="mt-10 space-y-7">
            {guarantees.map(({ icon: Icon, title, body }) => (
              <li key={title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full border bg-card text-primary">
                  <Icon className="size-5" />
                </span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* a watchtower log of what the api actually answers; always a dark terminal, whatever the theme */}
        <div className="dossier overflow-hidden rounded-2xl border border-[#2a2533] bg-[#0e0d14] font-mono text-[0.8rem] text-[#f1e8dc]">
          <div className="flex items-center justify-between border-b border-[#2a2533] px-5 py-3">
            <span className="font-display text-xs tracking-[0.3em] text-[#a79bab] uppercase">Watchtower log</span>
            <span className="flex gap-1.5">
              <span className="size-2.5 rounded-full bg-[#f0642a]" />
              <span className="size-2.5 rounded-full bg-[#e0a84f]" />
              <span className="size-2.5 rounded-full bg-[#6fcf8f]" />
            </span>
          </div>
          <ul className="space-y-2.5 p-5">
            {logLines.map((line, index) => (
              <li key={index} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 animate-in fade-in slide-in-from-left-2 fill-mode-both" style={{ animationDelay: `${index * 120}ms` }}>
                <span className="w-10 text-[#a79bab]">{line.method}</span>
                <span className="min-w-0 flex-1 truncate">{line.path}</span>
                <span className={line.status.startsWith('2') ? 'text-[#6fcf8f]' : line.status === '429' ? 'text-[#f0642a]' : 'text-[#e0a84f]'}>{line.status}</span>
                <span className="w-full pl-[3.25rem] text-[#a79bab]/80 sm:w-auto sm:pl-0">· {line.note}</span>
              </li>
            ))}
            <li className="flex items-center gap-2 pt-1 text-[#a79bab]">
              <span>$</span><span className="h-4 w-2 animate-pulse bg-[#f1e8dc]/70" />
            </li>
          </ul>
        </div>
      </div>
    </section>
  )
}

function FinalCall() {
  return (
    <section className="relative isolate overflow-hidden py-24 text-center sm:py-28">
      <div aria-hidden className="bg-grid pointer-events-none absolute inset-0 -z-10 opacity-60" />
      <div className="mx-auto max-w-2xl px-4">
        <p className="eyebrow">Your post is waiting</p>
        <h2 className="font-display mt-4 text-4xl font-semibold sm:text-5xl">Take your place on the wall</h2>
        <p className="mx-auto mt-5 max-w-md text-muted-foreground">Create an account in under a minute. Verify your email once, and you're in.</p>
        <div className="mt-9 flex flex-wrap justify-center gap-3">
          <PrimaryActions />
        </div>
      </div>
    </section>
  )
}
