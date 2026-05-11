import { useEffect } from 'react'

/* ─── Inline SVG icons (no extra dependency) ──────────────────────────────── */
function IconUser({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
    </svg>
  )
}
function IconAlert({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}
function IconGlobe({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  )
}
function IconNetwork({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <rect x="16" y="16" width="6" height="6" rx="1" /><rect x="2" y="16" width="6" height="6" rx="1" /><rect x="9" y="2" width="6" height="6" rx="1" /><path d="M5 16v-3a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v3" /><path d="M12 12V8" />
    </svg>
  )
}
function IconFileText({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14,2 14,8 20,8" /><line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" /><polyline points="10,9 9,9 8,9" />
    </svg>
  )
}
function IconShield({ className, style }) {
  return (
    <svg className={className} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  )
}

const DARK = '#0A1628'
const ACCENT = '#00D68F'

/* ─── Scroll-fade observer ─────────────────────────────────────────────────── */
function useFadeUp() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('lg-visible')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.1, rootMargin: '0px 0px -60px 0px' }
    )
    document.querySelectorAll('.lg-fade').forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])
}

/* ─── Hero Network Graph SVG ───────────────────────────────────────────────── */
function HeroGraph() {
  return (
    <svg
      viewBox="0 0 640 400"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      role="img"
      aria-label="Network graph visualising financial entities connected by transactions. Five central high-risk nodes highlighted in red represent a POS cash-out ring, surrounded by medium-risk feeder nodes in amber and low-risk entry nodes in green."
    >
      <defs>
        <filter id="hg-glow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      {/* ── Edges: ring → hub ── */}
      <line x1="175" y1="120" x2="317" y2="198" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.45" />
      <line x1="465" y1="120" x2="323" y2="198" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.45" />
      <line x1="150" y1="292" x2="315" y2="208" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.45" />
      <line x1="490" y1="292" x2="325" y2="208" stroke="#EF4444" strokeWidth="1.5" strokeOpacity="0.45" />

      {/* ── Edges: feeder → ring ── */}
      <line x1="82"  y1="185" x2="172" y2="122" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="82"  y1="185" x2="152" y2="290" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="558" y1="185" x2="463" y2="122" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="558" y1="185" x2="488" y2="290" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="232" y1="362" x2="152" y2="295" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.3" />
      <line x1="408" y1="362" x2="488" y2="295" stroke="#94A3B8" strokeWidth="1" strokeOpacity="0.3" />

      {/* ── Edges: entry → feeder ── */}
      <line x1="62"  y1="72"  x2="80"  y2="182" stroke="#4B5563" strokeWidth="1" strokeOpacity="0.4" />
      <line x1="578" y1="72"  x2="556" y2="182" stroke="#4B5563" strokeWidth="1" strokeOpacity="0.4" />
      <line x1="320" y1="48"  x2="175" y2="118" stroke="#4B5563" strokeWidth="1" strokeOpacity="0.4" />
      <line x1="320" y1="48"  x2="465" y2="118" stroke="#4B5563" strokeWidth="1" strokeOpacity="0.4" />

      {/* ── Dashed cross-ring ── */}
      <line x1="175" y1="120" x2="465" y2="120" stroke="#4B5563" strokeWidth="0.8" strokeOpacity="0.22" strokeDasharray="4,5" />
      <line x1="150" y1="292" x2="490" y2="292" stroke="#4B5563" strokeWidth="0.8" strokeOpacity="0.22" strokeDasharray="4,5" />

      {/* ── Pulsing halos on HIGH nodes ── */}
      <circle cx="320" cy="205" r="28" fill="none" stroke="#EF4444" strokeWidth="1.5" className="lg-halo-1" />
      <circle cx="175" cy="120" r="19" fill="none" stroke="#EF4444" strokeWidth="1"   className="lg-halo-2" />
      <circle cx="465" cy="120" r="19" fill="none" stroke="#EF4444" strokeWidth="1"   className="lg-halo-3" />
      <circle cx="150" cy="292" r="19" fill="none" stroke="#EF4444" strokeWidth="1"   className="lg-halo-4" />
      <circle cx="490" cy="292" r="19" fill="none" stroke="#EF4444" strokeWidth="1"   className="lg-halo-5" />

      {/* ── LOW risk nodes (green) ── */}
      <circle cx="62"  cy="72"  r="8" fill="#22C55E22" stroke="#22C55E" strokeWidth="2" />
      <circle cx="578" cy="72"  r="8" fill="#22C55E22" stroke="#22C55E" strokeWidth="2" />
      <circle cx="320" cy="48"  r="8" fill="#22C55E22" stroke="#22C55E" strokeWidth="2" />

      {/* ── MEDIUM risk nodes (amber) ── */}
      <circle cx="82"  cy="185" r="9" fill="#F59E0B22" stroke="#F59E0B" strokeWidth="2" />
      <circle cx="558" cy="185" r="9" fill="#F59E0B22" stroke="#F59E0B" strokeWidth="2" />
      <circle cx="232" cy="362" r="9" fill="#F59E0B22" stroke="#F59E0B" strokeWidth="2" />
      <circle cx="408" cy="362" r="9" fill="#F59E0B22" stroke="#F59E0B" strokeWidth="2" />

      {/* ── HIGH risk ring nodes (red, glowing) ── */}
      <circle cx="175" cy="120" r="10" fill="#EF444422" stroke="#EF4444" strokeWidth="2"   filter="url(#hg-glow)" />
      <circle cx="465" cy="120" r="10" fill="#EF444422" stroke="#EF4444" strokeWidth="2"   filter="url(#hg-glow)" />
      <circle cx="150" cy="292" r="10" fill="#EF444422" stroke="#EF4444" strokeWidth="2"   filter="url(#hg-glow)" />
      <circle cx="490" cy="292" r="10" fill="#EF444422" stroke="#EF4444" strokeWidth="2"   filter="url(#hg-glow)" />

      {/* ── Hub: POS beneficiary (largest, most prominent) ── */}
      <circle cx="320" cy="205" r="15" fill="#EF444433" stroke="#EF4444" strokeWidth="2.5" filter="url(#hg-glow)" />
    </svg>
  )
}

/* ─── Deployment Architecture Diagram SVG ─────────────────────────────────── */
function DeploymentDiagram() {
  return (
    <svg
      viewBox="0 0 420 300"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full max-w-sm mx-auto lg:max-w-none"
      role="img"
      aria-label="GRACE deployment architecture diagram showing GRACE Engine, Neo4j graph database, and PostgreSQL inside a bank infrastructure boundary. Transactions flow in from outside; STR reports flow out to NFIU."
    >
      <defs>
        <marker id="dd-arr-g" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,1 L6,3.5 L0,6 Z" fill={ACCENT} />
        </marker>
        <marker id="dd-arr-gray" markerWidth="7" markerHeight="7" refX="5" refY="3.5" orient="auto">
          <path d="M0,1 L6,3.5 L0,6 Z" fill="#9CA3AF" />
        </marker>
      </defs>

      {/* Outer boundary */}
      <rect x="18" y="22" width="310" height="242" rx="10" fill="none" stroke="#D1D5DB" strokeWidth="1.5" strokeDasharray="7,4" />
      <text x="173" y="16" textAnchor="middle" fontSize="9.5" fill="#9CA3AF" fontFamily="DM Sans, sans-serif" letterSpacing="1.5">YOUR INFRASTRUCTURE</text>

      {/* GRACE Engine box */}
      <rect x="44" y="46" width="258" height="56" rx="6" fill="#F0FFF8" stroke={ACCENT} strokeWidth="1.5" />
      <text x="173" y="68" textAnchor="middle" fontSize="12" fill={DARK} fontFamily="Space Grotesk, DM Sans, sans-serif" fontWeight="700">GRACE Engine</text>
      <text x="173" y="86" textAnchor="middle" fontSize="9" fill="#6B7280" fontFamily="DM Sans, sans-serif">FastAPI  ·  Redis Queue  ·  Detection Workers</text>

      {/* Connector tree */}
      <line x1="173" y1="102" x2="173" y2="130" stroke="#D1D5DB" strokeWidth="1.5" />
      <line x1="92"  y1="130" x2="254" y2="130" stroke="#D1D5DB" strokeWidth="1.5" />
      <line x1="92"  y1="130" x2="92"  y2="148" stroke="#D1D5DB" strokeWidth="1.5" />
      <line x1="254" y1="130" x2="254" y2="148" stroke="#D1D5DB" strokeWidth="1.5" />

      {/* Neo4j */}
      <rect x="34"  y="148" width="116" height="52" rx="6" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
      <text x="92"  y="170" textAnchor="middle" fontSize="10" fill="#111827" fontFamily="DM Sans, sans-serif" fontWeight="600">Neo4j Graph</text>
      <text x="92"  y="186" textAnchor="middle" fontSize="8.5" fill="#6B7280" fontFamily="DM Sans, sans-serif">Entity relationships</text>

      {/* PostgreSQL */}
      <rect x="196" y="148" width="116" height="52" rx="6" fill="#F9FAFB" stroke="#E5E7EB" strokeWidth="1" />
      <text x="254" y="170" textAnchor="middle" fontSize="10" fill="#111827" fontFamily="DM Sans, sans-serif" fontWeight="600">PostgreSQL</text>
      <text x="254" y="186" textAnchor="middle" fontSize="8.5" fill="#6B7280" fontFamily="DM Sans, sans-serif">Transactions · Alerts</text>

      {/* Transaction input (from right) */}
      <text x="375" y="68" textAnchor="middle" fontSize="9" fill="#9CA3AF" fontFamily="DM Sans, sans-serif">Transactions</text>
      <line x1="375" y1="73" x2="375" y2="84" stroke="#9CA3AF" strokeWidth="1.2" />
      <line x1="375" y1="84" x2="305" y2="70" stroke="#9CA3AF" strokeWidth="1.2" markerEnd="url(#dd-arr-gray)" />

      {/* STR output → NFIU */}
      <line x1="92" y1="200" x2="92" y2="240" stroke={ACCENT} strokeWidth="1.5" />
      <line x1="92" y1="240" x2="170" y2="260" stroke={ACCENT} strokeWidth="1.5" markerEnd="url(#dd-arr-g)" />

      <rect x="172" y="248" width="56" height="26" rx="5" fill="#ECFDF5" stroke={ACCENT} strokeWidth="1.5" />
      <text x="200" y="265" textAnchor="middle" fontSize="10" fill={ACCENT} fontFamily="DM Sans, sans-serif" fontWeight="700">NFIU</text>

      <text x="105" y="258" fontSize="8.5" fill={ACCENT} fontFamily="DM Sans, sans-serif">STR Reports →</text>
    </svg>
  )
}


/* ─── Nav ──────────────────────────────────────────────────────────────────── */
function Nav() {
  const scrollTo = (id) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })

  return (
    <nav
      className="sticky top-0 z-50 border-b border-white/10"
      style={{ background: DARK }}
    >
      <div className="max-w-[1200px] mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-y-3">
        {/* Logo */}
        <a href="/" className="flex items-center gap-3 no-underline">
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
            <rect width="32" height="32" rx="7" fill={ACCENT} fillOpacity="0.12" />
            <circle cx="16" cy="10" r="3" fill={ACCENT} />
            <circle cx="8"  cy="24" r="3" fill={ACCENT} fillOpacity="0.7" />
            <circle cx="24" cy="24" r="3" fill={ACCENT} fillOpacity="0.7" />
            <line x1="16" y1="13" x2="8"  y2="21" stroke={ACCENT} strokeWidth="1.5" strokeOpacity="0.6" />
            <line x1="16" y1="13" x2="24" y2="21" stroke={ACCENT} strokeWidth="1.5" strokeOpacity="0.6" />
            <line x1="8"  y1="24" x2="24" y2="24" stroke={ACCENT} strokeWidth="1.5" strokeOpacity="0.3" />
          </svg>
          <span
            className="text-white text-lg font-display tracking-wide"
            style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700 }}
          >
            GR<span style={{ color: ACCENT }}>ACE</span>
          </span>
        </a>

        {/* Links + CTA */}
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
          <button onClick={() => scrollTo('how-it-works')} className="text-sm text-[#94A3B8] hover:text-white transition-colors bg-transparent border-0 cursor-pointer">How It Works</button>
          <button onClick={() => scrollTo('why-nigeria')}  className="text-sm text-[#94A3B8] hover:text-white transition-colors bg-transparent border-0 cursor-pointer">Why Nigeria</button>
          <a href="mailto:damilareodebiyi3@gmail.com"       className="text-sm text-[#94A3B8] hover:text-white transition-colors no-underline">Contact</a>
          <a
            href="/dashboard"
            className="px-5 py-2 rounded-lg text-sm font-semibold no-underline transition-colors"
            style={{ background: ACCENT, color: DARK }}
            onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
          >
            Open Dashboard →
          </a>
        </div>
      </div>
    </nav>
  )
}

/* ─── Main export ──────────────────────────────────────────────────────────── */
export default function LandingPage() {
  useFadeUp()

  return (
    <div style={{ background: DARK, color: '#F7F9FC' }}>
      <Nav />

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 2 — HERO
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: DARK, paddingTop: '96px', paddingBottom: '96px' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left: copy */}
            <div>
              <div
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono mb-8"
                style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}35`, color: ACCENT }}
              >
                Microsoft AI Skills Week 2026 · RegTech Hackathon
              </div>

              <h1
                className="font-display mb-6"
                style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(2.4rem, 5vw, 3.6rem)', lineHeight: 1.1, color: '#FFFFFF', letterSpacing: '-0.02em' }}
              >
                Financial crime hides<br />in networks.{' '}
                <span style={{ color: ACCENT }}>GRACE doesn't miss.</span>
              </h1>

              <p
                className="mb-4"
                style={{ fontSize: '1.15rem', fontWeight: 500, color: '#CBD5E1', lineHeight: 1.55 }}
              >
                Graph-based AML intelligence built for how money actually moves in Nigeria.
              </p>

              <p
                className="mb-10"
                style={{ fontSize: '1rem', color: '#94A3B8', lineHeight: 1.7, maxWidth: '480px' }}
              >
                GRACE ingests your transactions, builds a live relationship graph across every entity in your system, and detects laundering patterns that threshold-based tools are designed to miss. When a pattern is confirmed, it auto-drafts an NFIU-compliant Suspicious Transaction Report for your compliance officer to review.
              </p>

              <a
                href="/dashboard"
                className="inline-block px-8 py-4 rounded-lg font-semibold text-base no-underline lg-cta-pulse"
                style={{ background: ACCENT, color: DARK }}
              >
                Explore the Live Demo →
              </a>
            </div>

            {/* Right: SVG graph */}
            <div
              className="rounded-xl overflow-hidden"
              style={{ background: '#060E1E', border: '1px solid #1E3358', aspectRatio: '16/10' }}
            >
              <div
                className="flex items-center gap-2 px-4 py-2.5 border-b"
                style={{ borderColor: '#1E3358' }}
              >
                <span className="w-2 h-2 rounded-full bg-red-500/70" />
                <span className="w-2 h-2 rounded-full bg-amber-500/70" />
                <span className="w-2 h-2 rounded-full bg-green-500/70" />
                <span
                  className="ml-2 text-[10px] font-mono"
                  style={{ color: '#4B6B8A' }}
                >
                  graph-explorer · risk-view · live
                </span>
              </div>
              <div style={{ padding: '8px 12px 12px' }}>
                <HeroGraph />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 3 — THE PROBLEM
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#FFFFFF', paddingTop: '120px', paddingBottom: '120px' }}>
        <div className="max-w-[1200px] mx-auto px-6">

          <div className="lg-fade mb-16" style={{ maxWidth: '680px' }}>
            <h2
              className="font-display mb-5"
              style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.15, color: DARK, letterSpacing: '-0.02em' }}
            >
              Traditional compliance tools are blind to the networks behind the transactions.
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#4B5563', lineHeight: 1.7 }}>
              Most AML systems were built to check records one at a time. Money laundering is a network problem. That gap is where fraud hides.
            </p>
          </div>

          {/* Three problem cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: <IconUser className="w-5 h-5" style={{ color: DARK }} />,
                title: 'Customers verified alone',
                body: 'KYC checks treat each entity in isolation. Shell companies, layered accounts, and shared directors are invisible to flat verification systems.',
                delay: '0ms',
              },
              {
                icon: <IconAlert className="w-5 h-5" style={{ color: DARK }} />,
                title: 'Thresholds miss structured fraud',
                body: 'Fixed rules and amount thresholds are well-known to launderers. Sophisticated fraud is specifically designed to fall below detection.',
                delay: '80ms',
              },
              {
                icon: <IconGlobe className="w-5 h-5" style={{ color: DARK }} />,
                title: 'Global tools, local gaps',
                body: 'International AML platforms are trained on US and European patterns. POS cash-out rings, agent banking chains, and naira-crypto flows are invisible to them.',
                delay: '160ms',
              },
            ].map(({ icon, title, body, delay }) => (
              <div
                key={title}
                className="lg-fade rounded-xl p-7"
                style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', transitionDelay: delay }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center mb-5"
                  style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}
                >
                  {icon}
                </div>
                <h3
                  className="font-semibold mb-3"
                  style={{ fontSize: '1rem', color: DARK, fontFamily: "'DM Sans', sans-serif" }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: '#64748B', lineHeight: 1.7 }}>{body}</p>
              </div>
            ))}
          </div>

          {/* Full-width image — 711×402, display at 16:9, object-cover */}
          <div className="lg-fade w-full rounded-xl overflow-hidden" style={{ aspectRatio: '16/9' }}>
            <img
              src="/nigeria-banking-scene.jpg"
              alt="Nigerian bank branch with customers at counters and tellers at work — real Nigerian financial daily life"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 4 — HOW IT WORKS
      ════════════════════════════════════════════════════════════════════ */}
      <section id="how-it-works" style={{ background: DARK, paddingTop: '120px', paddingBottom: '120px' }}>
        <div className="max-w-[1200px] mx-auto px-6">

          <div className="lg-fade text-center mb-16" style={{ maxWidth: '560px', margin: '0 auto 64px' }}>
            <h2
              className="font-display mb-4"
              style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.15, color: '#FFFFFF', letterSpacing: '-0.02em' }}
            >
              From transaction to intelligence in five steps.
            </h2>
          </div>

          {/* Pipeline */}
          <div className="lg-fade grid grid-cols-2 md:grid-cols-5 gap-px rounded-xl overflow-hidden mb-16" style={{ border: '1px solid #1E3358', background: '#1E3358' }}>
            {[
              { n: '01', title: 'Ingest',  desc: 'Transactions received via secure API, normalised and staged' },
              { n: '02', title: 'Resolve', desc: 'Entity deduplication across BVN, NIN and account numbers' },
              { n: '03', title: 'Model',   desc: 'Neo4j graph updated with typed nodes and weighted edges' },
              { n: '04', title: 'Detect',  desc: 'Heuristic engine scores subgraphs for suspicious topologies' },
              { n: '05', title: 'Report',  desc: 'NFIU-compliant STR auto-drafted via LLM for reviewer sign-off' },
            ].map(({ n, title, desc }) => (
              <div
                key={n}
                className="flex flex-col p-6 md:p-7"
                style={{ background: '#0D1B2E' }}
              >
                <span
                  className="font-mono font-semibold text-sm mb-4 block"
                  style={{ color: ACCENT }}
                >
                  {n}
                </span>
                <h3 className="font-semibold text-white mb-2" style={{ fontSize: '0.95rem' }}>
                  {title}
                </h3>
                <p style={{ fontSize: '0.82rem', color: '#64748B', lineHeight: 1.6 }}>{desc}</p>
              </div>
            ))}
          </div>

          {/* Below pipeline: text + image */}
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="lg-fade">
              <h3
                className="font-display mb-5"
                style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.4rem', color: '#FFFFFF', letterSpacing: '-0.01em' }}
              >
                How the graph model works
              </h3>
              <p className="mb-4" style={{ fontSize: '0.95rem', color: '#94A3B8', lineHeight: 1.75 }}>
                Every person, business, and account in your institution is a <strong style={{ color: '#CBD5E1' }}>node</strong> in the graph. Every transaction between them is an <strong style={{ color: '#CBD5E1' }}>edge</strong>, weighted by volume, frequency, and recency. GRACE continuously updates this graph as new data arrives.
              </p>
              <p className="mb-4" style={{ fontSize: '0.95rem', color: '#94A3B8', lineHeight: 1.75 }}>
                The detection engine evaluates subgraph topology — not individual records — to surface patterns like cash-out rings, layered transfer chains, and shell director webs. A risk score is computed per entity and propagates to connected nodes the moment a suspicious pattern is confirmed.
              </p>
              <p style={{ fontSize: '0.95rem', color: '#94A3B8', lineHeight: 1.75 }}>
                When a flagged subgraph crosses the alert threshold, GRACE assembles the evidence package and passes it to the STR generation pipeline. Your compliance officer reviews a structured draft — they never write from scratch.
              </p>
            </div>
            <div className="lg-fade flex items-center justify-center">
              {/* Image is 288×175 — displayed in a framed card, no upscaling */}
              <div
                className="rounded-xl overflow-hidden w-full"
                style={{ background: '#0D1B2E', border: '1px solid #1E3358', padding: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '220px' }}
              >
                <img
                  src="/compliance-officer-screen.jpg"
                  alt="Compliance officer reviewing financial risk data on screen in a Nigerian fintech office"
                  style={{ maxWidth: '100%', width: '288px', height: 'auto', borderRadius: '8px', display: 'block' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 5 — WHY NIGERIA
      ════════════════════════════════════════════════════════════════════ */}
      <section id="why-nigeria" style={{ background: '#FFFFFF', paddingTop: '120px', paddingBottom: '120px' }}>
        <div className="max-w-[1200px] mx-auto px-6">

          <div className="lg-fade mb-14" style={{ maxWidth: '680px' }}>
            <h2
              className="font-display mb-5"
              style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.15, color: DARK, letterSpacing: '-0.02em' }}
            >
              Built for Nigeria's financial topology.
            </h2>
            <p style={{ fontSize: '1.05rem', color: '#4B5563', lineHeight: 1.7 }}>
              The patterns that drive financial crime in Nigeria are not the same patterns that drive it elsewhere. GRACE is trained on local reality — the way money actually moves across Nigerian banking, telecoms, and informal channels.
            </p>
          </div>

          {/* Image is 275×183 (3:2 landscape) — spans full width above the cards */}
          <div className="lg-fade mb-10 w-full rounded-xl overflow-hidden" style={{ aspectRatio: '3/2', maxHeight: '380px' }}>
            <img
              src="/lagos-fintech-workspace.jpg"
              alt="Modern Lagos fintech workspace — young professionals at workstations in a Nigerian tech company office"
              className="w-full h-full object-cover object-center"
            />
          </div>

          {/* 2×2 pattern grid — full width now that image is above */}
          <div className="grid sm:grid-cols-2 gap-5">
              {[
                {
                  title: 'POS Cash-Out Rings',
                  body: 'Networks of agents recycling funds through point-of-sale terminals — structured to stay below reporting thresholds. A topology that looks routine until you see the full ring.',
                  delay: '0ms',
                },
                {
                  title: 'Agent Banking Chains',
                  body: 'Funds layered across mobile money agents in micro-transactions, breaking the trail across dozens of accounts and obscuring the origin across multiple banks.',
                  delay: '80ms',
                },
                {
                  title: 'Naira-Crypto-Naira Loops',
                  body: 'P2P flows through stablecoins and bureau de change that re-enter the formal banking system appearing clean — a pattern largely invisible to conventional AML rules.',
                  delay: '160ms',
                },
                {
                  title: 'Shell Director Webs',
                  body: 'Businesses sharing directors, addresses, or BVNs — signals buried in CAC registrations and cross-bank data. GRACE surfaces them as connected nodes in the graph.',
                  delay: '240ms',
                },
              ].map(({ title, body, delay }) => (
                <div
                  key={title}
                  className="lg-fade rounded-xl p-6"
                  style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', transitionDelay: delay }}
                >
                  <div
                    className="w-1 h-6 rounded-full mb-4"
                    style={{ background: ACCENT }}
                  />
                  <h3
                    className="font-semibold mb-3"
                    style={{ fontSize: '0.975rem', color: DARK, fontFamily: "'DM Sans', sans-serif" }}
                  >
                    {title}
                  </h3>
                  <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.7 }}>{body}</p>
                </div>
              ))}
            </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 6 — THE PRODUCT
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: DARK, paddingTop: '120px', paddingBottom: '120px' }}>
        <div className="max-w-[1200px] mx-auto px-6">

          <div className="lg-fade mb-16" style={{ maxWidth: '580px' }}>
            <h2
              className="font-display mb-4"
              style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.15, color: '#FFFFFF', letterSpacing: '-0.02em' }}
            >
              What GRACE gives your compliance team.
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 mb-16">
            {[
              {
                icon: <IconNetwork className="w-6 h-6" style={{ color: ACCENT }} />,
                title: 'Live Risk Graph',
                body: 'A continuously updated relationship graph of every entity in your institution. Risk scores propagate across connections the moment new suspicious patterns are detected.',
                delay: '0ms',
              },
              {
                icon: <IconFileText className="w-6 h-6" style={{ color: ACCENT }} />,
                title: 'Automated STR Drafting',
                body: 'When suspicious patterns are confirmed, GRACE drafts an NFIU-compliant Suspicious Transaction Report automatically. Your compliance officer reviews, edits, and approves — never writes from scratch.',
                delay: '80ms',
              },
              {
                icon: <IconShield className="w-6 h-6" style={{ color: ACCENT }} />,
                title: 'Immutable Audit Trail',
                body: 'Every detection, every review, every decision is logged with a cryptographic hash. Built for regulator inspection and NDPA-compliant data handling.',
                delay: '160ms',
              },
            ].map(({ icon, title, body, delay }) => (
              <div
                key={title}
                className="lg-fade rounded-xl p-7"
                style={{ background: '#0D1B2E', border: '1px solid #1E3358', transitionDelay: delay }}
              >
                <div
                  className="w-11 h-11 rounded-lg flex items-center justify-center mb-6"
                  style={{ background: `${ACCENT}18`, border: `1px solid ${ACCENT}30` }}
                >
                  {icon}
                </div>
                <h3
                  className="font-semibold mb-3 text-white"
                  style={{ fontSize: '1rem', fontFamily: "'DM Sans', sans-serif" }}
                >
                  {title}
                </h3>
                <p style={{ fontSize: '0.875rem', color: '#64748B', lineHeight: 1.75 }}>{body}</p>
              </div>
            ))}
          </div>

          {/* Full-width image — 1024×540, display at natural 1024:540 ratio */}
          <div className="lg-fade w-full rounded-xl overflow-hidden" style={{ aspectRatio: '1024/540' }}>
            <img
              src="/nigerian-compliance-team.jpg"
              alt="Nigerian compliance and risk team collaborating around a table reviewing data and reports"
              className="w-full h-full object-cover object-center"
            />
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 7 — DEPLOYMENT
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: '#FFFFFF', paddingTop: '120px', paddingBottom: '120px' }}>
        <div className="max-w-[1200px] mx-auto px-6">

          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: text */}
            <div className="lg-fade">
              <h2
                className="font-display mb-6"
                style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(1.8rem, 4vw, 2.8rem)', lineHeight: 1.15, color: DARK, letterSpacing: '-0.02em' }}
              >
                Your data never leaves your walls.
              </h2>
              <p className="mb-5" style={{ fontSize: '1rem', color: '#4B5563', lineHeight: 1.75 }}>
                GRACE deploys inside your own infrastructure — your Azure tenant, your private server, or a dedicated cloud instance we manage for you. Your transaction data is processed entirely within your environment.
              </p>
              <p className="mb-5" style={{ fontSize: '1rem', color: '#4B5563', lineHeight: 1.75 }}>
                We provide the software. You keep the keys.
              </p>
              <p className="mb-10" style={{ fontSize: '1rem', color: '#4B5563', lineHeight: 1.75 }}>
                The Neo4j graph database, PostgreSQL transaction store, and GRACE detection engine run on your compute. STR reports are the only data that leave — and only to NFIU, by your compliance officer's action.
              </p>
              <div
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium"
                style={{ background: `${ACCENT}12`, border: `1px solid ${ACCENT}30`, color: '#065F46' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1L1 4v3c0 3.31 2.58 6.41 6 7.16C10.42 13.41 13 10.31 13 7V4L7 1z" stroke="#00D68F" strokeWidth="1.5" fill="none" />
                  <path d="M4.5 7l2 2 3-3" stroke="#00D68F" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                Designed for NDPA compliance and CBN KYC reporting standards
              </div>
            </div>

            {/* Right: deployment diagram */}
            <div className="lg-fade flex items-center justify-center">
              <DeploymentDiagram />
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 8 — CTA
      ════════════════════════════════════════════════════════════════════ */}
      <section style={{ background: DARK, paddingTop: '120px', paddingBottom: '120px' }}>
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <div className="lg-fade" style={{ maxWidth: '680px', margin: '0 auto' }}>
            <h2
              className="font-display mb-5"
              style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700, fontSize: 'clamp(2rem, 4.5vw, 3.2rem)', lineHeight: 1.15, color: '#FFFFFF', letterSpacing: '-0.02em' }}
            >
              See the networks.<br />Stop the crime.<br />Earn the trust.
            </h2>
            <p className="mb-10" style={{ fontSize: '1.05rem', color: '#94A3B8', lineHeight: 1.65 }}>
              Built for Nigerian financial institutions that take compliance seriously.
            </p>
            <a
              href="/dashboard"
              className="inline-block px-10 py-4 rounded-lg font-semibold text-base no-underline lg-cta-pulse"
              style={{ background: ACCENT, color: DARK, fontSize: '1rem' }}
            >
              Open the Live Dashboard →
            </a>
            <p className="mt-6" style={{ fontSize: '0.85rem', color: '#475569' }}>
              No login required. The full pipeline runs live — ingestion, detection, STR generation.
            </p>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════════════════
          SECTION 9 — FOOTER
      ════════════════════════════════════════════════════════════════════ */}
      <footer style={{ background: DARK, borderTop: '1px solid #1E3358', paddingTop: '48px', paddingBottom: '48px' }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="grid sm:grid-cols-3 gap-10 mb-10">
            {/* Logo + tagline */}
            <div>
              <div className="flex items-center gap-3 mb-3">
                <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <rect width="32" height="32" rx="7" fill={ACCENT} fillOpacity="0.12" />
                  <circle cx="16" cy="10" r="3" fill={ACCENT} />
                  <circle cx="8"  cy="24" r="3" fill={ACCENT} fillOpacity="0.7" />
                  <circle cx="24" cy="24" r="3" fill={ACCENT} fillOpacity="0.7" />
                  <line x1="16" y1="13" x2="8"  y2="21" stroke={ACCENT} strokeWidth="1.5" strokeOpacity="0.6" />
                  <line x1="16" y1="13" x2="24" y2="21" stroke={ACCENT} strokeWidth="1.5" strokeOpacity="0.6" />
                  <line x1="8"  y1="24" x2="24" y2="24" stroke={ACCENT} strokeWidth="1.5" strokeOpacity="0.3" />
                </svg>
                <span
                  style={{ fontFamily: "'Space Grotesk', 'DM Sans', sans-serif", fontWeight: 700, fontSize: '1.1rem', color: '#FFFFFF' }}
                >
                  GR<span style={{ color: ACCENT }}>ACE</span>
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.65 }}>
                Graph-based AML intelligence for Nigeria.
              </p>
            </div>

            {/* Links */}
            <div className="flex flex-col gap-3">
              <p style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Navigation</p>
              <button onClick={() => document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })} className="text-left text-sm bg-transparent border-0 cursor-pointer" style={{ color: '#64748B' }}>How It Works</button>
              <button onClick={() => document.getElementById('why-nigeria')?.scrollIntoView({ behavior: 'smooth' })}  className="text-left text-sm bg-transparent border-0 cursor-pointer" style={{ color: '#64748B' }}>Why Nigeria</button>
              <a href="/dashboard" className="text-sm no-underline" style={{ color: '#64748B' }}>Open Dashboard</a>
            </div>

            {/* Recognition */}
            <div>
              <p style={{ fontSize: '0.75rem', color: '#374151', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: '12px' }}>Recognition</p>
              <p style={{ fontSize: '0.85rem', color: '#475569', lineHeight: 1.65 }}>
                Built for the Microsoft AI Skills Week 2026 RegTech Hackathon.
              </p>
            </div>
          </div>

          <div style={{ borderTop: '1px solid #1E3358', paddingTop: '24px' }}>
            <p style={{ fontSize: '0.8rem', color: '#374151' }}>
              © 2026 GRACE. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
