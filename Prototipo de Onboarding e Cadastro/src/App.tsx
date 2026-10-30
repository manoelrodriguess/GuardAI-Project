import { useEffect, useState, type ReactNode } from "react"
import guardAILogo from "./imports/GuardAI-sem-fundo.png"
import guardAIWhiteLogo from "./imports/GuardAI-inicio-branca.png"
type Role = "idoso" | "responsavel"
type Page = "welcome" | "login" | "choose" | "register" | "consent" | "link-member" | "senior" | "care" | "call" | "result" | "settings" | "live" | "incident" | "history" | "catalog" | "circle"
type Verdict = "open" | "scam" | "not_scam"
type UserProfile = { name: string; phone: string; email: string; birthDate?: string; relationship?: string }
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
const demos = [
  {
    title: "Falso familiar",
    sub: "Pedido urgente de Pix",
    risk: "Alto",
    who: "Número não identificado",
    lines: [
      "Oi, vó. Sou eu, o Marcos. Troquei de número.",
      "Estou com um problema e preciso de um Pix agora.",
      "Não liga para a mãe, depois eu explico tudo.",
    ],
    signals: [
      "Pedido de dinheiro",
      "Pressão por urgência",
      "Pedido de segredo",
    ],
  },
  {
    title: "Conversa segura",
    sub: "Chamada sem indícios de golpe",
    risk: "Baixo",
    who: "Ana Lima — Neta",
    lines: [
      "Oi, vó. Tudo bem com a senhora?",
      "Liguei para lembrar do almoço de domingo.",
      "Depois eu passo aí para buscar a senhora.",
    ],
    signals: ["Contato reconhecido", "Sem pedido financeiro", "Sem pressão"],
  },
]
const initialVerdicts: Record<number, Verdict> = {
  1: "open",
  2: "not_scam",
  3: "scam",
  4: "scam",
}

const defaultProfiles: Record<Role, UserProfile> = {
  idoso: { name: "Maria Aparecida", phone: "(11) 97777-4321", email: "maria@email.com", birthDate: "15/04/1952" },
  responsavel: { name: "João Silva", phone: "(11) 99999-1234", email: "joao@email.com", relationship: "Filho" },
}

function loadProfile(role: Role): UserProfile {
  try {
    const saved = window.localStorage.getItem(`guardai-profile-${role}`)
    return saved ? { ...defaultProfiles[role], ...JSON.parse(saved) } : defaultProfiles[role]
  } catch {
    return defaultProfiles[role]
  }
}

function profileInitials(name: string) {
  return name.split(" ").filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "--"
}

function loadVerdicts() {
  try {
    const saved = window.localStorage.getItem("guardai-case-verdicts")
    return saved ? { ...initialVerdicts, ...JSON.parse(saved) } : initialVerdicts
  } catch {
    return initialVerdicts
  }
}

export default function App() {
  const [page, setPage] = useState<Page>("welcome"),
    [role, setRole] = useState<Role>("idoso"),
    [demo, setDemo] = useState(0),
    [sec, setSec] = useState(0),
    [verdicts, setVerdicts] = useState<Record<number, Verdict>>(loadVerdicts)
  useEffect(() => {
    if (page !== "call") return
    setSec(0)
    const t = setInterval(() => setSec((x) => x + 1), 1000)
    return () => clearInterval(t)
  }, [page, demo])
  useEffect(() => {
    window.localStorage.setItem("guardai-case-verdicts", JSON.stringify(verdicts))
  }, [verdicts])
  const d = demos[demo],
    home: Page = role === "idoso" ? "senior" : "care"
  const run = (i = 0) => {
    setDemo(i)
    setVerdicts((current) => ({ ...current, [i + 1]: "open" }))
    setPage("call")
  }
  const reviewCase = (id: number, verdict: Exclude<Verdict, "open">) => {
    setVerdicts((current) => ({ ...current, [id]: verdict }))
  }
  if (page === "welcome")
    return (
      <Welcome
        login={() => setPage("login")}
        signup={() => setPage("choose")}
      />
    )
  if (page === "login")
    return (
      <Login
        back={() => setPage("welcome")}
        enter={() => setPage(home)}
        role={role}
        setRole={setRole}
      />
    )
  if (page === "choose")
    return (
      <Choose
        back={() => setPage("welcome")}
        choose={(r) => {
          setRole(r)
          setPage("register")
        }}
      />
    )
  if (page === "register")
    return (
      <Register
        role={role}
        back={() => setPage("choose")}
        next={() => setPage(role === "idoso" ? "consent" : "link-member")}
      />
    )
  if (page === "consent")
    return (
      <Consent
        back={() => setPage("register")}
        next={() => setPage("link-member")}
      />
    )
  if (page === "link-member") return <LinkMember role={role} back={() => setPage(role === "idoso" ? "consent" : "register")} next={() => setPage(home)} />
  if (page === "senior") return <Senior nav={setPage} run={run} />
  if (page === "care") return <Care nav={setPage} />
  if (page === "call")
    return <Call d={d} sec={sec} end={() => setPage("result")} />
  if (page === "result")
    return (
      <Result
        d={d}
        role={role}
        back={() => setPage(home)}
        alert={() => setPage("incident")}
        verdict={verdicts[demo + 1] ?? "open"}
        onReview={(verdict) => reviewCase(demo + 1, verdict)}
      />
    )
  if (page === "live") return <LiveCall back={() => setPage("care")} ended={() => setPage("incident")} />
  if (page === "incident") return <IncidentReport back={() => setPage("care")} verdict={verdicts[1] ?? "open"} onReview={(verdict) => reviewCase(1, verdict)} />
  if (page === "history") return <HistoryPage role={role} back={() => setPage(home)} verdicts={verdicts} onReview={reviewCase} />
  if (page === "catalog") return <CatalogPage role={role} back={() => setPage(home)} />
  if (page === "circle") return <SecurityCircle role={role} back={() => setPage(home)} />
  if (page === "settings")
    return (
      <Settings
        role={role}
        back={() => setPage(home)}
        logout={() => setPage("welcome")}
      />
    )
  return null
}
function Welcome({ login, signup }: { login: () => void; signup: () => void }) {
  return (
    <main className="welcome">
      <div className="welcome-inner">
        <Logo light />
        <div className="welcome-copy">
          <h1>Proteção contra golpes para toda a família</h1>
          <p>Segurança e tranquilidade em todas as ligações.</p>
        </div>
        <div className="welcome-actions">
          <button className="primary" onClick={login}>
            Entrar
          </button>
          <button className="ghost" onClick={signup}>
            Cadastrar-se
          </button>
        </div>
        <small>
          <Icon n="lock" s={15} /> Seus dados são protegidos
        </small>
      </div>
    </main>
  )
}
function FlowHead({ title, back }: { title: string; back: () => void }) {
  return (
    <header className="flow-head">
      <button onClick={back}>
        <Icon n="back" />
      </button>
      <strong>{title}</strong>
      <span />
    </header>
  )
}
function Login({
  back,
  enter,
  role,
  setRole,
}: {
  back: () => void
  enter: () => void
  role: Role
  setRole: (r: Role) => void
}) {
  return (
    <main className="flow">
      <FlowHead title="Entrar" back={back} />
      <section>
        <span className="flow-icon">
          <Icon n="lock" s={30} />
        </span>
        <h1>Bem-vindo de volta</h1>
        <p>Acesse sua conta GuardAI.</p>
        <div className="role-switch">
          <button
            className={role === "idoso" ? "on" : ""}
            onClick={() => setRole("idoso")}
          >
            Idoso
          </button>
          <button
            className={role === "responsavel" ? "on" : ""}
            onClick={() => setRole("responsavel")}
          >
            Responsável
          </button>
        </div>
        <label>
          Telefone
          <input defaultValue="(11) 97777-4321" />
        </label>
        <label>
          Senha
          <input type="password" defaultValue="123456" />
        </label>
        <button className="primary full" onClick={enter}>
          Entrar
        </button>
        <small className="demo-info">
          Dados preenchidos para facilitar a demonstração.
        </small>
      </section>
    </main>
  )
}
function Choose({
  back,
  choose,
}: {
  back: () => void
  choose: (r: Role) => void
}) {
  return (
    <main className="flow">
      <FlowHead title="Criar conta" back={back} />
      <section>
        <span className="step-label">ETAPA 1 DE 3</span>
        <h1>Como você usará o GuardAI?</h1>
        <p>Escolha o perfil para personalizarmos sua experiência.</p>
        <button className="choice" onClick={() => choose("idoso")}>
          <span>
            <Icon n="shield" s={30} />
          </span>
          <div>
            <b>Sou idoso</b>
            <small>Quero proteção e orientações durante minhas ligações.</small>
          </div>
          <Icon n="back" />
        </button>
        <button className="choice" onClick={() => choose("responsavel")}>
          <span>
            <Icon n="users" s={30} />
          </span>
          <div>
            <b>Sou responsável</b>
            <small>Quero acompanhar e ajudar uma pessoa protegida.</small>
          </div>
          <Icon n="back" />
        </button>
        <aside>
          <Icon n="lock" />
          <p>
            <b>Escolha segura</b>
            <br />
            Você poderá revisar suas preferências depois.
          </p>
        </aside>
      </section>
    </main>
  )
}
function Register({
  role,
  back,
  next,
}: {
  role: Role
  back: () => void
  next: () => void
}) {
  return (
    <main className="flow">
      <FlowHead
        title={
          role === "idoso"
            ? "Cadastro da pessoa protegida"
            : "Cadastro do responsável"
        }
        back={back}
      />
      <section>
        <span className="step-label">ETAPA 2 DE 3</span>
        <h1>
          {role === "idoso"
            ? "Conte-nos sobre você"
            : "Crie seu perfil de responsável"}
        </h1>
        <p>Use dados fictícios nesta apresentação.</p>
        <label>
          Nome completo
          <input
            defaultValue={
              role === "idoso" ? "Maria Aparecida Santos" : "João Silva"
            }
          />
        </label>
        <label>
          Telefone
          <input
            defaultValue={
              role === "idoso" ? "(11) 97777-4321" : "(11) 99999-1234"
            }
          />
        </label>
        <label>
          Crie uma senha
          <input type="password" defaultValue="123456" />
        </label>
        <button className="primary full" onClick={next}>
          {role === "idoso" ? "Continuar" : "Concluir cadastro"}
        </button>
      </section>
    </main>
  )
}
function Consent({ back, next }: { back: () => void; next: () => void }) {
  const [ok, setOk] = useState(false)
  return (
    <main className="flow">
      <FlowHead title="Sua autorização" back={back} />
      <section>
        <span className="step-label">ETAPA 3 DE 3</span>
        <span className="flow-icon">
          <Icon n="shield" s={32} />
        </span>
        <h1>Você controla sua proteção</h1>
        <p>O GuardAI só analisará chamadas com sua autorização.</p>
        <div className="consent-list">
          <p>
            <Icon n="mic" /> Transcreve trechos para procurar sinais de golpe.
          </p>
          <p>
            <Icon n="bell" /> Avisa o responsável apenas quando houver risco
            relevante.
          </p>
          <p>
            <Icon n="lock" /> Usa as informações somente para sua proteção.
          </p>
        </div>
        <label className="consent-check">
          <input
            type="checkbox"
            checked={ok}
            onChange={(e) => setOk(e.target.checked)}
          />
          <span>Li e autorizo a análise das chamadas conforme explicado.</span>
        </label>
        <button className="primary full" disabled={!ok} onClick={next}>
          Concluir e entrar
        </button>
      </section>
    </main>
  )
}
function LinkMember({ role, back, next }: { role: Role; back: () => void; next: () => void }) {
  const [name, setName] = useState(role === "idoso" ? "João Silva" : "Maria Aparecida")
  const [phone, setPhone] = useState(role === "idoso" ? "(11) 99999-1234" : "(11) 97777-4321")
  const [relationship, setRelationship] = useState(role === "idoso" ? "Filho" : "Mãe")
  const finish = () => {
    window.localStorage.setItem(`guardai-first-link-${role}`, JSON.stringify({ name, phone, relationship }))
    next()
  }
  return <main className="flow"><FlowHead title="Círculo de Segurança" back={back}/><section><span className="step-label">ÚLTIMA ETAPA</span><span className="flow-icon"><Icon n="users" s={31}/></span><h1>{role === "idoso" ? "Cadastre um responsável" : "Cadastre uma pessoa protegida"}</h1><p>{role === "idoso" ? "Adicione quem acompanhará seus alertas e poderá ajudar em situações de risco." : "Adicione o idoso cujas chamadas e alertas você acompanhará."}</p><label>Nome completo<input value={name} onChange={(event)=>setName(event.target.value)}/></label><label>Telefone<input inputMode="tel" value={phone} onChange={(event)=>setPhone(event.target.value)}/></label><label>Relação com a pessoa protegida<input value={relationship} onChange={(event)=>setRelationship(event.target.value)} placeholder="Ex.: filho, neta, cuidador"/></label><aside><Icon n="lock"/><p><b>Vínculo familiar</b><br/>Esta relação pertence ao Círculo de Segurança e poderá ser alterada por lá.</p></aside><button className="primary full" disabled={!name.trim()||!phone.trim()||!relationship.trim()} onClick={finish}>Adicionar ao círculo e continuar</button></section></main>
}
function Shell({
  role,
  children,
  home,
  settings,
  logout,
  history,
  catalog,
  circle,
}: {
  role: Role
  children: ReactNode
  home: () => void
  settings: () => void
  logout: () => void
  history: () => void
  catalog: () => void
  circle: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const profile = loadProfile(role)
  const select = (action: () => void) => {
    setMenuOpen(false)
    window.setTimeout(action, 180)
  }
  return (
    <div className="shell">
      <aside>
        <Logo light />
        <div className="person">
          <span>{profileInitials(profile.name)}</span>
          <p>
            <b>{profile.name}</b>
            <small>
              {role === "idoso" ? "Pessoa protegida" : "Responsável familiar"}
            </small>
          </p>
        </div>
        <button onClick={home}>
          <Icon n="shield" /> Visão geral
        </button>
        <button onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}>
          <Icon n="gear" /> Menu
        </button>
      </aside>
      <main>{children}</main>
      {menuOpen && (
        <div className="menu-overlay" onClick={() => setMenuOpen(false)}>
          <section className="bottom-sheet" onClick={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Menu principal">
            <div className="sheet-handle" />
            <header><h2>Menu</h2><button onClick={() => setMenuOpen(false)} aria-label="Fechar menu">×</button></header>
            <div className="sheet-profile"><span>{profileInitials(profile.name)}</span><div><b>{profile.name}</b><small>{role === "idoso" ? "Perfil protegido" : "Responsável familiar"}</small></div></div>
            <nav className="sheet-links">
              <button className="selected" onClick={() => select(home)}><Icon n="shield" /> Início</button>
              <button onClick={() => select(history)}><Icon n="book" /> Histórico</button>
              <button onClick={() => select(catalog)}><Icon n="warn" /> Catálogo de golpes</button>
              <button onClick={() => select(circle)}><Icon n="users" /> Círculo de Segurança</button>
              <button onClick={() => select(settings)}><Icon n="gear" /> Configurações</button>
            </nav>
            <div className="font-control"><label>TAMANHO DA LETRA</label><div><button>A</button><button className="active">A+</button><button>A++</button><button aria-label="Leitura por voz"><Icon n="volume" s={18}/></button></div></div>
            <button className="sheet-logout" onClick={() => select(logout)}><Icon n="back" s={18}/> Sair da conta</button>
          </section>
        </div>
      )}
    </div>
  )
}
function Senior({
  nav,
  run,
}: {
  nav: (p: Page) => void
  run: (i?: number) => void
}) {
  const [protectionOn, setProtectionOn] = useState(true)
  const [selectedCaregiver, setSelectedCaregiver] = useState<null | "joao" | "ana">(null)
  const caregiver = selectedCaregiver === "joao"
    ? {name:"João Silva", initials:"JS", relation:"Filho", phone:"(11) 99999-1234", role:"Responsável principal", access:"Recebe alertas, acompanha chamadas de risco e pode interromper ligações."}
    : {name:"Ana Lima", initials:"AL", relation:"Neta", phone:"(11) 98888-5678", role:"Contato de apoio", access:"Recebe avisos importantes e pode entrar em contato em emergências."}
  return (
    <Shell
      role="idoso"
      home={() => nav("senior")}
      settings={() => nav("settings")}
      logout={() => nav("welcome")}
      history={() => nav("history")}
      catalog={() => nav("catalog")}
      circle={() => nav("circle")}
    >
      <Header
        label="PAINEL DE PROTEÇÃO"
        title={protectionOn ? "Olá, Maria. Você está protegida." : "Olá, Maria. A proteção está pausada."}
        active={protectionOn}
      />
      <section className={`safe protection-status ${protectionOn ? "is-on" : "is-off"}`}>
        <Icon n="shield" s={34} />
        <div>
          <small>{protectionOn ? "IA ATIVA NO CELULAR" : "PROTEÇÃO PAUSADA"}</small>
          <h2>{protectionOn ? "Proteção funcionando nas ligações" : "A IA não está analisando ligações"}</h2>
          <p>{protectionOn ? "Chamadas autorizadas serão analisadas e João poderá ser avisado." : "Ative a proteção para voltar a identificar possíveis golpes."}</p>
        </div>
        <button
          className={`protection-toggle ${protectionOn ? "on" : ""}`}
          onClick={() => setProtectionOn(!protectionOn)}
          aria-pressed={protectionOn}
          aria-label={protectionOn ? "Pausar proteção nas ligações" : "Ativar proteção nas ligações"}
        ><i /></button>
      </section>
      <button className={`protection-action ${protectionOn ? "active" : "paused"}`} onClick={() => setProtectionOn(!protectionOn)}>
        <Icon n={protectionOn ? "check" : "phone"} />
        <span><b>{protectionOn ? "GuardAI está funcionando" : "Ativar proteção agora"}</b><small>{protectionOn ? "Toque para pausar temporariamente" : "Toque para proteger suas próximas ligações"}</small></span>
      </button>
      <div className="cols">
        <Card title="Testar uma ligação protegida" icon="phone">
          <p>
            Veja passo a passo como o GuardAI reage a uma conversa suspeita.
          </p>
          <button className="primary full" onClick={() => run(0)}>
            Iniciar demonstração
          </button>
          <small className="note">
            <Icon n="check" s={15} /> Simulação segura, sem ligação real
          </small>
        </Card>
        <Card title="Quem cuida de você" icon="users">
          <Person
            initials="JS"
            name="João Silva"
            detail="Filho · Responsável principal"
            onClick={() => setSelectedCaregiver("joao")}
          />
          <Person
            initials="AL"
            name="Ana Lima"
            detail="Neta · Contato de apoio"
            onClick={() => setSelectedCaregiver("ana")}
          />
        </Card>
      </div>
      {selectedCaregiver && <div className="detail-overlay" onClick={() => setSelectedCaregiver(null)}><article className="detail-sheet caregiver-sheet" onClick={e => e.stopPropagation()}><div className="sheet-handle"/><header><div><small>SEU CÍRCULO DE SEGURANÇA</small><h2>Detalhes do responsável</h2></div><button onClick={() => setSelectedCaregiver(null)}>×</button></header><div className="caregiver-profile"><span>{caregiver.initials}</span><div><h3>{caregiver.name}</h3><p>{caregiver.relation} · {caregiver.role}</p></div><em>Conectado</em></div><div className="caregiver-info"><div><small>Telefone</small><b>{caregiver.phone}</b></div><div><small>Permissões</small><p>{caregiver.access}</p></div><div><small>Status</small><b>Ativo no seu círculo de segurança</b></div></div><button className="call-senior" onClick={() => alert(`Ligação para ${caregiver.name} iniciada na demonstração.`)}><Icon n="phone"/> Ligar para {caregiver.name.split(" ")[0]}</button><button className="whatsapp" onClick={() => alert(`Conversa com ${caregiver.name} preparada no WhatsApp.`)}><Icon n="message"/> Enviar mensagem</button></article></div>}
    </Shell>
  )
}
function Care({ nav }: { nav: (p: Page) => void }) {
  const [protectionOn, setProtectionOn] = useState(true)
  const [exampleCreated, setExampleCreated] = useState(false)
  return (
    <Shell
      role="responsavel"
      home={() => nav("care")}
      settings={() => nav("settings")}
      logout={() => nav("welcome")}
      history={() => nav("history")}
      catalog={() => nav("catalog")}
      circle={() => nav("circle")}
    >
      <Header label="PAINEL DO RESPONSÁVEL" title="Acompanhamento da Maria" active={protectionOn} />
      <section className={`care-protection ${protectionOn ? "on" : "off"}`}><div className="care-protection-icon"><Icon n="shield"/></div><div><small>IA NO CELULAR DE MARIA</small><h2>{protectionOn ? "Proteção ligada" : "Proteção desligada"}</h2><p>{protectionOn ? "A IA está analisando as chamadas autorizadas." : "As chamadas de Maria não estão sendo analisadas."}</p></div><button className={`protection-toggle ${protectionOn ? "on" : ""}`} onClick={()=>setProtectionOn(!protectionOn)} aria-pressed={protectionOn}><i/></button></section>
      <div className="metrics">
        <Metric n="shield" a="Proteção" b={protectionOn ? "Ativa" : "Pausada"} />
        <Metric n="bell" a="Alertas pendentes" b={exampleCreated ? "1" : "0"} />
        <Metric n="phone" a="Chamadas analisadas" b={exampleCreated ? "1" : "0"} />
      </div>
      {!exampleCreated ? <section className="care-empty">
        <span><Icon n="check" s={30} /></span>
        <h2>Nenhuma ocorrência por enquanto</h2>
        <p>Quando a IA analisar uma ligação ou identificar um possível risco, as informações aparecerão aqui.</p>
        <button className="primary full" onClick={() => setExampleCreated(true)}><Icon n="phone" /> Criar exemplo</button>
        <small>Use o exemplo para testar o acompanhamento em tempo real.</small>
      </section> : <>
      <Card title="Ligação com risco alto" icon="warn">
        <div className="live-alert"><i /> ACONTECENDO AGORA</div>
        <span className="badge">RISCO ALTO</span>
        <p>Hoje, 14:32 · Número não identificado · 02:18</p>
        <div className="chips">
          {demos[0].signals.map((x) => (
            <span key={x}>{x}</span>
          ))}
        </div>
        <blockquote>
          “Estou com um problema e preciso de um Pix agora. Não liga para a
          mãe...”
        </blockquote>
        <button className="danger full connect-live" onClick={() => nav("live")}>
          <Icon n="volume" /> Conectar à chamada ao vivo
        </button>
      </Card>
      <h2 className="recent">Atividade recente</h2>
      {[
        ["Alto", "Possível falso familiar", "Aguardando revisão"],
      ].map((x) => (
        <div className="history" key={x[1]}>
          <i className={x[0]} />
          <b>{x[1]}</b>
          <span>Risco {x[0]}</span>
          <small>{x[2]}</small>
        </div>
      ))}
      <button className="reset-example" onClick={() => setExampleCreated(false)}>Remover exemplo e limpar painel</button>
      </>}
    </Shell>
  )
}
function LiveCall({ back, ended }: { back: () => void; ended: () => void }) {
  const [joined, setJoined] = useState(false)
  const [muted, setMuted] = useState(true)
  return <main className="live-call-page">
    <header><button onClick={back}><Icon n="back" /></button><span><i /> ALERTA EM TEMPO REAL</span></header>
    <section className="live-person"><span className="avatar"><Icon n="user" s={42}/></span><small>PESSOA PROTEGIDA</small><h1>Maria Aparecida</h1><p>Em chamada com número não identificado</p><b>03:42</b></section>
    <section className="ai-live"><div><Icon n="warn"/><span><small>RISCO ESTIMADO PELA IA</small><strong>87% · Risco alto</strong></span></div><div className="mini-score"><i style={{width:"87%"}}/></div><p>Pedido de Pix, urgência e solicitação de segredo foram detectados.</p></section>
    <section className="live-transcript-card"><small>TRANSCRIÇÃO AO VIVO</small><p>“Não avisa ninguém agora. Preciso que faça o Pix antes que o banco bloqueie tudo.”</p><span><i/> Analisando novas expressões...</span></section>
    {!joined ? <button className="join-call" onClick={() => setJoined(true)}><Icon n="volume"/><span><b>Escutar chamada ao vivo</b><small>Maria será avisada de que você entrou</small></span></button> : <div className="remote-controls"><div className="connected-live"><i/> Você está conectado e ouvindo</div><div><button className={muted?"":"on"} onClick={()=>setMuted(!muted)}><Icon n="mic"/><span>{muted?"Falar com Maria":"Silenciar"}</span></button><button><Icon n="volume"/><span>Viva-voz</span></button></div><button className="end-remote" onClick={ended}><Icon n="phone"/> Encerrar ligação para Maria</button><p>Ao encerrar, você verá o relatório completo da análise.</p></div>}
  </main>
}

function IncidentReport({ back, verdict, onReview }: { back: () => void; verdict: Verdict; onReview: (verdict: Exclude<Verdict, "open">) => void }) {
  const [notice, setNotice] = useState("")
  return <main className="incident-page"><FlowHead title="Análise da ligação" back={back}/><section>
    <div className="incident-title"><span><Icon n="shield" s={30}/></span><div><small>LIGAÇÃO ENCERRADA PELO RESPONSÁVEL</small><h1>Possível golpe interrompido</h1><p>Maria Aparecida · Hoje, 14:32 · 03:58</p></div></div>
    <div className="score-card"><div><span>Probabilidade estimada de golpe</span><b>87%</b></div><div className="risk-scale"><i style={{width:"87%"}}/><em/></div><footer><span>Baixo</span><span>Médio</span><span>Alto</span></footer><p>Risco alto — recomendamos confirmar imediatamente se Maria está segura.</p></div>
    <div className="evidence-card"><label>TRECHOS E EXPRESSÕES IDENTIFICADOS</label><h2>O que elevou o risco</h2>{[["Urgência","preciso que faça o Pix agora"],["Segredo","não avisa ninguém"],["Ameaça","o banco vai bloquear tudo"]].map(([tag,text])=><article key={tag}><span>{tag}</span><p>“{text}”</p></article>)}</div>
    <div className="safety-actions"><h2>Fale com Maria agora</h2><p>Use um canal conhecido para confirmar que ela está bem e orientar os próximos passos.</p><button className="call-senior" onClick={()=>setNotice("Ligação para Maria iniciada na demonstração.")}><Icon n="phone"/> Ligar para Maria</button><button className="whatsapp" onClick={()=>setNotice("Mensagem de segurança preparada no WhatsApp.")}><Icon n="message"/> Enviar mensagem no WhatsApp</button>{notice&&<div className="action-notice"><Icon n="check"/> {notice}</div>}</div>
    <ReviewPanel verdict={verdict} onReview={onReview} />
    <button className="ghost dark full" onClick={back}>Voltar ao painel</button>
  </section></main>
}

const historyItems = [
  {id:1,date:"Hoje, 14:32",title:"Possível falso familiar",risk:"Alto",score:87,source:"Número não identificado",duration:"03:58",status:"Ligação encerrada",signals:["Pedido de Pix","Urgência","Pedido de segredo"],excerpt:"Não avisa ninguém. Preciso que faça o Pix agora."},
  {id:2,date:"Ontem, 18:10",title:"Conversa com familiar",risk:"Baixo",score:12,source:"Ana Lima — Neta",duration:"06:21",status:"Concluída com segurança",signals:["Contato reconhecido","Sem pedido financeiro"],excerpt:"Só liguei para lembrar do almoço de domingo."},
  {id:3,date:"18 out, 09:45",title:"Possível falsa central bancária",risk:"Médio",score:64,source:"Central não verificada",duration:"02:44",status:"Confirmado como golpe",signals:["Pedido de código","Ameaça de bloqueio"],excerpt:"Informe o código para impedir que sua conta seja bloqueada."},
  {id:4,date:"12 out, 16:08",title:"Oferta de prêmio suspeita",risk:"Alto",score:81,source:"Número não identificado",duration:"01:37",status:"Alerta atendido",signals:["Prêmio não solicitado","Taxa antecipada"],excerpt:"Você ganhou um prêmio, mas precisa pagar a taxa hoje."},
]
function verdictLabel(verdict: Verdict) {
  if (verdict === "scam") return "Confirmado como golpe"
  if (verdict === "not_scam") return "Confirmado: não é golpe"
  return "Aberto · aguardando responsável"
}

function ReviewPanel({ verdict, onReview }: { verdict: Verdict; onReview: (verdict: Exclude<Verdict, "open">) => void }) {
  if (verdict !== "open") {
    return <section className={`review-panel closed ${verdict}`}><span><Icon n="check" /></span><div><small>CASO ENCERRADO PELO RESPONSÁVEL</small><h2>{verdict === "scam" ? "Confirmado como golpe" : "Confirmado que não é golpe"}</h2><p>O parecer humano foi registrado e esta análise não está mais pendente.</p></div></section>
  }
  return <section className="review-panel"><div className="review-copy"><span><Icon n="user" /></span><div><small>VALIDAÇÃO DO RESPONSÁVEL</small><h2>Esta análise continua em aberto</h2><p>Revise as informações da IA e encerre o caso com seu parecer.</p></div></div><div className="review-actions"><button className="confirm-scam" onClick={() => onReview("scam")}><Icon n="warn" /> É golpe</button><button className="confirm-safe" onClick={() => onReview("not_scam")}><Icon n="check" /> Não é golpe</button></div></section>
}

function HistoryPage({role,back,verdicts,onReview}:{role:Role;back:()=>void;verdicts:Record<number,Verdict>;onReview:(id:number,verdict:Exclude<Verdict,"open">)=>void}) {
  const [selected,setSelected]=useState<typeof historyItems[number]|null>(null)
  return <main className="data-page"><FlowHead title="Histórico de proteção" back={back}/><section><div className="data-intro"><span className="step-label">{role==='idoso'?'MINHAS LIGAÇÕES':'HISTÓRICO DE MARIA'}</span><h1>Chamadas e alertas</h1><p>As análises ficam abertas até o responsável revisar e encerrar cada caso.</p></div><div className="history-filters"><button className="active">Todos</button><button>Em aberto</button><button>Encerrados</button></div><div className="history-list">{historyItems.map(item=>{const verdict=verdicts[item.id]??"open";return <button key={item.id} onClick={()=>setSelected(item)}><span className={`history-icon ${item.risk.toLowerCase()}`}><Icon n={item.risk==='Baixo'?'check':'warn'}/></span><div><small>{item.date}</small><b>{item.title}</b><em>{item.source}</em><strong className={`case-status ${verdict}`}>{verdictLabel(verdict)}</strong></div><span className={`history-score ${item.risk.toLowerCase()}`}>{item.score}%</span></button>})}</div></section>{selected&&<div className="detail-overlay" onClick={()=>setSelected(null)}><article className="detail-sheet" onClick={e=>e.stopPropagation()}><div className="sheet-handle"/><header><div><small>ANÁLISE DA IA</small><h2>{selected.title}</h2></div><button onClick={()=>setSelected(null)}>×</button></header><div className="detail-meta"><span>{selected.date}</span><span>{selected.duration}</span><span>{verdictLabel(verdicts[selected.id]??"open")}</span></div><div className="detail-score"><span>Risco estimado pela IA</span><b>{selected.score}%</b><div><i style={{width:`${selected.score}%`}}/></div></div><h3>Indícios identificados</h3><div className="detail-tags">{selected.signals.map(s=><span key={s}>{s}</span>)}</div><blockquote>“{selected.excerpt}”</blockquote><div className="detail-source"><Icon n="phone"/><p><small>Origem da chamada</small><b>{selected.source}</b></p></div>{role==="responsavel"&&<ReviewPanel verdict={verdicts[selected.id]??"open"} onReview={(verdict)=>onReview(selected.id,verdict)}/>}<button className="ghost dark full" onClick={()=>setSelected(null)}>Fechar detalhes</button></article></div>}</main>
}

type ElderProfile = {
  id: number
  initials: string
  name: string
  relation: string
  phone: string
  protection: string
  emergencyName: string
  emergencyPhone: string
}

const defaultElders: ElderProfile[] = [
  { id: 1, initials: "MA", name: "Maria Aparecida", relation: "Mãe", phone: "(11) 97777-4321", protection: "Proteção ativa", emergencyName: "Ana Lima · Neta", emergencyPhone: "(11) 98888-5678" },
  { id: 2, initials: "AS", name: "Antônio Santos", relation: "Sogro", phone: "(11) 96666-2080", protection: "Proteção ativa", emergencyName: "Cláudia Santos · Filha", emergencyPhone: "(11) 95555-8040" },
]

function loadElders() {
  try {
    const saved = window.localStorage.getItem("guardai-elder-profiles")
    return saved ? JSON.parse(saved) as ElderProfile[] : defaultElders
  } catch {
    return defaultElders
  }
}

function SecurityCircle({ role, back }: { role: Role; back: () => void }) {
  const monitors = [
    { id: 1, initials: "JS", name: "João Silva", relation: "Filho", phone: "(11) 99999-1234", role: "Responsável principal", access: "Recebe alertas, acompanha chamadas de risco e pode entrar em contato em emergências." },
    { id: 2, initials: "AL", name: "Ana Lima", relation: "Neta", phone: "(11) 98888-5678", role: "Contato de apoio", access: "Recebe avisos importantes e ajuda a confirmar contatos ou pedidos suspeitos." },
  ]
  const [elders, setElders] = useState<ElderProfile[]>(loadElders)
  const [selectedMonitor, setSelectedMonitor] = useState<typeof monitors[number] | null>(null)
  const [selectedElder, setSelectedElder] = useState<ElderProfile | null>(null)
  const [editing, setEditing] = useState<ElderProfile | null>(null)

  const saveElder = () => {
    if (!editing) return
    const next = elders.map((elder) => elder.id === editing.id ? editing : elder)
    setElders(next)
    window.localStorage.setItem("guardai-elder-profiles", JSON.stringify(next))
    setSelectedElder(editing)
    setEditing(null)
  }

  return <main className="data-page circle-page">
    <FlowHead title="Círculo de Segurança" back={back} />
    <section>
      <div className="data-intro">
        <span className="step-label">REDE DE CONFIANÇA</span>
        <h1>{role === "idoso" ? "Quem cuida de você" : "Pessoas que você protege"}</h1>
        <p>{role === "idoso" ? "Veja quem recebe seus alertas e acesse rapidamente os contatos do seu círculo." : "Acompanhe os idosos sob sua responsabilidade e consulte as informações de cada pessoa."}</p>
      </div>

      {role === "idoso" ? <>
        <div className="circle-summary"><Icon n="shield" /><div><b>{monitors.length} pessoas conectadas</b><small>Seu círculo está ativo e pronto para ajudar</small></div></div>
        <div className="circle-list">{monitors.map((person) => <button key={person.id} className="circle-card" onClick={() => setSelectedMonitor(person)}><span className="circle-avatar">{person.initials}</span><div><small>{person.role}</small><b>{person.name}</b><em>{person.relation} · {person.phone}</em></div><Icon n="back" /></button>)}</div>
      </> : <>
        <div className="circle-owner"><span>JS</span><div><small>VOCÊ NESTE CÍRCULO</small><b>João Silva</b><em>Responsável familiar</em></div><strong>Ativo</strong></div>
        <div className="circle-section-head"><div><h2>Idosos sob sua responsabilidade</h2><p>Toque no cartão para consultar as informações.</p></div><span>{elders.length}</span></div>
        <div className="circle-list">{elders.map((elder) => <article key={elder.id} className="circle-card elder-card" onClick={() => setSelectedElder(elder)} tabIndex={0} onKeyDown={(event) => { if (event.key === "Enter") setSelectedElder(elder) }}><span className="circle-avatar">{elder.initials}</span><div><small>{elder.relation}</small><b>{elder.name}</b><em><i /> {elder.protection}</em></div><button className="edit-person" onClick={(event) => { event.stopPropagation(); setEditing(elder) }} aria-label={`Editar informações de ${elder.name}`}><Icon n="edit" s={18} /><span>Editar</span></button><Icon n="back" /></article>)}</div>
      </>}
    </section>

    {selectedMonitor && <div className="detail-overlay" onClick={() => setSelectedMonitor(null)}><article className="detail-sheet circle-detail" onClick={(event) => event.stopPropagation()}><div className="sheet-handle"/><header><div><small>MEMBRO DO SEU CÍRCULO</small><h2>{selectedMonitor.name}</h2></div><button onClick={() => setSelectedMonitor(null)}>×</button></header><div className="circle-detail-person"><span>{selectedMonitor.initials}</span><div><b>{selectedMonitor.role}</b><p>{selectedMonitor.relation}</p></div><em>Conectado</em></div><div className="circle-info"><div><small>Telefone</small><b>{selectedMonitor.phone}</b></div><div><small>Como essa pessoa ajuda</small><p>{selectedMonitor.access}</p></div></div><div className="quick-contact"><a href={`tel:${selectedMonitor.phone.replace(/\D/g, "")}`}><Icon n="phone"/> Ligar agora</a><button onClick={() => alert(`Mensagem de emergência preparada para ${selectedMonitor.name}.`)}><Icon n="message"/> Mensagem</button></div></article></div>}

    {selectedElder && !editing && <div className="detail-overlay" onClick={() => setSelectedElder(null)}><article className="detail-sheet circle-detail" onClick={(event) => event.stopPropagation()}><div className="sheet-handle"/><header><div><small>PESSOA PROTEGIDA</small><h2>{selectedElder.name}</h2></div><button onClick={() => setSelectedElder(null)}>×</button></header><div className="circle-detail-person"><span>{selectedElder.initials}</span><div><b>{selectedElder.relation}</b><p>{selectedElder.phone}</p></div><em>{selectedElder.protection}</em></div><div className="circle-info"><div><small>Telefone da pessoa protegida</small><b>{selectedElder.phone}</b></div><div><small>Contato de emergência</small><b>{selectedElder.emergencyName}</b><p>{selectedElder.emergencyPhone}</p></div></div><div className="quick-contact"><a href={`tel:${selectedElder.phone.replace(/\D/g, "")}`}><Icon n="phone"/> Ligar</a><button onClick={() => { setEditing(selectedElder); setSelectedElder(null) }}><Icon n="edit"/> Editar dados</button></div></article></div>}

    {editing && <div className="detail-overlay" onClick={() => setEditing(null)}><article className="detail-sheet circle-edit" onClick={(event) => event.stopPropagation()}><div className="sheet-handle"/><header><div><small>EDITAR VÍNCULO FAMILIAR</small><h2>{editing.name}</h2></div><button onClick={() => setEditing(null)}>×</button></header><label>Nome completo<input value={editing.name} onChange={(event) => setEditing({...editing, name:event.target.value})}/></label><label>Relação com a pessoa protegida<input value={editing.relation} onChange={(event) => setEditing({...editing, relation:event.target.value})} placeholder="Ex.: mãe, avô, pessoa assistida"/></label><label>Telefone<input value={editing.phone} onChange={(event) => setEditing({...editing, phone:event.target.value})}/></label><label>Contato de emergência<input value={editing.emergencyName} onChange={(event) => setEditing({...editing, emergencyName:event.target.value})}/></label><label>Telefone de emergência<input value={editing.emergencyPhone} onChange={(event) => setEditing({...editing, emergencyPhone:event.target.value})}/></label><button className="primary full" onClick={saveElder}><Icon n="check"/> Salvar alterações</button></article></div>}
  </main>
}

const scamStats=[
  {name:"Falso familiar",count:"2.847",change:"+18%",risk:"Alto",desc:"Criminosos se passam por filhos ou netos e pedem transferências urgentes.",signs:["Número novo","Pedido de segredo","Pix imediato"]},
  {name:"Falsa central bancária",count:"2.104",change:"+11%",risk:"Alto",desc:"Uma falsa equipe de segurança solicita códigos, senhas ou instalação de aplicativos.",signs:["Pedido de token","Ameaça de bloqueio","Ligação inesperada"]},
  {name:"Prêmio ou benefício",count:"1.536",change:"+7%",risk:"Médio",desc:"Uma recompensa inexistente é usada para cobrar taxas antecipadas.",signs:["Prêmio não solicitado","Taxa de liberação","Prazo curto"]},
  {name:"Falso suporte técnico",count:"983",change:"+4%",risk:"Médio",desc:"O golpista tenta obter acesso remoto ao celular da vítima.",signs:["Instalar aplicativo","Compartilhar tela","Acesso remoto"]},
]
function CatalogPage({role,back}:{role:Role;back:()=>void}){const[selected,setSelected]=useState<typeof scamStats[number]|null>(null);return <main className="data-page"><FlowHead title="Catálogo de golpes" back={back}/><section><div className="data-intro"><span className="step-label">INTELIGÊNCIA COLETIVA</span><h1>Golpes mais detectados</h1><p>Dados demonstrativos e anonimizados das detecções realizadas pela rede GuardAI.</p></div><div className="catalog-summary"><div><small>Detecções no mês</small><b>8.420</b><span>+12% em 30 dias</span></div><div className="bar-chart">{[38,56,44,72,63,86,78].map((v,i)=><i key={i} style={{height:`${v}%`}}/>)}</div></div><div className="catalog-head"><h2>Mais frequentes</h2><span>Outubro de 2026</span></div><div className="catalog-grid">{scamStats.map((item,i)=><button key={item.name} onClick={()=>setSelected(item)}><header><span>#{i+1}</span><em>Risco {item.risk.toLowerCase()}</em></header><h3>{item.name}</h3><div><b>{item.count}</b><small>detecções</small><strong>{item.change}</strong></div><p>{item.desc}</p><footer>Ver detalhes <Icon n="back" s={17}/></footer></button>)}</div><p className="data-disclaimer">{role==='idoso'?'Use este catálogo para reconhecer abordagens suspeitas antes de agir.':'Use estes dados para orientar e proteger as pessoas que você acompanha.'}</p></section>{selected&&<div className="detail-overlay" onClick={()=>setSelected(null)}><article className="detail-sheet" onClick={e=>e.stopPropagation()}><div className="sheet-handle"/><header><div><small>DETALHES DO GOLPE</small><h2>{selected.name}</h2></div><button onClick={()=>setSelected(null)}>×</button></header><div className="catalog-detail-stat"><b>{selected.count}</b><span>detecções nos últimos 30 dias</span><em>{selected.change}</em></div><p>{selected.desc}</p><h3>Sinais mais comuns</h3><div className="detail-tags">{selected.signs.map(s=><span key={s}>{s}</span>)}</div><aside><Icon n="shield"/><p><b>Como se proteger</b><br/>Interrompa o contato e confirme a história usando um número conhecido. Nunca informe códigos ou senhas.</p></aside><button className="primary full" onClick={()=>setSelected(null)}>Fechar detalhes</button></article></div>}</main>}

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
function Call({
  d,
  sec,
  end,
}: {
  d: typeof demos[number]
  sec: number
  end: () => void
}) {
  const [muted, setMuted] = useState(false)
  const [speaker, setSpeaker] = useState(true)
  return (
    <main className="call">
      <label>DEMONSTRAÇÃO · NENHUMA LIGAÇÃO REAL</label>
      <span className="avatar">
        <Icon n="user" s={46} />
      </span>
      <h1>{d.who}</h1>
      <p>{d.title}</p>
      <b>
        {String(Math.floor(sec / 60)).padStart(2, "0")}:
        {String(sec % 60).padStart(2, "0")}
      </b>
      <article>
        <small>TRANSCRIÇÃO EM TEMPO REAL</small>
        <p>“{d.lines[Math.min(Math.floor(sec / 3), 2)]}”</p>
      </article>
      <div>
        <button className={muted ? "control-on" : ""} onClick={() => setMuted(!muted)}>
          <Icon n="mic" />
          {muted ? "Ativar áudio" : "Silenciar"}
        </button>
        <button className={speaker ? "control-on" : ""} onClick={() => setSpeaker(!speaker)}>
          <Icon n="volume" />
          Viva-voz
        </button>
        <button className="hang" onClick={end}>
          <Icon n="phone" />
          Encerrar e analisar
        </button>
      </div>
      <small>Aguarde alguns segundos e encerre para mostrar o resultado.</small>
    </main>
  )
}
function Result({
  d,
  role,
  back,
  alert,
  verdict,
  onReview,
}: {
  d: typeof demos[number]
  role: Role
  back: () => void
  alert: () => void
  verdict: Verdict
  onReview: (verdict: Exclude<Verdict, "open">) => void
}) {
  const ok = d.risk === "Baixo"
  return (
    <main className="result">
      <button className="back" onClick={back}>
        <Icon n="back" /> Voltar ao painel
      </button>
      <section className={ok ? "resulthead ok" : "resulthead"}>
        <Icon n={ok ? "check" : "warn"} s={38} />
        <div>
          <small>ANÁLISE CONCLUÍDA</small>
          <h1>
            {ok
              ? "Nenhum sinal relevante de golpe"
              : "Possível tentativa de golpe identificada"}
          </h1>
          <p>
            {ok
              ? "A conversa não apresentou pressão nem pedidos financeiros."
              : "A conversa reuniu sinais que merecem atenção antes de qualquer pagamento."}
          </p>
        </div>
        <span>Risco {d.risk.toLowerCase()}</span>
      </section>
      <div className="cols">
        <Card title="Sinais encontrados" icon={ok ? "check" : "warn"}>
          {d.signals.map((x) => (
            <div className="finding" key={x}>
              <Icon n={ok ? "check" : "warn"} />
              <span>
                <b>{x}</b>
                <small>
                  {ok
                    ? "Comportamento esperado"
                    : "Indicador usado na classificação"}
                </small>
              </span>
            </div>
          ))}
        </Card>
        <Card title="Trecho analisado" icon="book">
          {d.lines.map((x, i) => (
            <p className="line" key={x}>
              <b>{i + 1}</b>
              {x}
            </p>
          ))}
        </Card>
      </div>
      {!ok && (
        <aside className="advice">
          <Icon n="shield" />
          <p>
            <b>Orientação recomendada</b>
            <br />
            Não transfira valores nem informe códigos. Confirme a identidade por
            um número conhecido.
          </p>
        </aside>
      )}
      {role === "responsavel" && <ReviewPanel verdict={verdict} onReview={onReview} />}
      <div className="actions">
        <button className="ghost dark" onClick={back}>
          Voltar ao painel
        </button>
        {!ok && role === "responsavel" && (
          <button className="danger" onClick={alert}>
            <Icon n="bell" /> Ver relatório do alerta
          </button>
        )}
      </div>
    </main>
  )
}

function Settings({ role, back, logout }: { role: Role; back: () => void; logout: () => void }) {
  const [voice, setVoice] = useState(false)
  const [large, setLarge] = useState(true)
  const [profile, setProfile] = useState<UserProfile>(() => loadProfile(role))
  const [editing, setEditing] = useState<UserProfile | null>(null)
  const [saved, setSaved] = useState(false)
  const saveProfile = () => {
    if (!editing || !editing.name.trim() || !editing.phone.trim()) return
    window.localStorage.setItem(`guardai-profile-${role}`, JSON.stringify(editing))
    setProfile(editing)
    setEditing(null)
    setSaved(true)
    window.setTimeout(() => setSaved(false), 2500)
  }
  return (
    <main className="flow settings-page">
      <FlowHead title="Configurações" back={back} />
      <section>
        <span className="step-label">PREFERÊNCIAS DO PERFIL</span>
        <h1>{role === "idoso" ? "Sua experiência" : "Acompanhamento familiar"}</h1>
        <p>Ajuste a aplicação de acordo com suas necessidades.</p>
        <button className="profile-setting" onClick={() => setEditing({...profile})}>
          <span>{profileInitials(profile.name)}</span>
          <div><small>MEU PERFIL</small><b>{profile.name}</b><em>{profile.phone}</em></div>
          <strong><Icon n="edit" s={17}/> Editar perfil</strong>
        </button>
        {saved && <div className="profile-saved"><Icon n="check" s={17}/> Perfil atualizado com sucesso.</div>}
        <button className="setting-row" onClick={() => setLarge(!large)}>
          <span><Icon n="book" /></span><div><b>Texto ampliado</b><small>Facilita a leitura das informações</small></div><i className={large ? "on" : ""} />
        </button>
        <button className="setting-row" onClick={() => setVoice(!voice)}>
          <span><Icon n="volume" /></span><div><b>Leitura por voz</b><small>Lê orientações importantes</small></div><i className={voice ? "on" : ""} />
        </button>
        <div className="privacy-box"><Icon n="lock" /><p><b>Privacidade protegida</b><br/>A análise depende de autorização e usa apenas o contexto necessário.</p></div>
        <button className="ghost dark full" onClick={logout}>Sair da conta</button>
      </section>
      {editing && <div className="detail-overlay" onClick={() => setEditing(null)}>
        <article className="detail-sheet profile-editor" onClick={(event) => event.stopPropagation()}>
          <div className="sheet-handle" />
          <header><div><small>INFORMAÇÕES DA CONTA</small><h2>Editar perfil</h2></div><button onClick={() => setEditing(null)}>×</button></header>
          <div className="editor-avatar"><span>{profileInitials(editing.name)}</span><div><b>{editing.name || "Seu nome"}</b><small>{role === "idoso" ? "Pessoa protegida" : "Responsável familiar"}</small></div></div>
          <label>Nome completo<input value={editing.name} onChange={(event) => setEditing({...editing, name:event.target.value})} /></label>
          <label>Telefone<input inputMode="tel" value={editing.phone} onChange={(event) => setEditing({...editing, phone:event.target.value})} /></label>
          <label>E-mail<input type="email" value={editing.email} onChange={(event) => setEditing({...editing, email:event.target.value})} /></label>
          {role === "idoso" && <label>Data de nascimento<input value={editing.birthDate ?? ""} onChange={(event) => setEditing({...editing, birthDate:event.target.value})} /></label>}
          <div className="editor-actions"><button className="ghost dark" onClick={() => setEditing(null)}>Cancelar</button><button className="primary" disabled={!editing.name.trim() || !editing.phone.trim()} onClick={saveProfile}><Icon n="check"/> Salvar alterações</button></div>
        </article>
      </div>}
    </main>
  )
}
