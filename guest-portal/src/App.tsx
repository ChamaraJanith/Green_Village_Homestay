import { useEffect, useRef, useState, lazy, Suspense } from 'react'
import { motion, useScroll, useTransform, useInView, AnimatePresence, useMotionValue, useSpring, type Variants } from 'framer-motion'
import './App.css'

// Lazy-load heavy 3D scenes to keep initial bundle lean
const HeroScene    = lazy(() => import('./Scene3D').then(m => ({ default: m.HeroScene })))
const IslandScene  = lazy(() => import('./Scene3D').then(m => ({ default: m.IslandScene })))
const GlobeScene   = lazy(() => import('./Scene3D').then(m => ({ default: m.GlobeScene })))
const AccentSphere = lazy(() => import('./Scene3D').then(m => ({ default: m.AccentSphere })))

// Typed cubic-bezier easing — Framer Motion v12 requires the 4-tuple form
const EASE_CINEMATIC: [number, number, number, number] = [0.22, 1, 0.36, 1]

// ─── DATA ────────────────────────────────────────────────────────────────────

const NAV_LINKS = ['Experience', 'Rooms', 'Location', 'Gallery', 'Book']

const STATS = [
  { value: '9.2', sup: '/10', label: 'Booking.com Score' },
  { value: '10+', sup: '', label: 'Years of Hosting' },
  { value: '5min', sup: '', label: 'Walk to Town' },
  { value: '4–6', sup: '', label: 'Guests per Room' },
]

const ROOMS = [
  {
    tag: 'Most Popular',
    name: 'Ella Rock Suite',
    desc: 'Wake to a panoramic frame of Ella Rock directly from your private balcony. Double occupancy with king bed.',
    features: ['Private Balcony', 'Mountain View', 'Free Wi-Fi', 'En-suite Bath'],
    price: 'From $45/night',
    gradient: 'from-emerald-900/60 to-green-950/80',
    accent: '#d9ff78',
  },
  {
    tag: 'Family Retreat',
    name: 'Garden Family Room',
    desc: 'Spacious room for up to 6 guests surrounded by the lush homestay garden with private entrance.',
    features: ['Sleeps up to 6', 'Garden Access', 'Private Entrance', 'Shared Kitchen'],
    price: 'From $85/night',
    gradient: 'from-teal-900/60 to-emerald-950/80',
    accent: '#78ffd6',
  },
  {
    tag: 'Best Value',
    name: 'Triple Hill View',
    desc: 'Three guests, one breathtaking view. Generous layout with all the essentials for a memorable stay.',
    features: ['Sleeps 3', 'Hill Views', 'Daily Housekeeping', 'Breakfast Included'],
    price: 'From $60/night',
    gradient: 'from-green-900/60 to-teal-950/80',
    accent: '#a8ff78',
  },
]

const EXPERIENCES = [
  {
    icon: '🌅',
    time: 'Dawn',
    title: 'Balcony Sunrise',
    desc: 'Cool highland air, the first gold light spilling over Ella Rock, and a fresh breakfast laid out on your private balcony.',
    img: '/images/Balcony Sunrise.jfif',
  },
  {
    icon: '🍳',
    time: 'Morning',
    title: 'Legendary Breakfast',
    desc: 'Vegetarian, vegan, gluten-free pancakes, American, Asian — Udara\'s family cooks to your preference, every morning.',
    img: '/images/Legendary Breakfast.jfif',
  },
  {
    icon: '🚶',
    time: 'Afternoon',
    title: 'Nine Arch Bridge',
    desc: 'A 20-minute walk through lush jungle brings you to the iconic Demodara viaduct framed in green.',
    img: '/images/Nine Arch Bridge - Ella Sri Lanka.jfif',
  },
  {
    icon: '🏔️',
    time: 'Adventure',
    title: "Little Adam's Peak",
    desc: '45 minutes of easy trail with a summit panorama that changes the way you see the Sri Lankan highlands.',
    img: '/images/Wanderlust Sri Lanka - Mini Adams Peak Ella.jfif',
  },
  {
    icon: '🌿',
    time: 'Afternoon',
    title: 'Spice Garden Tour',
    desc: 'Walk through a living pantry of cinnamon, cardamom, and pepper just minutes from your door.',
    img: '/images/Spice Garden Tour.jfif',
  },
  {
    icon: '🌙',
    time: 'Evening',
    title: 'Golden Hour Views',
    desc: 'As the sky softens to amber, the Ella Gap becomes a canvas. Pour a tea and just be still.',
    img: '/images/Golden Hour Dreams ✨.jfif',
  },
]

const AMENITIES = [
  { icon: '🏡', label: 'Private Balconies' },
  { icon: '🚿', label: 'Private Bathrooms' },
  { icon: '📶', label: 'Free Wi-Fi' },
  { icon: '🌄', label: 'Mountain Views' },
  { icon: '🍽️', label: 'Breakfast Included' },
  { icon: '🌱', label: 'Garden Terrace' },
  { icon: '🔒', label: '24h Security' },
  { icon: '🚲', label: 'Bike Rental' },
  { icon: '🚗', label: 'Car Rental' },
  { icon: '🧹', label: 'Daily Housekeeping' },
  { icon: '👨‍👩‍👧', label: 'Family Friendly' },
  { icon: '🍃', label: 'Shared Kitchen' },
]

const TESTIMONIALS = [
  {
    name: 'Sarah M.',
    country: '🇬🇧 United Kingdom',
    rating: 10,
    text: 'The breakfast alone is worth the trip to Ella. Udara and his family made us feel like we were visiting relatives. The balcony view of Ella Rock left us speechless every single morning.',
  },
  {
    name: 'Thomas K.',
    country: '🇩🇪 Germany',
    rating: 10,
    text: 'Perfectly situated — quiet and peaceful, yet steps from everything. The room was immaculate, the views were cinematic, and the family hospitality was genuinely special.',
  },
  {
    name: 'Priya N.',
    country: '🇮🇳 India',
    rating: 9,
    text: 'The vegan breakfast options were outstanding. Sitting on that balcony with misty mountains in front of you while eating homemade pancakes — nothing beats it.',
  },
]

// ─── MOTION VARIANTS ─────────────────────────────────────────────────────────

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 40 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: EASE_CINEMATIC } },
}

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.9, ease: 'easeOut' as const } },
}

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.05 } },
}

const staggerFast: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
}

// ─── COMPONENTS ──────────────────────────────────────────────────────────────

function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animId: number
    let W = canvas.width = window.innerWidth
    let H = canvas.height = window.innerHeight

    const particles = Array.from({ length: 70 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 1.5 + 0.3,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -Math.random() * 0.25 - 0.05,
      alpha: Math.random() * 0.5 + 0.1,
    }))

    const resize = () => {
      W = canvas.width = window.innerWidth
      H = canvas.height = window.innerHeight
    }

    const draw = () => {
      ctx.clearRect(0, 0, W, H)
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        if (p.y < -5) { p.y = H + 5; p.x = Math.random() * W }
        if (p.x < -5) p.x = W + 5
        if (p.x > W + 5) p.x = -5
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(200, 255, 160, ${p.alpha})`
        ctx.fill()
      }
      animId = requestAnimationFrame(draw)
    }

    window.addEventListener('resize', resize)
    draw()
    return () => {
      cancelAnimationFrame(animId)
      window.removeEventListener('resize', resize)
    }
  }, [])

  return <canvas ref={canvasRef} className="particle-canvas" aria-hidden="true" tabIndex={-1} />
}

interface MagneticButtonProps {
  readonly children: React.ReactNode
  readonly className?: string
  readonly href?: string
  readonly target?: string
  readonly rel?: string
}

function MagneticButton({ children, className, href, target, rel }: MagneticButtonProps) {
  const ref = useRef<HTMLAnchorElement>(null)
  const x = useMotionValue(0)
  const y = useMotionValue(0)
  const sx = useSpring(x, { stiffness: 200, damping: 15 })
  const sy = useSpring(y, { stiffness: 200, damping: 15 })

  const handleMouse = (e: React.MouseEvent) => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const cx = rect.left + rect.width / 2
    const cy = rect.top + rect.height / 2
    x.set((e.clientX - cx) * 0.3)
    y.set((e.clientY - cy) * 0.3)
  }

  const handleLeave = () => { x.set(0); y.set(0) }

  return (
    <motion.a
      ref={ref}
      href={href}
      target={target}
      rel={rel}
      className={className}
      style={{ x: sx, y: sy }}
      onMouseMove={handleMouse}
      onMouseLeave={handleLeave}
      whileTap={{ scale: 0.96 }}
    >
      {children}
    </motion.a>
  )
}

function FloatingNav() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 60)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <motion.nav
      className={`floating-nav ${scrolled ? 'scrolled' : ''}`}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 0.2 }}
    >
      <div className="nav-inner">
        <a href="#" className="nav-brand">
          <span className="brand-icon">🌿</span>
          <span>Green Village</span>
        </a>

        <div className="nav-links-desktop">
          {NAV_LINKS.map((link) => (
            <motion.a
              key={link}
              href={`#${link.toLowerCase()}`}
              className={`nav-link ${link === 'Book' ? 'nav-link-cta' : ''}`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.96 }}
            >
              {link}
            </motion.a>
          ))}
        </div>

        <button className="nav-hamburger" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle menu">
          <span className={menuOpen ? 'open' : ''} />
          <span className={menuOpen ? 'open' : ''} />
          <span className={menuOpen ? 'open' : ''} />
        </button>
      </div>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="nav-mobile-menu"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            {NAV_LINKS.map((link) => (
              <a
                key={link}
                href={`#${link.toLowerCase()}`}
                className="nav-mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                {link}
              </a>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  )
}

function HeroSection() {
  const ref = useRef<HTMLElement>(null)
  const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end start'] })
  const y = useTransform(scrollYProgress, [0, 1], ['0%', '30%'])
  const opacity = useTransform(scrollYProgress, [0, 0.6], [1, 0])

  return (
    <section ref={ref} className="hero-section" id="hero">
      {/* Full 3D cinematic background */}
      <Suspense fallback={null}>
        <HeroScene />
      </Suspense>

      <ParticleField />

      {/* Cinematic background layers */}
      <div className="hero-bg-layers" aria-hidden="true">
        <motion.div className="hero-bg-gradient" style={{ y }} />
        <div className="hero-bg-mountain-silhouette" />
        <motion.div
          className="hero-orb hero-orb-1"
          animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="hero-orb hero-orb-2"
          animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
        />
        <motion.div
          className="hero-orb hero-orb-3"
          animate={{ scale: [1, 1.1, 1], opacity: [0.2, 0.45, 0.2] }}
          transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
        />
        <div className="hero-grain" />
      </div>

      <motion.div className="hero-content" style={{ opacity }}>
        <div className="hero-left">
          <motion.div variants={stagger} initial="hidden" animate="visible">

            <motion.div className="hero-eyebrow" variants={fadeUp}>
              <span className="eyebrow-dot" />
              <span>Ella, Sri Lanka · Since 2014</span>
              <span className="eyebrow-badge">9.2 on Booking.com</span>
            </motion.div>

            <motion.h1 className="hero-headline" variants={fadeUp}>
              <span className="headline-line-1">Where the Hills</span>
              <span className="headline-line-2">Become</span>
              <span className="headline-line-3">
                Home<span className="headline-dot">.</span>
              </span>
            </motion.h1>

            <motion.p className="hero-subtext" variants={fadeUp}>
              A family-run homestay above the clouds of Ella — with private balconies
              overlooking Ella Rock, legendary homemade breakfasts, and a host family
              whose warmth you'll feel the moment you arrive.
            </motion.p>

            <motion.div className="hero-pills" variants={staggerFast}>
              {['Mountain Balconies', 'Homemade Breakfast', '5min to Town', 'Family Run'].map((pill) => (
                <motion.span key={pill} className="hero-pill" variants={fadeUp}>
                  {pill}
                </motion.span>
              ))}
            </motion.div>

            <motion.div className="hero-actions" variants={fadeUp}>
              <MagneticButton
                className="btn-primary"
                href="https://www.booking.com/hotel/lk/green-village.html"
                target="_blank"
                rel="noreferrer"
              >
                <span>Book Your Stay</span>
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                  <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </MagneticButton>
              <MagneticButton className="btn-ghost" href="#experience">
                <span>Explore the Stay</span>
              </MagneticButton>
            </motion.div>

          </motion.div>
        </div>

        <motion.div
          className="hero-right"
          initial={{ opacity: 0, x: 60, scale: 0.95 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 1.2, ease: EASE_CINEMATIC, delay: 0.5 }}
        >
          {/* Accent distort sphere above scene card */}
          <Suspense fallback={null}>
            <AccentSphere className="hero-accent-sphere" />
          </Suspense>
          <SceneCard />
        </motion.div>
      </motion.div>

      {/* Stats bar */}
      <motion.div
        className="hero-stats-bar"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1], delay: 1.1 }}
      >
        {STATS.map((s, i) => (
          <div key={s.label} className="hero-stat">
            <strong>
              {s.value}<sup>{s.sup}</sup>
            </strong>
            <span>{s.label}</span>
            {i < STATS.length - 1 && <div className="stat-divider" />}
          </div>
        ))}
      </motion.div>

      <motion.div
        className="hero-scroll-cue"
        animate={{ y: [0, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
      >
        <div className="scroll-cue-line" />
        <span>Scroll</span>
      </motion.div>
    </section>
  )
}

function SceneCard() {
  const imgRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  const imgY = useTransform(scrollYProgress, [0, 0.5], ['0%', '8%'])

  return (
    <div className="scene-card">
      {/* Header bar */}
      <div className="scene-header">
        <div className="scene-header-left">
          <div className="scene-status-dot" />
          <span>Live atmosphere</span>
        </div>
        <span className="scene-location-tag">Temple Rd, Ella</span>
      </div>

      {/* Hero image with parallax + cinematic overlays */}
      <div className="scene-viewport" ref={imgRef}>

        {/* Parallax image */}
        <motion.div className="scene-img-parallax" style={{ y: imgY }}>
          <img
            src="/images/landing.jpg"
            alt="Green Village Homestay — Ella Rock view, Sri Lanka"
            className="scene-hero-img"
          />
        </motion.div>

        {/* Layered cinematic overlays */}
        <div className="scene-overlay-vignette" />
        <div className="scene-overlay-bottom" />
        <div className="scene-overlay-top" />

        {/* Subtle shimmer sweep */}
        <motion.div
          className="scene-shimmer"
          animate={{ x: ['-100%', '200%'] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'linear', repeatDelay: 5 }}
        />

        {/* Corner frame brackets */}
        <div className="scene-viewport-corner scene-viewport-corner-tl" />
        <div className="scene-viewport-corner scene-viewport-corner-tr" />
        <div className="scene-viewport-corner scene-viewport-corner-bl" />
        <div className="scene-viewport-corner scene-viewport-corner-br" />

        {/* Location label */}
        <motion.div
          className="scene-viewport-label"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.7, ease: EASE_CINEMATIC }}
        >
          <span>📍</span>
          <span>Ella Rock, Sri Lanka</span>
        </motion.div>
      </div>

      {/* Footer */}
      <div className="scene-footer">
        <div className="scene-footer-item">
          <span className="scene-footer-label">Property</span>
          <strong>Green Village Homestay</strong>
        </div>
        <div className="scene-footer-divider" />
        <div className="scene-footer-item">
          <span className="scene-footer-label">Elevation</span>
          <strong>~1,000m above sea level</strong>
        </div>
      </div>

      {/* Floating badges */}
      <motion.div
        className="scene-badge badge-rating"
        initial={{ opacity: 0, scale: 0.8, x: -10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 1.4, duration: 0.7, ease: EASE_CINEMATIC }}
      >
        <span className="badge-star">★</span>
        <div>
          <strong>9.2 / 10</strong>
          <span>Booking.com</span>
        </div>
      </motion.div>

      <motion.div
        className="scene-badge badge-breakfast"
        initial={{ opacity: 0, scale: 0.8, x: 10 }}
        animate={{ opacity: 1, scale: 1, x: 0 }}
        transition={{ delay: 1.7, duration: 0.7, ease: EASE_CINEMATIC }}
      >
        <span>🍳</span>
        <div>
          <strong>Breakfast Included</strong>
          <span>On your balcony</span>
        </div>
      </motion.div>
    </div>
  )
}

function ExperienceSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="experience-section" id="experience" ref={ref}>
      {/* 3D floating island in background */}
      <Suspense fallback={null}>
        <IslandScene />
      </Suspense>
      <div className="section-container">
        <motion.div
          className="section-header"
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <motion.span className="section-eyebrow" variants={fadeUp}>The Experience</motion.span>
          <motion.h2 className="section-title" variants={fadeUp}>
            A day shaped by light,<br />mist, and mountains.
          </motion.h2>
          <motion.p className="section-subtitle" variants={fadeUp}>
            From the first gold of sunrise on your balcony to the amber glow of evening across Ella Gap — every hour here is worth savouring.
          </motion.p>
        </motion.div>

        <motion.div
          className="experience-grid"
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {EXPERIENCES.map((exp, i) => (
            <motion.article
              key={exp.title}
              className="exp-card"
              variants={fadeUp}
              whileHover="hover"
              initial="rest"
              animate="rest"
            >
              {/* Image layer — reveals on hover */}
              <motion.div
                className="exp-card-img"
                variants={{
                  rest:  { opacity: 0, scale: 1.08 },
                  hover: { opacity: 1,  scale: 1 },
                }}
                transition={{ duration: 0.55, ease: EASE_CINEMATIC }}
              >
                <img src={exp.img} alt={exp.title} loading="lazy" />
                <div className="exp-card-img-vignette" />
              </motion.div>

              {/* Content */}
              <div className="exp-card-content">
                <div className="exp-card-icon">{exp.icon}</div>
                <div className="exp-card-meta">
                  <span className="exp-time">{exp.time}</span>
                </div>
                <motion.h3
                  className="exp-card-title"
                  variants={{
                    rest:  { y: 0 },
                    hover: { y: -4 },
                  }}
                  transition={{ duration: 0.4, ease: EASE_CINEMATIC }}
                >
                  {exp.title}
                </motion.h3>
                <motion.p
                  className="exp-card-desc"
                  variants={{
                    rest:  { opacity: 1, y: 0 },
                    hover: { opacity: 0.9, y: -2 },
                  }}
                  transition={{ duration: 0.4, ease: EASE_CINEMATIC }}
                >
                  {exp.desc}
                </motion.p>
              </div>

              <div className="exp-card-number">0{i + 1}</div>

              {/* Accent line that slides in on hover */}
              <motion.div
                className="exp-card-accent-line"
                variants={{
                  rest:  { scaleX: 0, originX: 0 },
                  hover: { scaleX: 1, originX: 0 },
                }}
                transition={{ duration: 0.45, ease: EASE_CINEMATIC }}
              />
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function RoomsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="rooms-section" id="rooms" ref={ref}>
      <div className="section-container">
        <motion.div
          className="section-header"
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <motion.span className="section-eyebrow" variants={fadeUp}>Rooms & Suites</motion.span>
          <motion.h2 className="section-title" variants={fadeUp}>
            Every room opens<br />to the view.
          </motion.h2>
        </motion.div>

        <motion.div
          className="rooms-grid"
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {ROOMS.map((room, i) => (
            <motion.article
              key={room.name}
              className={`room-card ${i === 0 ? 'room-card-featured' : ''}`}
              variants={fadeUp}
              whileHover={{ y: -8, transition: { duration: 0.3 } }}
            >
              <div className="room-card-visual">
                <div className="room-landscape">
                  <div className="room-sky" />
                  <div className="room-mountain-1" />
                  <div className="room-mountain-2" />
                  <div className="room-balcony" />
                  <motion.div
                    className="room-mist"
                    animate={{ opacity: [0.3, 0.7, 0.3], x: [0, 20, 0] }}
                    transition={{ duration: 8 + i * 2, repeat: Infinity, ease: 'easeInOut' }}
                  />
                </div>
                <span className="room-tag">{room.tag}</span>
              </div>
              <div className="room-card-body">
                <h3 className="room-name">{room.name}</h3>
                <p className="room-desc">{room.desc}</p>
                <ul className="room-features">
                  {room.features.map((f) => (
                    <li key={f}>
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M2.5 7l3 3 6-6" stroke="#d9ff78" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <div className="room-footer">
                  <strong className="room-price">{room.price}</strong>
                  <a
                    className="room-book-btn"
                    href="https://www.booking.com/hotel/lk/green-village.html"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Book Now
                  </a>
                </div>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function AmenitiesSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="amenities-section" ref={ref}>
      <div className="section-container">
        <motion.div
          className="section-header"
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <motion.span className="section-eyebrow" variants={fadeUp}>Everything you need</motion.span>
          <motion.h2 className="section-title" variants={fadeUp}>
            Comfort taken care of.
          </motion.h2>
        </motion.div>

        <motion.div
          className="amenities-grid"
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          {AMENITIES.map((a) => (
            <motion.div
              key={a.label}
              className="amenity-chip"
              variants={fadeUp}
              whileHover={{ scale: 1.07, borderColor: 'rgba(217,255,120,0.4)' }}
            >
              <span className="amenity-icon">{a.icon}</span>
              <span>{a.label}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}

function LocationSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  const landmarks = [
    { name: 'Ella Town Center', dist: '5 min walk', dir: 'S' },
    { name: 'Ella Railway Station', dist: '5 min walk', dir: 'S' },
    { name: "Little Adam's Peak", dist: '1.4 miles', dir: 'E' },
    { name: 'Nine Arch Bridge', dist: '3.7 miles', dir: 'W' },
    { name: 'Ella Spice Garden', dist: 'Nearby', dir: 'N' },
    { name: 'Ella Rock Trail', dist: '0.8 miles', dir: 'SE' },
  ]

  return (
    <section className="location-section" id="location" ref={ref}>
      <div className="section-container">
        <motion.div
          className="location-inner"
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <div className="location-copy">
            <motion.span className="section-eyebrow" variants={fadeUp}>Location</motion.span>
            <motion.h2 className="section-title" variants={fadeUp}>
              Tucked away,<br />yet central to it all.
            </motion.h2>
            <motion.p className="section-subtitle" variants={fadeUp}>
              Situated on Temple Road, Beera Ella Pathana — just far enough from the noise, 
              close enough to everything that matters.
            </motion.p>

            <motion.div className="location-address" variants={fadeUp}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path d="M9 1.5C6.5 1.5 4.5 3.5 4.5 6c0 3.75 4.5 10.5 4.5 10.5S13.5 9.75 13.5 6c0-2.5-2-4.5-4.5-4.5z" stroke="#d9ff78" strokeWidth="1.5" />
                <circle cx="9" cy="6" r="1.5" stroke="#d9ff78" strokeWidth="1.5" />
              </svg>
              <span>Temple Road, Beera Ella Pathana, Ella, Sri Lanka</span>
            </motion.div>

            <motion.div className="landmarks-list" variants={stagger}>
              {landmarks.map((lm) => (
                <motion.div key={lm.name} className="landmark-item" variants={fadeUp}>
                  <div className="landmark-dir">{lm.dir}</div>
                  <div className="landmark-info">
                    <strong>{lm.name}</strong>
                    <span>{lm.dist}</span>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>

          <motion.div className="location-map-visual" variants={fadeIn}>
            <div className="map-card">
              {/* Real Google Maps embed — exact coordinates 6.8712808975240875, 81.05042792655328 */}
              <div className="map-iframe-wrap">
                <iframe
                  title="Green Village Homestay location"
                  src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d495.8!2d81.05042792655328!3d6.8712808975240875!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x0%3A0x0!2zNsKwNTInMTYuNiJOIDgxwrAwMycwMS41IkU!5e1!3m2!1sen!2slk!4v1700000000000!5m2!1sen!2slk"
                  width="100%"
                  height="100%"
                  style={{ border: 0, display: 'block' }}
                  allowFullScreen
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              <div className="map-overlay-badge">
                <span className="map-pin-emoji">📍</span>
                <div>
                  <strong>Green Village Homestay</strong>
                  <span>Temple Rd, Beera Ella Pathana</span>
                </div>
                <a
                  className="map-directions-btn"
                  href="https://www.google.com/maps/dir/?api=1&destination=6.8712808975240875,81.05042792655328"
                  target="_blank"
                  rel="noreferrer"
                >
                  Directions →
                </a>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}

function TestimonialsSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })
  const [active, setActive] = useState(0)

  useEffect(() => {
    const id = setInterval(() => setActive((a) => (a + 1) % TESTIMONIALS.length), 5000)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="testimonials-section" ref={ref}>
      <div className="section-container">
        <motion.div
          className="section-header"
          variants={stagger}
          initial="hidden"
          animate={isInView ? 'visible' : 'hidden'}
        >
          <motion.span className="section-eyebrow" variants={fadeUp}>Guest Stories</motion.span>
          <motion.h2 className="section-title" variants={fadeUp}>
            What guests remember<br />long after they leave.
          </motion.h2>
        </motion.div>

        <div className="testimonials-showcase">
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              className="testimonial-featured"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="testimonial-quote-mark">"</div>
              <p className="testimonial-text">{TESTIMONIALS[active].text}</p>
              <div className="testimonial-author">
                <div className="testimonial-avatar">
                  {TESTIMONIALS[active].name.charAt(0)}
                </div>
                <div>
                  <strong>{TESTIMONIALS[active].name}</strong>
                  <span>{TESTIMONIALS[active].country}</span>
                </div>
                <div className="testimonial-rating">
                  {'★'.repeat(Math.floor(TESTIMONIALS[active].rating / 2))}
                  <span>{TESTIMONIALS[active].rating}/10</span>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="testimonial-dots">
          {TESTIMONIALS.map((t, i) => (
              <button
                key={t.name}
                className={`testimonial-dot ${i === active ? 'active' : ''}`}
                onClick={() => setActive(i)}
                aria-label={`View testimonial ${i + 1}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}

function CtaSection() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: '-80px' })

  return (
    <section className="cta-section" id="book" ref={ref}>
      {/* 3D globe in background */}
      <Suspense fallback={null}>
        <GlobeScene />
      </Suspense>
      <div className="section-container">
        <motion.div
          className="cta-card"
          initial={{ opacity: 0, y: 50, scale: 0.97 }}
          animate={isInView ? { opacity: 1, y: 0, scale: 1 } : {}}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        >
          {/* Animated bg orbs inside CTA */}
          <motion.div
            className="cta-orb cta-orb-1"
            animate={{ scale: [1, 1.3, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          />
          <motion.div
            className="cta-orb cta-orb-2"
            animate={{ scale: [1, 1.2, 1], opacity: [0.2, 0.5, 0.2] }}
            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 3 }}
          />

          <div className="cta-content">
            <div className="cta-left">
              <span className="section-eyebrow">Ready to escape?</span>
              <h2 className="cta-headline">
                Your Sri Lankan<br />highlands retreat awaits.
              </h2>
              <p className="cta-body">
                Rooms fill quickly during high season. Book directly on Booking.com to secure your spot at Green Village Homestay and wake up to Ella Rock.
              </p>
              <div className="cta-trust">
                <span>✓ Free cancellation available</span>
                <span>✓ Breakfast included</span>
                <span>✓ No booking fees</span>
              </div>
            </div>
            <div className="cta-right">
              <div className="cta-card-visual">
                <div className="cta-visual-sky" />
                <div className="cta-visual-mountain" />
                <div className="cta-visual-house" />
                <motion.div
                  className="cta-visual-glow"
                  animate={{ opacity: [0.4, 0.9, 0.4] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                />
              </div>
              <div className="cta-actions">
                <MagneticButton
                  className="btn-primary btn-large"
                  href="https://www.booking.com/hotel/lk/green-village.html"
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>Book on Booking.com</span>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                    <path d="M3.5 9h11M10 5l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </MagneticButton>
                <p className="cta-disclaimer">
                  Rated <strong>9.2/10</strong> on Booking.com · Operating since 2014
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div className="footer-brand">
          <span className="footer-logo">🌿 Green Village Homestay</span>
          <p>Temple Road, Beera Ella Pathana, Ella, Sri Lanka</p>
        </div>
        <div className="footer-links">
          {['Experience', 'Rooms', 'Location', 'Book Now'].map((l) => (
            <a key={l} href={`#${l.toLowerCase().replace(' ', '')}`}>{l}</a>
          ))}
        </div>
        <p className="footer-copy">© {new Date().getFullYear()} Green Village Homestay · Ella, Sri Lanka</p>
      </div>
    </footer>
  )
}

// ─── APP ──────────────────────────────────────────────────────────────────────

export default function App() {
  return (
    <>
      <FloatingNav />
      <main>
        <HeroSection />
        <ExperienceSection />
        <RoomsSection />
        <AmenitiesSection />
        <LocationSection />
        <TestimonialsSection />
        <CtaSection />
      </main>
      <Footer />
    </>
  )
}
