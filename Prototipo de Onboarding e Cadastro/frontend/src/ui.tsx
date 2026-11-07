import { type ReactNode } from "react"
import guardAILogo from "./imports/GuardAI-sem-fundo.png"
import guardAIWhiteLogo from "./imports/GuardAI-inicio-branca.png"
type I = "shield" | "phone" | "users" | "bell" | "book" | "gear" | "check" | "warn" | "back" | "lock" | "mic" | "volume" | "user" | "message" | "edit"
const paths: Record<I, ReactNode> = {
  shield: <path d="M12 3 5 6v5c0 5 3 8 7 10 4-2 7-5 7-10V6l-7-3Z" />,
  phone: <path d="M6 3l3 5-2 2c2 4 3 5 7 7l2-2 5 3-1 3C10 22 2 14 3 4l3-1Z" />,
  users: (
    <>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2c0-3 3-5 7-5s7 2 7 5v2M17 4c3 1 3 6 0 7M18 15c3 0 4 2 4 4v2" />
    </>
  ),
  bell: (
    <>
      <path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9" />
      <path d="M10 21h4" />
    </>
  ),
  book: (
    <>
      <path d="M4 20c0-2 1-3 3-3h13V4H7C5 4 4 5 4 7v13Z" />
      <path d="M8 8h8M8 12h6" />
    </>
  ),
  gear: (
    <>
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="12" r="9" />
    </>
  ),
  check: <path d="m5 12 4 4 10-10" />,
  warn: (
    <>
      <path d="M12 3 2 21h20L12 3Z" />
      <path d="M12 9v5M12 18h.01" />
    </>
  ),
  back: <path d="m15 18-6-6 6-6" />,
  lock: (
    <>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </>
  ),
  mic: (
    <>
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </>
  ),
  volume: (
    <>
      <path d="M11 5 6 9H2v6h4l5 4V5ZM16 9c2 2 2 4 0 6M19 6c4 4 4 8 0 12" />
    </>
  ),
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21a8 8 0 0 1 16 0" />
    </>
  ),
  message: <><path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4v8Z"/><path d="M8 10h8M8 14h5"/></>,
  edit: <><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></>,
}
function Icon({ n, s = 22 }: { n: I; s?: number }) {
  return (
    <svg
      width={s}
      height={s}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[n]}
    </svg>
  )
}
function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className={"logo " + (light ? "light" : "")}>
      <img
        src={light ? guardAIWhiteLogo : guardAILogo}
        alt="GuardAI — Mais segurança contra golpes. Juntos, em todas as ligações."
      />
    </div>
  )
}
function FlowHead({ title, back }: { title: string; back: () => void }) {
  return (
    <header className="flow-head">
      <button onClick={back} aria-label="Voltar">
        <Icon n="back" />
      </button>
      <strong>{title}</strong>
      <span />
    </header>
  )
}
function Header({ label, title, active = true }: { label: string; title: string; active?: boolean }) {
  return (
    <header className="dashhead">
      <label>{label}</label>
      <h1>{title}</h1>
      <span className={active ? "" : "paused"}>
        <i /> {active ? "Sistema ativo" : "Sistema pausado"}
      </span>
    </header>
  )
}
function Card({
  title,
  icon,
  children,
}: {
  title: string
  icon: I
  children: ReactNode
}) {
  return (
    <section className="card">
      <header>
        <div>
          <label>VISÃO GERAL</label>
          <h2>{title}</h2>
        </div>
        <Icon n={icon} />
      </header>
      {children}
    </section>
  )
}
function Person({
  initials,
  name,
  detail,
  onClick,
}: {
  initials: string
  name: string
  detail: string
  onClick: () => void
}) {
  return (
    <button className="row caregiver-row" onClick={onClick}>
      <span>{initials}</span>
      <p>
        <b>{name}</b>
        <small>{detail}</small>
      </p>
      <em>Conectado</em>
    </button>
  )
}
function Metric({ n, a, b }: { n: I; a: string; b: string }) {
  return (
    <div>
      <Icon n={n} />
      <p>
        <small>{a}</small>
        <b>{b}</b>
      </p>
    </div>
  )
}
export { Icon, Logo, FlowHead, Header, Card, Person, Metric }
export const initials = (name: string) => name.split(" ").filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase()

