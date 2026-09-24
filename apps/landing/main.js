/* FLEET OS landing — GSAP + ScrollTrigger + Lenis */
(() => {
  const hasGsap = typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined'
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const $ = (s, root = document) => root.querySelector(s)
  const $$ = (s, root = document) => Array.from(root.querySelectorAll(s))

  if (!hasGsap) {
    $('#loader')?.remove()
    $$('.reveal-up, .booking, .split .char, .dest').forEach((el) => {
      el.style.opacity = 1
      el.style.transform = 'none'
      el.style.clipPath = 'none'
    })
    return
  }

  gsap.registerPlugin(ScrollTrigger)

  /* ---------- Smooth scroll (Lenis) ---------- */
  let lenis = null
  if (typeof Lenis !== 'undefined' && !reduced) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true })
    lenis.on('scroll', ScrollTrigger.update)
    gsap.ticker.add((t) => lenis.raf(t * 1000))
    gsap.ticker.lagSmoothing(0)
  }
  const scrollTo = (target) => {
    if (lenis) lenis.scrollTo(target, { offset: -20, duration: 1.4 })
    else target.scrollIntoView({ behavior: 'smooth' })
  }
  $$('a[href^="#"]').forEach((a) => {
    a.addEventListener('click', (e) => {
      const id = a.getAttribute('href')
      const target = id === '#top' ? document.body : $(id)
      if (!target) return
      e.preventDefault()
      closeMenu()
      scrollTo(target)
    })
  })

  /* ---------- Split text ---------- */
  const splitChars = (el) => {
    const text = el.textContent
    el.textContent = ''
    el.setAttribute('aria-label', text)
    Array.from(text).forEach((ch) => {
      const s = document.createElement('span')
      s.className = 'char'
      s.textContent = ch === ' ' ? '\u00a0' : ch
      s.setAttribute('aria-hidden', 'true')
      el.appendChild(s)
    })
    return $$('.char', el)
  }
  const heroChars = $$('.hero__title [data-split]').flatMap(splitChars)
  const paintGradient = () => {
    const line = $('.hero__title-accent')
    if (!line) return
    const w = line.offsetWidth
    $$('.char', line).forEach((c) => {
      c.style.backgroundSize = `${w}px 100%`
      c.style.backgroundPosition = `-${c.offsetLeft}px 0`
    })
  }
  paintGradient()
  window.addEventListener('resize', paintGradient)

  /* ---------- Preloader → hero intro ---------- */
  const intro = gsap.timeline({ paused: true })
  intro
    .to('#heroImg', { scale: 1, duration: 2.4, ease: 'power3.out' }, 0)
    .to(heroChars, { y: 0, opacity: 1, duration: 1.1, ease: 'power4.out', stagger: 0.025 }, 0.1)
    .to('.hero__eyebrow', { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0.2)
    .to('.hero__ai', { y: 0, opacity: 1, duration: 0.9, ease: 'power3.out' }, 0.55)
    .to('.booking', { y: 0, opacity: 1, duration: 1.2, ease: 'power4.out' }, 0.7)
    .fromTo(
      '#plane',
      { x: 0, y: 40, opacity: 0 },
      { x: '110vw', y: -140, opacity: 1, duration: 4, ease: 'power1.inOut' },
      0.4,
    )
    .to('#plane', { opacity: 0, duration: 0.6 }, 3.8)

  const loader = $('#loader')
  const runLoader = () => {
    if (!loader) return intro.play()
    if (lenis) lenis.stop()
    const counter = { v: 0 }
    const tl = gsap.timeline({
      onComplete: () => {
        loader.remove()
        if (lenis) lenis.start()
      },
    })
    tl.to(counter, {
      v: 100,
      duration: 1.6,
      ease: 'power2.inOut',
      onUpdate: () => {
        $('#loaderCount').textContent = Math.round(counter.v)
        $('#loaderBar').style.width = counter.v + '%'
      },
    })
      .to('.loader__inner', { opacity: 0, y: -20, duration: 0.4, ease: 'power2.in' })
      .to('.loader__curtain--a', { yPercent: -100, duration: 0.9, ease: 'power4.inOut' }, '-=0.1')
      .to('.loader__curtain--b', { yPercent: 100, duration: 0.9, ease: 'power4.inOut' }, '<')
      .add(() => intro.play(), '-=0.7')
  }
  if (reduced) {
    loader?.remove()
    intro.progress(1)
  } else {
    window.addEventListener('load', runLoader, { once: true })
    setTimeout(() => {
      if (document.body.contains(loader) && !intro.isActive() && intro.progress() === 0) runLoader()
    }, 3500)
  }

  /* ---------- Nav state, progress ---------- */
  const nav = $('#nav')
  ScrollTrigger.create({
    start: 60,
    onUpdate: (self) => nav.classList.toggle('is-scrolled', self.scroll() > 60),
  })
  gsap.to('#progress', {
    scaleX: 1,
    ease: 'none',
    scrollTrigger: { start: 0, end: 'max', scrub: 0.3 },
  })

  const sections = ['#top', '#booking', '#live', '#services', '#explore', '#enterprise', '#offers', '#about']
  const menuLinks = $$('.nav__menu a')
  $$('main section[id]').forEach((sec) => {
    ScrollTrigger.create({
      trigger: sec,
      start: 'top 45%',
      end: 'bottom 45%',
      onToggle: (self) => {
        if (!self.isActive) return
        const id = '#' + sec.id
        const key = id === '#hero' ? '#top' : id === '#showcase' ? '#about' : id
        if (!sections.includes(key)) return
        menuLinks.forEach((l) => l.classList.toggle('is-active', l.getAttribute('href') === key))
      },
    })
  })

  /* ---------- Mobile menu ---------- */
  const burger = $('#burger')
  const menu = $('#menu')
  $$('.menu__list a').forEach((a, i) => a.style.setProperty('--i', i))
  const closeMenu = () => {
    burger.classList.remove('is-open')
    burger.setAttribute('aria-expanded', 'false')
    menu.classList.remove('is-open')
    menu.setAttribute('aria-hidden', 'true')
    if (lenis) lenis.start()
  }
  burger.addEventListener('click', () => {
    const open = !menu.classList.contains('is-open')
    if (!open) return closeMenu()
    burger.classList.add('is-open')
    burger.setAttribute('aria-expanded', 'true')
    menu.classList.add('is-open')
    menu.setAttribute('aria-hidden', 'false')
    if (lenis) lenis.stop()
  })

  /* ---------- Hero parallax on scroll ---------- */
  gsap.to('#heroImg', {
    yPercent: 18,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: 'bottom top', scrub: true },
  })
  gsap.to('.hero__content', {
    yPercent: -25,
    opacity: 0,
    ease: 'none',
    scrollTrigger: { trigger: '#hero', start: 'top top', end: '70% top', scrub: true },
  })

  /* ---------- Booking tabs ---------- */
  const tabs = $$('.booking__tab')
  const indicator = $('#tabIndicator')
  const tabsWrap = $('.booking__tabs')
  const placeholders = {
    airport: ['桃園國際機場 (TPE)', '台北市區', '上車地點', '下車地點'],
    p2p: ['台北車站', '信義區 台北 101', '上車地點', '下車地點'],
    charter: ['台北市區', '九份 · 日月潭', '出發地點', '目的地 / 路線'],
    rental: ['桃園國際機場 (TPE)', '高雄小港機場 (KHH)', '取車地點', '還車地點'],
    multi: ['台北', '台中 → 高雄', '起點城市', '途經 / 終點城市'],
  }
  const moveIndicator = (tab) => {
    indicator.style.width = tab.offsetWidth + 'px'
    indicator.style.transform = `translateX(${tab.offsetLeft - 6}px)`
  }
  const setTab = (tab) => {
    tabs.forEach((t) => t.classList.toggle('is-active', t === tab))
    moveIndicator(tab)
    const [pick, drop, l1, l2] = placeholders[tab.dataset.tab]
    const pickup = $('#pickup')
    const dropoff = $('#dropoff')
    gsap.fromTo(
      '.booking__form .field',
      { y: 10, opacity: 0.4 },
      { y: 0, opacity: 1, duration: 0.5, stagger: 0.05, ease: 'power3.out' },
    )
    pickup.value = pick
    dropoff.value = drop
    pickup.previousElementSibling.textContent = l1
    dropoff.previousElementSibling.textContent = l2
  }
  tabs.forEach((t) => t.addEventListener('click', () => setTab(t)))
  requestAnimationFrame(() => moveIndicator(tabs[0]))
  window.addEventListener('resize', () => moveIndicator($('.booking__tab.is-active')))
  tabsWrap.addEventListener('scroll', () => moveIndicator($('.booking__tab.is-active')))

  $('#swapBtn').addEventListener('click', () => {
    const a = $('#pickup')
    const b = $('#dropoff')
    ;[a.value, b.value] = [b.value, a.value]
    gsap.fromTo([a, b], { x: (i) => (i ? 12 : -12), opacity: 0 }, { x: 0, opacity: 1, duration: 0.45, ease: 'power3.out' })
  })

  $$('[data-route]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const [from, to] = btn.dataset.route.split('|')
      $('#pickup').value = from
      $('#dropoff').value = to
      if (btn.closest('.dest')) {
        e.preventDefault()
        scrollTo($('#booking'))
      }
      gsap.fromTo('.booking', { boxShadow: '0 0 0 0 rgba(47,107,255,0.6)' }, { boxShadow: '0 0 0 24px rgba(47,107,255,0)', duration: 1.1, ease: 'power2.out' })
    })
  })

  $('#bookingForm').addEventListener('submit', (e) => {
    e.preventDefault()
    const btn = $('.booking__submit span')
    const original = btn.textContent
    btn.textContent = '搜尋中…'
    gsap.to('.booking__submit', { scale: 0.98, duration: 0.15, yoyo: true, repeat: 1 })
    setTimeout(() => (btn.textContent = original), 1400)
  })

  /* ---------- Marquee ---------- */
  const marquee = $('#marquee')
  const marqueeTween = gsap.to(marquee, { xPercent: -50, ease: 'none', duration: 30, repeat: -1 })
  ScrollTrigger.create({
    onUpdate: (self) => {
      const v = Math.max(1, Math.min(4, Math.abs(self.getVelocity()) / 400))
      gsap.to(marqueeTween, { timeScale: (self.direction || 1) * v, duration: 0.6, overwrite: true })
    },
  })

  /* ---------- Generic reveals ---------- */
  $$('.reveal-up').forEach((el) => {
    if (el.closest('.hero')) return
    gsap.to(el, {
      y: 0,
      opacity: 1,
      duration: 1.1,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 88%' },
    })
  })

  /* ---------- Manifesto word highlight ---------- */
  const manifesto = $('[data-words]')
  if (manifesto) {
    const words = manifesto.textContent.trim().split(/(\s+)/)
    manifesto.innerHTML = ''
    words.forEach((w) => {
      if (!w.trim()) return manifesto.appendChild(document.createTextNode(' '))
      Array.from(w).forEach((ch) => {
        const s = document.createElement('span')
        s.className = 'word'
        s.textContent = ch
        manifesto.appendChild(s)
      })
    })
    const spans = $$('.word', manifesto)
    ScrollTrigger.create({
      trigger: manifesto,
      start: 'top 75%',
      end: 'bottom 45%',
      scrub: true,
      onUpdate: (self) => {
        const n = Math.floor(self.progress * spans.length)
        spans.forEach((s, i) => s.classList.toggle('is-on', i <= n))
      },
    })
  }

  /* ---------- Pinned showcase ---------- */
  const showcase = gsap.timeline({
    scrollTrigger: { trigger: '.showcase', start: 'top top', end: 'bottom bottom', scrub: 0.6 },
  })
  showcase
    .to('#showcaseImg', { clipPath: 'inset(0% 0% 0% 0% round 0px)', scale: 1, duration: 1 }, 0)
    .to('#showcaseImg', { filter: 'brightness(0.35) saturate(0.6) contrast(1.1)', duration: 0.6 }, 0.4)
    .to('.showcase__title .line span', { y: 0, duration: 0.5, stagger: 0.12, ease: 'power3.out' }, 0.45)
    .to('.showcase__desc', { opacity: 1, y: 0, duration: 0.4 }, 0.7)
    .to('.showcase__chips .chip', { opacity: 1, duration: 0.3, stagger: 0.08 }, 0.85)
    .to('#showcaseImg', { yPercent: -6, duration: 0.6 }, 1)
  $$('[data-float]').forEach((chip, i) => {
    gsap.to(chip, { y: i % 2 ? 12 : -12, duration: 2.6 + i * 0.3, yoyo: true, repeat: -1, ease: 'sine.inOut' })
  })

  /* ---------- Horizontal services ---------- */
  const track = $('#servicesTrack')
  const getScroll = () => track.scrollWidth - window.innerWidth + 24
  const servicesTween = gsap.to(track, {
    x: () => -getScroll(),
    ease: 'none',
    scrollTrigger: {
      trigger: '.services__pin',
      start: 'top top',
      end: () => '+=' + getScroll(),
      pin: true,
      scrub: 0.5,
      invalidateOnRefresh: true,
      anticipatePin: 1,
    },
  })
  $$('.svc').forEach((card) => {
    gsap.fromTo(
      card,
      { y: 80, opacity: 0, rotate: 2 },
      {
        y: 0,
        opacity: 1,
        rotate: 0,
        duration: 1,
        ease: 'power3.out',
        scrollTrigger: { trigger: card, containerAnimation: servicesTween, start: 'left 95%' },
      },
    )
  })

  /* ---------- Counters ---------- */
  $$('[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count)
    const decimals = parseInt(el.dataset.decimals || '0', 10)
    const obj = { v: 0 }
    gsap.to(obj, {
      v: end,
      duration: 2,
      ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' },
      onUpdate: () => (el.textContent = obj.v.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })),
    })
  })

  /* ---------- Explore: clip reveal + parallax ---------- */
  $$('.dest').forEach((card, i) => {
    gsap.to(card, {
      clipPath: 'inset(0 0 0% 0)',
      duration: 1.2,
      ease: 'power4.out',
      delay: (i % 3) * 0.08,
      scrollTrigger: { trigger: card, start: 'top 90%' },
    })
    const img = $('img', card)
    gsap.fromTo(
      img,
      { yPercent: -14 },
      { yPercent: 0, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } },
    )
  })

  /* ---------- Offers spotlight ---------- */
  $$('.offer').forEach((card) => {
    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect()
      card.style.setProperty('--mx', e.clientX - r.left + 'px')
      card.style.setProperty('--my', e.clientY - r.top + 'px')
    })
  })

  /* ---------- CTA split ---------- */
  const ctaChars = splitChars($('.cta__title'))
  gsap.to(ctaChars, {
    y: 0,
    opacity: 1,
    duration: 1,
    stagger: 0.04,
    ease: 'power4.out',
    scrollTrigger: { trigger: '.cta', start: 'top 75%' },
  })

  /* ---------- Magnetic buttons ---------- */
  if (window.matchMedia('(hover: hover)').matches) {
    $$('.magnetic').forEach((btn) => {
      btn.addEventListener('pointermove', (e) => {
        const r = btn.getBoundingClientRect()
        const x = e.clientX - r.left - r.width / 2
        const y = e.clientY - r.top - r.height / 2
        gsap.to(btn, { x: x * 0.25, y: y * 0.35, duration: 0.5, ease: 'power3.out' })
      })
      btn.addEventListener('pointerleave', () => gsap.to(btn, { x: 0, y: 0, duration: 0.8, ease: 'elastic.out(1, 0.4)' }))
    })

    /* ---------- Cursor ---------- */
    const cursor = $('#cursor')
    const label = $('#cursorLabel')
    const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 }
    const cur = { ...pos }
    window.addEventListener('pointermove', (e) => {
      pos.x = e.clientX
      pos.y = e.clientY
    })
    gsap.ticker.add(() => {
      cur.x += (pos.x - cur.x) * 0.2
      cur.y += (pos.y - cur.y) * 0.2
      cursor.style.transform = `translate(${cur.x}px, ${cur.y}px) translate(-50%, -50%)`
    })
    const labels = { view: 'VIEW', drag: 'SCROLL' }
    document.addEventListener('pointerover', (e) => {
      const t = e.target.closest('[data-cursor]')
      if (!t) return
      const mode = t.dataset.cursor
      cursor.classList.toggle('is-hover', mode === 'hover')
      cursor.classList.toggle('is-label', mode !== 'hover')
      label.textContent = labels[mode] || ''
    })
    document.addEventListener('pointerout', (e) => {
      if (e.target.closest('[data-cursor]') && !e.relatedTarget?.closest('[data-cursor]')) {
        cursor.classList.remove('is-hover', 'is-label')
      }
    })
  } else {
    $('#cursor')?.remove()
  }

  window.addEventListener('load', () => ScrollTrigger.refresh())
})()
