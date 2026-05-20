'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { LogoMark } from '@/components/layout/logo-mark'
import { Menu, X } from 'lucide-react'

// ─── Inline styles object for landing page ───────────────────
const C = {
  bg:      '#0f1623',
  bg2:     '#141e2e',
  bg3:     '#1a2540',
  orange:  '#E85400',
  orangeL: '#ff6a1a',
  orangeD: '#b84200',
  cream:   '#f1f5f9',
  muted:   '#8899aa',
  border:  'rgba(255,255,255,0.07)',
  rule:    'rgba(255,255,255,0.04)',
}

const S = {
  section: { padding: 'clamp(80px,10vh,120px) clamp(24px,7vw,100px)' } as React.CSSProperties,
  h2: { fontFamily: 'var(--font-sora)', fontSize: 'clamp(32px,5vw,56px)', fontWeight: 800, color: C.cream, lineHeight: 1.1, letterSpacing: '-1.5px' } as React.CSSProperties,
  body: { fontSize: 'clamp(15px,1.6vw,17px)', lineHeight: 1.75, color: C.muted } as React.CSSProperties,
  eyebrow: { fontSize: 11, letterSpacing: '4px', textTransform: 'uppercase' as const, color: C.orange, display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 },
  orangeRule: { display: 'block', width: 32, height: 2, background: C.orange, borderRadius: 2, flexShrink: 0 } as React.CSSProperties,
}

function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function FadeIn({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: React.CSSProperties }) {
  const { ref, visible } = useInView()
  return (
    <div ref={ref} style={{
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(28px)',
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── NAVBAR ──────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 40)
    window.addEventListener('scroll', h)
    return () => window.removeEventListener('scroll', h)
  }, [])

  function goto(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setOpen(false)
  }

  const navLinks: [string, string][] = [
    ['problem', 'Το Πρόβλημα'],
    ['solution', 'Λύση'],
    ['early-access', 'Early Access'],
  ]

  return (
    <>
      <nav style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 clamp(20px,5vw,80px)',
        height: 64,
        background: scrolled || open ? 'rgba(15,22,35,0.97)' : 'transparent',
        backdropFilter: scrolled || open ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? `1px solid ${C.border}` : '1px solid transparent',
        transition: 'background 0.3s ease, backdrop-filter 0.3s ease, border-color 0.3s ease',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={26} />
          <span style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: 15, color: C.cream, letterSpacing: '-0.3px' }}>
            RelayDeck
          </span>
        </div>

        {/* Desktop links — hidden below sm, original <a> tag style */}
        <div className="hidden sm:flex" style={{ alignItems: 'center', gap: 32 }}>
          {navLinks.map(([id, label]) => (
            <a key={id} href={`#${id}`}
              onClick={e => { e.preventDefault(); goto(id) }}
              style={{ fontSize: 13, color: C.muted, textDecoration: 'none', letterSpacing: '0.3px', transition: 'color 0.2s' }}
              onMouseEnter={e => (e.currentTarget.style.color = C.cream)}
              onMouseLeave={e => (e.currentTarget.style.color = C.muted)}>
              {label}
            </a>
          ))}
          <a href="#request"
            onClick={e => { e.preventDefault(); goto('request') }}
            style={{ background: C.orange, color: 'white', fontSize: 12, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', textDecoration: 'none', padding: '9px 20px', borderRadius: 6, transition: 'background 0.2s' }}
            onMouseEnter={e => (e.currentTarget.style.background = C.orangeL)}
            onMouseLeave={e => (e.currentTarget.style.background = C.orange)}>
            Αίτηση Πρόσβασης
          </a>
        </div>

        {/* Hamburger — visible below sm only */}
        <button
          type="button"
          className="sm:hidden flex items-center justify-center"
          onClick={() => setOpen(o => !o)}
          aria-label={open ? 'Κλείσιμο μενού' : 'Άνοιγμα μενού'}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: C.cream, padding: 8 }}
        >
          {open ? <X size={22} /> : <Menu size={22} />}
        </button>
      </nav>

      {/* Mobile menu overlay */}
      {open && (
        <div style={{
          position: 'fixed', top: 64, left: 0, right: 0, bottom: 0, zIndex: 99,
          background: C.bg,
          display: 'flex', flexDirection: 'column',
          padding: '40px 28px 48px',
          overflowY: 'auto',
        }}
          className="sm:hidden"
        >
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
            {navLinks.map(([id, label]) => (
              <button key={id} type="button" onClick={() => goto(id)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  textAlign: 'left', padding: '18px 0',
                  fontSize: 22, fontWeight: 700, fontFamily: 'var(--font-sora)',
                  color: C.muted, letterSpacing: '-0.5px',
                  borderBottom: `1px solid ${C.border}`,
                  transition: 'color 0.15s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = C.cream)}
                onMouseLeave={e => (e.currentTarget.style.color = C.muted)}
              >
                {label}
              </button>
            ))}
          </nav>

          <div style={{ marginTop: 40, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button type="button" onClick={() => goto('request')}
              style={{
                background: C.orange, color: 'white', border: 'none', cursor: 'pointer',
                padding: '18px 24px', borderRadius: 8, width: '100%',
                fontSize: 13, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = C.orangeL)}
              onMouseLeave={e => (e.currentTarget.style.background = C.orange)}
            >
              Αίτηση Πρόσβασης →
            </button>
            <Link href="/login"
              style={{ textAlign: 'center', fontSize: 13, color: C.muted, textDecoration: 'none', padding: '12px 0' }}
            >
              Σύνδεση →
            </Link>
          </div>
        </div>
      )}
    </>
  )
}

// ─── HERO ────────────────────────────────────────────────────
function Hero() {
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    try {
      const res = await fetch('/api/request-access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, company }),
      })
      setStatus(res.ok ? 'done' : 'error')
    } catch {
      setStatus('error')
    }
  }

  return (
    <section style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end',
      padding: 'clamp(120px,18vh,180px) clamp(24px,7vw,100px) clamp(60px,9vh,120px)',
      position: 'relative', overflow: 'hidden', background: C.bg,
    }}>
      {/* Grid overlay */}
      <div style={{
        position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none',
        backgroundImage: `linear-gradient(${C.rule} 1px,transparent 1px),linear-gradient(90deg,${C.rule} 1px,transparent 1px)`,
        backgroundSize: '72px 72px',
        maskImage: 'radial-gradient(ellipse 90% 90% at 40% 40%, black 0%, transparent 70%)',
        WebkitMaskImage: 'radial-gradient(ellipse 90% 90% at 40% 40%, black 0%, transparent 70%)',
      }} />
      {/* Orange glow */}
      <div style={{
        position: 'absolute', top: '20%', left: '55%', zIndex: 1, pointerEvents: 'none',
        width: 500, height: 500, borderRadius: '50%',
        background: `radial-gradient(circle, ${C.orangeD}22 0%, transparent 70%)`,
        transform: 'translate(-50%,-50%)',
      }} />

      <div style={{ position: 'relative', zIndex: 2, maxWidth: 780 }}>
        <div style={{ ...S.eyebrow, animation: 'fadeInUp 0.8s ease 0.1s both' }}>
          <span style={S.orangeRule} />
          Syntesys · B2B Operations Platform
        </div>

        <h1 style={{
          fontFamily: 'var(--font-sora)',
          fontSize: 'clamp(48px,8.5vw,108px)',
          fontWeight: 800,
          lineHeight: 1.0,
          letterSpacing: '-3px',
          color: C.cream,
          marginBottom: 0,
          animation: 'fadeInUp 0.9s ease 0.25s both',
        }}>
          Μετά την έκθεση,<br />
          ξεκινάει<br />
          <span style={{ color: C.orange }}>το χάος.</span>
        </h1>

        <p style={{
          ...S.body,
          marginTop: 28, maxWidth: 480,
          animation: 'fadeInUp 0.8s ease 0.45s both',
        }}>
          Εμείς το εξαφανίζουμε. Ένα σύστημα που οργανώνει{' '}
          <strong style={{ color: C.cream }}>παραγγελίες, πελάτες, παραγωγή και προμηθευτές</strong>{' '}
          για B2B επιχειρήσεις που δουλεύουν με εκθέσεις & χονδρική.
        </p>

        {status === 'done' ? (
          <div style={{ marginTop: 36, padding: '16px 24px', background: 'rgba(232,84,0,0.12)', border: `1px solid ${C.orange}40`, borderRadius: 8, animation: 'fadeInUp 0.5s ease both' }}>
            <p style={{ color: C.orange, fontWeight: 600, fontSize: 14 }}>✓ Η αίτησή σας καταχωρήθηκε</p>
            <p style={{ color: C.muted, fontSize: 13, marginTop: 4 }}>Θα επικοινωνήσουμε μαζί σας εντός 24 ωρών.</p>
          </div>
        ) : (
          <form onSubmit={submit} style={{ marginTop: 36, display: 'flex', gap: 10, maxWidth: 500, flexWrap: 'wrap', animation: 'fadeInUp 0.8s ease 0.65s both' }}>
            <input type="text" placeholder="Επωνυμία εταιρείας" value={company} onChange={e => setCompany(e.target.value)} required
              style={{ flex: '1 1 180px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.cream, padding: '13px 18px', fontSize: 14, borderRadius: 6, outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => (e.target.style.borderColor = C.orange)} onBlur={e => (e.target.style.borderColor = C.border)} />
            <input type="email" placeholder="Email επικοινωνίας" value={email} onChange={e => setEmail(e.target.value)} required
              style={{ flex: '1 1 200px', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`, color: C.cream, padding: '13px 18px', fontSize: 14, borderRadius: 6, outline: 'none', transition: 'border-color 0.2s' }}
              onFocus={e => (e.target.style.borderColor = C.orange)} onBlur={e => (e.target.style.borderColor = C.border)} />
            <button type="submit" disabled={status === 'loading'} style={{
              background: C.orange, color: 'white', border: 'none', padding: '13px 28px',
              fontSize: 12, fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase',
              borderRadius: 6, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'background 0.2s',
            }}
              onMouseEnter={e => (e.currentTarget.style.background = C.orangeL)}
              onMouseLeave={e => (e.currentTarget.style.background = C.orange)}>
              {status === 'loading' ? '…' : 'Αιτηθείτε Πρόσβαση'}
            </button>
            {status === 'error' && <p style={{ fontSize: 12, color: '#ef4444', width: '100%', marginTop: 4 }}>Κάτι πήγε στραβά. Δοκιμάστε ξανά.</p>}
          </form>
        )}

        <div style={{ display: 'flex', gap: 'clamp(24px,5vw,48px)', marginTop: 56, paddingTop: 32, borderTop: `1px solid ${C.border}`, flexWrap: 'wrap', animation: 'fadeInUp 0.8s ease 0.8s both' }}>
          {[['50', 'θέσεις Early Access'], ['1 ημέρα', 'αντί 3 εβδομάδες'], ['0', 'εκπαίδευση χρόνος']].map(([val, lab]) => (
            <div key={lab}>
              <div style={{ fontFamily: 'var(--font-sora)', fontSize: 32, fontWeight: 800, color: C.orange, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 10, letterSpacing: '2px', textTransform: 'uppercase', color: C.muted, marginTop: 6 }}>{lab}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Scroll indicator */}
      <div style={{ position: 'absolute', right: 'clamp(24px,4vw,60px)', bottom: 48, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, zIndex: 2 }}>
        <div style={{ width: 1, height: 56, background: `linear-gradient(to bottom, transparent, ${C.orange})` }} />
        <span style={{ fontSize: 9, letterSpacing: '3px', textTransform: 'uppercase', color: C.muted, writingMode: 'vertical-rl' }}>Scroll</span>
      </div>
    </section>
  )
}

// ─── PROBLEM ─────────────────────────────────────────────────
function Problem() {
  const pains = [
    'Παραγγελίες σε μπλοκάκια, φύλλα, φωτογραφίες',
    'Κωδικοί & ποσότητες "μεταφράζονται" αργότερα',
    'Τηλέφωνα για να βγει τελικό ποσό & προκαταβολή',
    'Η παραγωγή ξεκινά χωρίς καθαρή εικόνα',
    'Οι προμηθευτές περιμένουν οδηγίες',
    '2–3 εβδομάδες για να "στρώσει" το πράγμα',
  ]

  return (
    <section id="problem" style={{ ...S.section, background: C.bg2, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <div style={S.eyebrow}><span style={S.orangeRule} />Αν έχεις συμμετάσχει σε έκθεση</div>
          <h2 style={{ ...S.h2, maxWidth: 640 }}>
            Αυτό σου είναι<br />
            <span style={{ color: C.orange }}>γνώριμο.</span>
          </h2>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16, marginTop: 56 }}>
          {pains.map((pain, i) => (
            <FadeIn key={pain} delay={i * 0.07}>
              <div style={{ padding: '20px 24px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 14 }}>
                <span style={{ color: C.orange, fontSize: 18, lineHeight: 1, flexShrink: 0, marginTop: 2 }}>—</span>
                <p style={{ ...S.body, color: C.muted, margin: 0 }}>{pain}</p>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={0.3}>
          <div style={{ marginTop: 48, padding: '24px 32px', background: `${C.orange}0d`, border: `1px solid ${C.orange}30`, borderRadius: 10 }}>
            <p style={{ ...S.body, color: C.cream, margin: 0 }}>
              <strong>Και όλα αυτά ενώ η επιχείρησή σου τρέχει κανονικά.</strong>{' '}
              Το πρόβλημα δεν είναι μόνο ο χρόνος. Είναι ο <span style={{ color: C.orange }}>έλεγχος</span>.
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── SOLUTION ────────────────────────────────────────────────
function Solution() {
  const pillars = [
    { num: '01', title: 'Καταγραφή Παραγγελίας', body: 'Ψηφιακή, δομημένη, με κωδικούς, ποσότητες και στοιχεία πελάτη. Tablet, PDA ή desktop — λειτουργεί παντού, ακόμα και χωρίς internet.' },
    { num: '02', title: 'Αυτόματα Σύνολα & Προκαταβολές', body: 'Χωρίς χειροκίνητους υπολογισμούς. Χωρίς τηλέφωνα. Το σύστημα υπολογίζει αυτόματα σύνολο, προκαταβολή (50%) και υπόλοιπο.' },
    { num: '03', title: 'Παραγωγή & Προμηθευτές', body: 'Ξέρεις τι πρέπει να γίνει από την πρώτη μέρα. Kanban παραγωγής, αθροιστικές ποσότητες ανά κωδικό, forecast υλικών.' },
    { num: '04', title: 'Οργανωμένο CRM', body: 'Ξέρεις ποιος αγόρασε τι, πότε και γιατί. Πλήρες ιστορικό, tags, email επικοινωνία απευθείας από το προφίλ πελάτη.' },
  ]

  return (
    <section id="solution" style={{ ...S.section, background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <div style={S.eyebrow}><span style={S.orangeRule} />Τι αλλάζει στην πράξη</div>
          <h2 style={{ ...S.h2, maxWidth: 560 }}>
            Δεν είναι άλλο ένα σύστημα.<br />
            <span style={{ color: C.orange }}>Είναι υποδομή.</span>
          </h2>
          <p style={{ ...S.body, maxWidth: 520, marginTop: 20 }}>
            Σχεδιασμένο πάνω σε πραγματικές διαδικασίες ελληνικών επιχειρήσεων που δουλεύουν με εκθέσεις, χονδρική, παραγωγή και logistics.
          </p>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20, marginTop: 60 }}>
          {pillars.map((p, i) => (
            <FadeIn key={p.num} delay={i * 0.1}>
              <div style={{ padding: '32px 28px', background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 12, height: '100%' }}>
                <div style={{ fontFamily: 'var(--font-sora)', fontSize: 40, fontWeight: 800, color: `${C.orange}30`, lineHeight: 1, marginBottom: 16 }}>{p.num}</div>
                <h3 style={{ fontFamily: 'var(--font-sora)', fontSize: 18, fontWeight: 700, color: C.cream, marginBottom: 12, letterSpacing: '-0.3px' }}>{p.title}</h3>
                <p style={{ ...S.body, fontSize: 14, margin: 0 }}>{p.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FEATURES ────────────────────────────────────────────────
function Features() {
  const features = [
    { icon: '📋', title: 'Relay Deck Core System', desc: 'Πλήρης πρόσβαση: ψηφιακή καταγγελία, CRM-ready, real-time εικόνα, export παραγωγής.' },
    { icon: '⚙️', title: 'Custom Setup', desc: 'Προσαρμογή fields, mapping ροής, παραμετροποίηση παραγωγής & υλικών για τη δική σου επιχείρηση.' },
    { icon: '🏭', title: 'Production & Supplier View', desc: 'Dashboard με τι να παραχθεί, τι υλικά χρειάζονται, σε τι ποσότητες, με ποια προτεραιότητα.' },
    { icon: '👥', title: 'Centralized Client CRM', desc: 'Ιστορικό παραγγελιών, τι αγοράζει ο καθένας, ποια προϊόντα κινούνται — βάση για μελλοντική επικοινωνία.' },
    { icon: '📧', title: 'Email Automation', desc: 'Επιβεβαίωση παραγγελίας, ενημέρωση για προκαταβολή, βασική επικοινωνία μετά την έκθεση.' },
    { icon: '🔧', title: 'PDA / Tablet Mode', desc: 'Σάρωση barcode, γρήγορη επιλογή πελάτη, offline λειτουργία — έτοιμο για έκθεση.' },
    { icon: '🗺️', title: 'Feature Influence', desc: 'Οι 50 Early Access επιχειρήσεις προτείνουν λειτουργίες και επηρεάζουν το roadmap.' },
    { icon: '🛡️', title: 'Priority Support', desc: 'Άμεση επικοινωνία, ανθρώπινη υποστήριξη. Μιλάς με την ομάδα που το χτίζει.' },
  ]

  return (
    <section style={{ ...S.section, background: C.bg2, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <div style={S.eyebrow}><span style={S.orangeRule} />Τι περιλαμβάνει</div>
          <h2 style={S.h2}>Early Access — Full Package</h2>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, marginTop: 52 }}>
          {features.map((f, i) => (
            <FadeIn key={f.title} delay={i * 0.07}>
              <div style={{ padding: '24px 22px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, transition: 'border-color 0.2s' }}
                onMouseEnter={e => ((e.currentTarget as HTMLElement).style.borderColor = `${C.orange}40`)}
                onMouseLeave={e => ((e.currentTarget as HTMLElement).style.borderColor = C.border)}>
                <div style={{ fontSize: 24, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontFamily: 'var(--font-sora)', fontSize: 14, fontWeight: 700, color: C.cream, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ ...S.body, fontSize: 13, margin: 0 }}>{f.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── WHO IT'S FOR ─────────────────────────────────────────────
function WhoFor() {
  const yes = ['B2B επιχειρήσεις', 'Εκθέτες / χονδρική / παραγωγή', 'Όσοι θέλουν έλεγχο & καθαρή εικόνα', 'Επιχειρήσεις με ετήσιες εκθέσεις']
  const no = ['Retail e-shops', '"Ένα απλό πρόγραμμα παραγγελιών"', 'Επιχειρήσεις που δεν θέλουν να αλλάξει τίποτα']

  return (
    <section style={{ ...S.section, background: C.bg }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <div style={S.eyebrow}><span style={S.orangeRule} />Για ποιους είναι</div>
          <h2 style={S.h2}>— και για ποιους <span style={{ color: C.orange }}>όχι.</span></h2>
        </FadeIn>
        <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 24, marginTop: 52, maxWidth: 760 }}>
          <FadeIn delay={0.1}>
            <div style={{ padding: '28px 24px', background: `${C.orange}0a`, border: `1px solid ${C.orange}25`, borderRadius: 10 }}>
              <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: C.orange, marginBottom: 20 }}>Ταιριάζει σε</p>
              {yes.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <span style={{ color: C.orange, fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>✔</span>
                  <span style={{ ...S.body, fontSize: 14, color: C.cream }}>{item}</span>
                </div>
              ))}
            </div>
          </FadeIn>
          <FadeIn delay={0.2}>
            <div style={{ padding: '28px 24px', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.border}`, borderRadius: 10 }}>
              <p style={{ fontSize: 11, letterSpacing: '3px', textTransform: 'uppercase', color: C.muted, marginBottom: 20 }}>Δεν ταιριάζει σε</p>
              {no.map(item => (
                <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 12 }}>
                  <span style={{ color: '#64748b', fontSize: 16, lineHeight: 1.4, flexShrink: 0 }}>✗</span>
                  <span style={{ ...S.body, fontSize: 14, color: C.muted }}>{item}</span>
                </div>
              ))}
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ─── EARLY ACCESS ─────────────────────────────────────────────
function EarlyAccess() {
  return (
    <section id="early-access" style={{ ...S.section, background: C.bg2, borderTop: `1px solid ${C.border}` }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div className="grid grid-cols-1 lg:grid-cols-2" style={{ gap: 'clamp(40px,6vw,64px)', alignItems: 'center' }}>
          <FadeIn>
            <div style={S.eyebrow}><span style={S.orangeRule} />Γιατί τώρα — και γιατί λίγοι</div>
            <h2 style={S.h2}>
              Early Access —<br />
              <span style={{ color: C.orange }}>50 επιχειρήσεις</span><br />
              μόνο.
            </h2>
            <p style={{ ...S.body, marginTop: 20 }}>
              Ξεκινάμε με 50 επιχειρήσεις σε Early Access για να ολοκληρώσουμε το σύστημα πάνω σε πραγματικές ροές, να προσαρμόσουμε λεπτομέρειες, και να δημιουργήσουμε ένα σταθερό operational framework.
            </p>
            <p style={{ ...S.body, marginTop: 16, fontWeight: 600, color: C.cream }}>
              Δεν είσαι απλός χρήστης. Είσαι <span style={{ color: C.orange }}>συνδιαμορφωτής</span>.
            </p>
          </FadeIn>
          <FadeIn delay={0.15}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {[
                ['Τιμή κλειδωμένη', 'Για όσο είσαι ενεργός — οι επόμενοι δεν θα μπουν με αυτούς τους όρους.'],
                ['Επιρροή στο roadmap', 'Προτείνεις λειτουργίες. Επηρεάζεις αυτό που χτίζεται.'],
                ['Priority Support', 'Άμεση γραμμή. Μιλάς με την ομάδα που το χτίζει.'],
                ['Custom Setup', 'Παραμετροποίηση για τη δική σου επιχείρηση. Όχι generic.'],
              ].map(([title, body]) => (
                <div key={title} style={{ padding: '20px 22px', background: C.bg, border: `1px solid ${C.border}`, borderRadius: 10, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: C.orange, flexShrink: 0, marginTop: 6 }} />
                  <div>
                    <p style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: 14, color: C.cream, marginBottom: 4 }}>{title}</p>
                    <p style={{ ...S.body, fontSize: 13, margin: 0 }}>{body}</p>
                  </div>
                </div>
              ))}
              <div style={{ padding: '16px 20px', background: `${C.orange}12`, border: `1px solid ${C.orange}30`, borderRadius: 10, textAlign: 'center' }}>
                <p style={{ color: C.muted, fontSize: 12, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 4 }}>Μόλις καλυφθούν</p>
                <p style={{ color: C.cream, fontWeight: 600, fontSize: 14 }}>Το πρόγραμμα κλείνει · Το pricing αλλάζει</p>
                <p style={{ color: C.orange, fontSize: 12, marginTop: 4 }}>Δεν θα υπάρξει δεύτερο "founding batch".</p>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  )
}

// ─── REQUEST ACCESS ───────────────────────────────────────────
function RequestAccess() {
  const [form, setForm] = useState({ email: '', company: '', name: '', phone: '' })
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle')

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setStatus('loading')
    const res = await fetch('/api/request-access', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) })
    setStatus(res.ok ? 'done' : 'error')
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', background: 'rgba(255,255,255,0.05)', border: `1px solid ${C.border}`,
    color: C.cream, padding: '14px 18px', fontSize: 14, borderRadius: 8, outline: 'none', transition: 'border-color 0.2s',
  }

  return (
    <section id="request" style={{ ...S.section, background: C.bg }}>
      <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
        <FadeIn>
          <div style={{ ...S.eyebrow, justifyContent: 'center' }}><span style={S.orangeRule} />Early Access · 50 θέσεις</div>
          <h2 style={{ ...S.h2, fontSize: 'clamp(36px,5vw,56px)' }}>
            ΑΙΤΗΘΕΙΤΕ<br />
            <span style={{ color: C.orange }}>ΠΡΟΣΒΑΣΗ</span>
          </h2>
          <p style={{ ...S.body, marginTop: 16, marginBottom: 40 }}>
            Χωρίς δέσμευση. Θέλουμε πρώτα να δούμε αν ταιριάζει στη δική σου λειτουργία.
          </p>
        </FadeIn>
        <FadeIn delay={0.1}>
          {status === 'done' ? (
            <div style={{ padding: '40px 32px', background: `${C.orange}0d`, border: `1px solid ${C.orange}40`, borderRadius: 12 }}>
              <div style={{ fontSize: 40, marginBottom: 16 }}>✓</div>
              <h3 style={{ fontFamily: 'var(--font-sora)', fontSize: 20, fontWeight: 700, color: C.cream, marginBottom: 8 }}>Η αίτησή σας στάλθηκε!</h3>
              <p style={{ ...S.body, color: C.muted }}>Θα επικοινωνήσουμε μαζί σας εντός 24–48 ωρών για να δούμε αν ταιριάζει.</p>
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div className="grid grid-cols-1 sm:grid-cols-2" style={{ gap: 12 }}>
                <input type="text" placeholder="Επωνυμία εταιρείας *" required value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))}
                  style={inputStyle} onFocus={e => (e.target.style.borderColor = C.orange)} onBlur={e => (e.target.style.borderColor = C.border)} />
                <input type="text" placeholder="Ονοματεπώνυμο *" required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  style={inputStyle} onFocus={e => (e.target.style.borderColor = C.orange)} onBlur={e => (e.target.style.borderColor = C.border)} />
              </div>
              <input type="email" placeholder="Email *" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                style={inputStyle} onFocus={e => (e.target.style.borderColor = C.orange)} onBlur={e => (e.target.style.borderColor = C.border)} />
              <input type="tel" placeholder="Τηλέφωνο" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                style={inputStyle} onFocus={e => (e.target.style.borderColor = C.orange)} onBlur={e => (e.target.style.borderColor = C.border)} />
              <button type="submit" disabled={status === 'loading'} style={{
                background: C.orange, color: 'white', border: 'none', padding: '16px 32px', marginTop: 8,
                fontSize: 13, fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                borderRadius: 8, cursor: 'pointer', width: '100%', transition: 'background 0.2s',
              }}
                onMouseEnter={e => (e.currentTarget.style.background = C.orangeL)}
                onMouseLeave={e => (e.currentTarget.style.background = C.orange)}>
                {status === 'loading' ? '…' : 'Αιτηθείτε Πρόσβαση →'}
              </button>
              {status === 'error' && <p style={{ fontSize: 13, color: '#ef4444', marginTop: 4 }}>Κάτι πήγε στραβά. Δοκιμάστε ξανά.</p>}
              <p style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
                Τα στοιχεία σας παραμένουν ιδιωτικά. Δεν στέλνουμε spam.
              </p>
            </form>
          )}
        </FadeIn>
      </div>
    </section>
  )
}

// ─── FOOTER ──────────────────────────────────────────────────
function Footer() {
  return (
    <footer style={{ borderTop: `1px solid ${C.border}`, background: C.bg, padding: '40px clamp(24px,7vw,100px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LogoMark size={22} />
          <span style={{ fontFamily: 'var(--font-sora)', fontWeight: 700, fontSize: 14, color: C.cream }}>RelayDeck</span>
          <span style={{ color: C.muted, fontSize: 13, marginLeft: 8 }}>by Syntesys</span>
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <Link href="/login" style={{ fontSize: 13, color: C.muted, textDecoration: 'none' }}>Σύνδεση</Link>
          <span style={{ fontSize: 13, color: C.muted }}>©2026 Syntesys. All rights reserved.</span>
        </div>
      </div>
    </footer>
  )
}

// ─── PAGE ANIMATIONS CSS ──────────────────────────────────────
const GLOBAL_CSS = `
  @keyframes fadeInUp {
    from { opacity:0; transform:translateY(24px); }
    to   { opacity:1; transform:translateY(0); }
  }
`

// ─── ROOT PAGE ───────────────────────────────────────────────
export default function LandingPage() {
  return (
    <>
      <style>{GLOBAL_CSS}</style>
      <div style={{ background: C.bg, minHeight: '100vh', color: C.cream }}>
        <Nav />
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <WhoFor />
        <EarlyAccess />
        <RequestAccess />
        <Footer />
      </div>
    </>
  )
}
