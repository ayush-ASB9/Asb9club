import { FormEvent, useEffect, useRef, useState } from 'react'

const paths = [
  { id: 'build', label: 'I build', find: 'A sharper problem', detail: 'Prototype in public. Find the person who sees the edge you missed.' },
  { id: 'study', label: 'I research', find: 'A way into practice', detail: 'Bring rigor to unfinished questions—and test them beyond the page.' },
  { id: 'gather', label: 'I convene', find: 'Unlikely collaborators', detail: 'Create the room where technical, cultural and commercial instincts collide.' },
  { id: 'question', label: 'I question', find: 'People who answer by making', detail: 'Pressure-test assumptions with peers who turn conversation into evidence.' },
]

const nodes = [
  { x: 15, y: 55, label: 'Systems', copy: 'How might the underlying structure change?' },
  { x: 30, y: 22, label: 'Tools', copy: 'Small instruments that expand what a person can do.' },
  { x: 49, y: 51, label: 'Research', copy: 'Questions made tangible, observable and useful.' },
  { x: 67, y: 20, label: 'Culture', copy: 'The context that decides what technology becomes.' },
  { x: 84, y: 58, label: 'Ventures', copy: 'Durable answers to consequential problems.' },
  { x: 61, y: 82, label: 'Experiments', copy: 'Fast, honest ways to learn what is real.' },
  { x: 33, y: 84, label: 'People', copy: 'Distinct minds, generous with their attention.' },
]

function Mark({ small = false }: { small?: boolean }) {
  return (
    <svg className={small ? 'mark mark--small' : 'mark'} viewBox="0 0 160 190" role="img" aria-label="ASB9 ace mark">
      <path d="M80 5C66 33 29 58 21 88c-7 26 11 46 34 42 7-1 13-5 18-10-2 20-10 38-24 54h62c-14-16-22-34-24-54 5 5 11 9 18 10 23 4 41-16 34-42C131 58 94 33 80 5Z" />
      <path className="mark-cut" d="M80 45v78M57 89h46" />
      <text x="80" y="102">9</text>
    </svg>
  )
}

function App() {
  const [activePath, setActivePath] = useState(0)
  const [activeNode, setActiveNode] = useState(2)
  const [cursor, setCursor] = useState({ x: -40, y: -40, active: false })
  const [submitted, setSubmitted] = useState(false)
  const [hold, setHold] = useState(0)
  const holdTimer = useRef<number | null>(null)

  useEffect(() => {
    const move = (event: PointerEvent) => setCursor((c) => ({ ...c, x: event.clientX, y: event.clientY }))
    const over = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      setCursor((c) => ({ ...c, active: !!target.closest('button, a, input, textarea') }))
    }
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerover', over)
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((entry) => entry.isIntersecting && entry.target.classList.add('is-visible')),
      { threshold: 0.14 },
    )
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el))
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerover', over)
      observer.disconnect()
    }
  }, [])

  const beginHold = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      document.querySelector('#apply')?.scrollIntoView()
      return
    }
    const started = Date.now()
    holdTimer.current = window.setInterval(() => {
      const next = Math.min(100, ((Date.now() - started) / 900) * 100)
      setHold(next)
      if (next === 100) {
        if (holdTimer.current) window.clearInterval(holdTimer.current)
        document.querySelector('#apply')?.scrollIntoView({ behavior: 'smooth' })
        window.setTimeout(() => setHold(0), 500)
      }
    }, 16)
  }

  const endHold = () => {
    if (holdTimer.current) window.clearInterval(holdTimer.current)
    holdTimer.current = null
    if (hold < 100) setHold(0)
  }

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSubmitted(true)
  }

  return (
    <main>
      <div className={`cursor ${cursor.active ? 'cursor--active' : ''}`} style={{ transform: `translate3d(${cursor.x}px,${cursor.y}px,0)` }} />
      <header className="nav">
        <a className="wordmark" href="#top" aria-label="ASB9 Club home"><Mark small /> ASB9 <span>/ CLUB</span></a>
        <nav aria-label="Main navigation">
          <a href="#ethos">Ethos</a><a href="#network">Network</a><a href="#apply">Apply</a>
        </nav>
      </header>

      <section className="hero" id="top">
        <p className="eyebrow hero-index">Private signal · Public ambition</p>
        <div className="hero-mark"><Mark /></div>
        <h1><span>For the ones</span><span>already in motion.</span></h1>
        <p className="hero-copy">A selective club for young builders, founders, developers and researchers who would rather make the future than predict it.</p>
        <a className="scroll-cue" href="#ethos"><span>Enter the club</span><i /></a>
      </section>

      <section className="manifesto" id="ethos">
        <p className="eyebrow reveal">01 / The premise</p>
        <p className="manifesto-line reveal">ASB9 isn't about<br />collecting <em>connections.</em></p>
        <p className="manifesto-line manifesto-line--right reveal">It's about what happens<br />when the <em>right people</em><br />find each other.</p>
        <aside className="margin-note reveal">No audience.<br />No passive membership.<br />No prescribed path.</aside>
      </section>

      <section className="discovery">
        <div className="section-head reveal">
          <p className="eyebrow">02 / Find your position</p>
          <p>Contribution is the price of admission.<br />Curiosity is the only uniform.</p>
        </div>
        <div className="discovery-grid reveal">
          <div className="path-list" role="tablist" aria-label="Choose how you contribute">
            {paths.map((path, index) => (
              <button key={path.id} role="tab" aria-selected={activePath === index} onClick={() => setActivePath(index)}>
                <span>0{index + 1}</span>{path.label}<b>↗</b>
              </button>
            ))}
          </div>
          <div className="path-result" role="tabpanel" aria-live="polite">
            <p>You may find</p>
            <h2>{paths[activePath].find}</h2>
            <p>{paths[activePath].detail}</p>
            <span>ASB9 / POSITION {activePath + 1}</span>
          </div>
        </div>
      </section>

      <section className="network" id="network">
        <div className="section-head reveal">
          <p className="eyebrow">03 / The field</p>
          <p>Not a directory. A live surface for collisions.</p>
        </div>
        <div className="network-stage reveal">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
            {nodes.slice(0, -1).map((node, i) => {
              const next = nodes[(i + 2) % nodes.length]
              return <line key={node.label} x1={node.x} y1={node.y} x2={next.x} y2={next.y} />
            })}
          </svg>
          {nodes.map((node, index) => (
            <button
              key={node.label}
              className={`node ${activeNode === index ? 'node--active' : ''}`}
              style={{ left: `${node.x}%`, top: `${node.y}%` }}
              onMouseEnter={() => setActiveNode(index)}
              onFocus={() => setActiveNode(index)}
              onClick={() => setActiveNode(index)}
              aria-label={`Explore ${node.label}`}
            ><i /><span>{node.label}</span></button>
          ))}
          <div className="node-detail">
            <span>0{activeNode + 1}</span>
            <h2>{nodes[activeNode].label}</h2>
            <p>{nodes[activeNode].copy}</p>
          </div>
        </div>
      </section>

      <section className="selection">
        <p className="eyebrow reveal">04 / Selection</p>
        <h2 className="reveal">Signal recognizes<br /><em>signal.</em></h2>
        <div className="selection-list reveal">
          <article><span>01</span><h3>Show your work</h3><p>Finished or not. We care about momentum, judgment and the questions pulling you forward.</p></article>
          <article><span>02</span><h3>Meet a member</h3><p>A conversation, not an interview. We look for generosity, intensity and something distinct.</p></article>
          <article><span>03</span><h3>Enter with intent</h3><p>Arrive ready to offer a perspective, a problem, a skill—or the first move on something new.</p></article>
        </div>
      </section>

      <section className="apply" id="apply">
        <div className="apply-intro reveal">
          <p className="eyebrow">05 / Knock</p>
          <h2>The door is<br /><em>not hidden.</em></h2>
          <p>It simply asks that you arrive as yourself. Tell us what has your attention and what you want to make possible.</p>
        </div>
        {submitted ? (
          <div className="success" role="status"><Mark small /><h2>Signal received.</h2><p>Thank you. Your note is ready for review.</p></div>
        ) : (
          <form className="application-form reveal" onSubmit={submit}>
            <label><span>Your name</span><input required name="name" autoComplete="name" placeholder="First and last" /></label>
            <label><span>Your email</span><input required type="email" name="email" autoComplete="email" placeholder="you@somewhere.com" /></label>
            <label className="wide"><span>What are you working on—or unable to stop thinking about?</span><textarea required name="signal" rows={3} placeholder="Tell us plainly. Links are welcome." /></label>
            <label className="wide"><span>What would you contribute to the room?</span><textarea required name="contribution" rows={3} placeholder="A skill, instinct, question or unfinished idea." /></label>
            <button className="submit" type="submit"><span>Send your signal</span><b>↗</b></button>
          </form>
        )}
      </section>

      <footer>
        <div><Mark small /><span>ASB9 CLUB<br />Est. for what comes next</span></div>
        <button
          className="hold"
          onPointerDown={beginHold}
          onPointerUp={endHold}
          onPointerLeave={endHold}
          onKeyDown={(e) => e.key === 'Enter' && document.querySelector('#apply')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className="hold-fill" style={{ width: `${hold}%` }} />
          <span className="hold-copy">{hold > 0 ? 'Hold your intention' : 'Press and hold to apply'}</span>
        </button>
        <p>For builders of things,<br />systems and new realities.</p>
      </footer>
    </main>
  )
}

export default App
