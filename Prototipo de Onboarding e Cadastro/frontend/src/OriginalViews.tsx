import { useEffect, useState, type ReactNode } from "react"
import { type Profile, type CircleLink, type Analysis } from "./lib/api"
import { type Page, type Role } from "./navigation"
import { Icon, Logo, FlowHead, Header, Card, Person, Metric, initials } from "./ui"
export function Welcome({ login, signup }: { login: () => void; signup: () => void }) {
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
export function Choose({
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
        <span className="step-label">ETAPA 1 DE 2</span>
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


const homeOf = (user: Profile): Page => user.account_type === "senior" ? "senior" : "care"
const date = (value: string) => new Date(value).toLocaleString("pt-BR")
export const risk = (analysis: Analysis) => analysis.risk_level === "high" ? "Alto" : analysis.risk_level === "medium" ? "Médio" : "Baixo"
export const verdictLabel = (value: Analysis["verdict"]) => value === "scam" ? "Confirmado como golpe" : value === "not_scam" ? "Confirmado: não é golpe" : "Aberto · aguardando responsável"

export function Frame({ user, go, logout, children, pending }: { user: Profile; go: (page: Page) => void; logout: () => void; children: ReactNode; pending: number }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [font, setFont] = useState(1)
  const select = (page: Page) => { setMenuOpen(false); go(page) }
  const items: [Page, string, "shield" | "book" | "warn" | "users" | "gear"][] = [[homeOf(user), "Início", "shield"], ["history", "Histórico", "book"], ["catalog", "Catálogo de golpes", "warn"], ["circle", "Círculo de Segurança", "users"], ["settings", "Configurações", "gear"]]
  function resize(value: number) { setFont(value); document.documentElement.dataset.readingSize = String(value) }
  function read() { if ("speechSynthesis" in window) { window.speechSynthesis.cancel(); const speech = new SpeechSynthesisUtterance(document.querySelector(".shell>main")?.textContent ?? ""); speech.lang = "pt-BR"; window.speechSynthesis.speak(speech) } }
  return <div className="shell"><aside><Logo light /><div className="person"><span>{initials(user.name)}</span><p><b>{user.name}</b><small>{user.account_type === "senior" ? "Pessoa protegida" : "Responsável familiar"}</small></p></div><button onClick={() => go(homeOf(user))}><Icon n="shield" /> Visão geral</button><button onClick={() => setMenuOpen(true)} aria-expanded={menuOpen}><Icon n="gear" /> Menu</button></aside><main>{children}</main>{menuOpen && <div className="menu-overlay" onClick={() => setMenuOpen(false)}><section className="bottom-sheet" onClick={event => event.stopPropagation()} role="dialog" aria-modal="true" aria-label="Menu principal"><div className="sheet-handle" /><header><h2>Menu</h2><button onClick={() => setMenuOpen(false)} aria-label="Fechar menu">×</button></header><div className="sheet-profile"><span>{initials(user.name)}</span><div><b>{user.name}</b><small>{user.account_type === "senior" ? "Perfil protegido" : "Responsável familiar"}</small></div></div><nav className="sheet-links">{items.map(([page, label, icon], index) => <button key={page} className={index === 0 ? "selected" : ""} onClick={() => select(page)}><Icon n={icon} /> {label}{page === "circle" && pending > 0 && <span className="invitation-count">{pending}</span>}</button>)}</nav><div className="font-control"><label>TAMANHO DA LETRA</label><div>{["A", "A+", "A++"].map((label, index) => <button key={label} className={font === index ? "active" : ""} aria-pressed={font === index} onClick={() => resize(index)}>{label}</button>)}<button aria-label="Leitura por voz" onClick={read}><Icon n="volume" s={18} /></button></div></div><button className="sheet-logout" onClick={logout}><Icon n="back" s={18} /> Sair da conta</button></section></div>}</div>
}

type DashboardProps = { user: Profile; links: CircleLink[]; analyses: Analysis[]; subject?: Profile; subjectAnalyses: Analysis[]; live?: Analysis; go: (page: Page) => void; logout: () => void; busy: boolean; start: (id: number, scenario: "safe" | "suspicious") => void; open: (analysis: Analysis) => void; selectSenior: (id: number) => void; onConsent: () => void }
export function Dashboard({ user, links, subject, subjectAnalyses, live, go, logout, busy, start, open, selectSenior, onConsent }: DashboardProps) {
  const [selected, setSelected] = useState<CircleLink | null>(null)
  const activeLinks = links.filter(link => link.status === "active")
  const senior = user.account_type === "senior"
  const protectionOn = subject?.consent_given ?? false
  return <Frame user={user} go={go} logout={logout} pending={links.filter(link => link.status === "pending" && link.requested_by !== user.id).length}>
    {senior ? <>
      <Header label="PAINEL DE PROTEÇÃO" title={`Olá, ${user.name}. ${protectionOn ? "Sua proteção está ativa." : "A proteção está pausada."}`} active={protectionOn} />
      <section className={`safe protection-status ${protectionOn ? "is-on" : "is-off"}`}><Icon n="shield" s={34} /><div><small>{protectionOn ? "MONITORAMENTO AUTORIZADO" : "PROTEÇÃO PAUSADA"}</small><h2>{protectionOn ? "Proteção funcionando nas simulações" : "O monitoramento não está autorizado"}</h2><p>{protectionOn ? "Seus responsáveis vinculados podem acompanhar as chamadas de teste." : "Ative a proteção para testar a identificação de possíveis golpes."}</p></div><button className={`protection-toggle ${protectionOn ? "on" : ""}`} disabled={busy} onClick={onConsent} aria-pressed={protectionOn} aria-label={protectionOn ? "Pausar proteção nas ligações" : "Ativar proteção nas ligações"}><i /></button></section>
      <button className={`protection-action ${protectionOn ? "active" : "paused"}`} disabled={busy} onClick={onConsent}><Icon n={protectionOn ? "check" : "phone"} /><span><b>{protectionOn ? "GuardAI está funcionando" : "Ativar proteção agora"}</b><small>{protectionOn ? "Toque para pausar temporariamente" : "Toque para autorizar suas chamadas de teste"}</small></span></button>
      <div className="cols"><Card title="Testar uma ligação protegida" icon="phone"><p>Veja passo a passo como o GuardAI reage a uma conversa suspeita.</p>{live ? <button className="primary full" onClick={() => open(live)}>Continuar simulação</button> : <><button className="primary full" disabled={busy || !protectionOn} onClick={() => start(user.id, "suspicious")}>Iniciar demonstração</button><button className="ghost dark full safe-demo" disabled={busy || !protectionOn} onClick={() => start(user.id, "safe")}>Simular conversa segura</button></>}<small className="note"><Icon n="check" s={15} /> Simulação segura, sem ligação real</small></Card><Card title="Quem cuida de você" icon="users">{!activeLinks.length && <p>Nenhuma pessoa vinculada ainda. Adicione alguém no seu Círculo de Segurança.</p>}{activeLinks.map(link => <Person key={link.id} initials={initials(link.member.name)} name={link.member.name} detail={`${link.relationship} · Responsável`} onClick={() => setSelected(link)} />)}{!activeLinks.length && <button className="ghost dark full" onClick={() => go("circle")}>Ver meu círculo</button>}</Card></div>
    </> : <>
      <Header label="PAINEL DO RESPONSÁVEL" title={subject ? `Acompanhamento de ${subject.name}` : "Seu acompanhamento familiar"} active={protectionOn} />
      {activeLinks.length > 1 && <label className="linked-subject">Pessoa que deseja acompanhar<select aria-label="Pessoa que deseja acompanhar" value={subject?.id ?? ""} onChange={event => selectSenior(Number(event.target.value))}>{activeLinks.map(link => <option key={link.id} value={link.member.id}>{link.member.name}</option>)}</select></label>}
      <section className={`care-protection ${protectionOn ? "on" : "off"}`}><div className="care-protection-icon"><Icon n="shield" /></div><div><small>{subject ? `PROTEÇÃO DE ${subject.name.toUpperCase()}` : "SEU CÍRCULO DE SEGURANÇA"}</small><h2>{protectionOn ? "Proteção ligada" : "Proteção desligada"}</h2><p>{subject ? protectionOn ? "As chamadas de teste estão autorizadas pela pessoa protegida." : "A pessoa protegida precisa autorizar o monitoramento." : "Vincule uma pessoa protegida para iniciar o acompanhamento."}</p></div><button className={`protection-toggle ${protectionOn ? "on" : ""}`} disabled aria-pressed={protectionOn} aria-label="Autorização controlada pela pessoa protegida"><i /></button></section>
      <div className="metrics"><Metric n="shield" a="Proteção" b={protectionOn ? "Ativa" : "Pausada"} /><Metric n="bell" a="Alertas pendentes" b={String(subjectAnalyses.filter(item => item.call_status === "ended" && item.verdict === "open").length)} /><Metric n="phone" a="Chamadas analisadas" b={String(subjectAnalyses.filter(item => item.call_status === "ended").length)} /></div>
      {!subject ? <section className="care-empty"><span><Icon n="users" s={30} /></span><h2>Seu círculo está vazio</h2><p>Adicione uma pessoa protegida e aguarde a aceitação do convite.</p><button className="primary full" onClick={() => go("circle")}>Abrir Círculo de Segurança</button></section> : !live ? <section className="care-empty"><span><Icon n="check" s={30} /></span><h2>Nenhuma ocorrência em andamento</h2><p>Quando {subject.name} iniciar uma simulação, a chamada aparecerá aqui.</p><button className="primary full" disabled={busy || !protectionOn} onClick={() => start(subject.id, "suspicious")}><Icon n="phone" /> Criar exemplo</button><small>Use o exemplo para testar o acompanhamento em tempo real.</small></section> : <Card title={`Ligação com risco ${risk(live).toLowerCase()}`} icon={live.risk_level === "low" ? "check" : "warn"}><div className="live-alert"><i /> ACONTECENDO AGORA · SIMULAÇÃO</div><span className="badge">RISCO {risk(live).toUpperCase()}</span><p>{date(live.created_at)} · {live.source}</p><div className="chips">{live.indicators.map(signal => <span key={signal}>{signal}</span>)}</div><blockquote>“{live.transcript[1] ?? live.transcript[0]}”</blockquote><button className="danger full connect-live" onClick={() => open(live)}><Icon n="volume" /> Conectar à chamada ao vivo</button></Card>}
      {subject && <><h2 className="recent">Atividade recente</h2>{!subjectAnalyses.length && <p className="empty-history">Nenhuma chamada registrada para {subject.name}.</p>}{subjectAnalyses.slice(0, 5).map(analysis => <button className="history history-action" key={analysis.id} onClick={() => open(analysis)}><i className={risk(analysis)} /><b>{analysis.title}</b><span>Risco {risk(analysis)}</span><small>{analysis.call_status === "live" ? "Em andamento" : verdictLabel(analysis.verdict)}</small></button>)}</>}
    </>}
    {selected && <div className="detail-overlay" onClick={() => setSelected(null)}><article className="detail-sheet caregiver-sheet" role="dialog" aria-label="Detalhes do responsável" onClick={event => event.stopPropagation()}><div className="sheet-handle" /><header><div><small>SEU CÍRCULO DE SEGURANÇA</small><h2>Detalhes do responsável</h2></div><button aria-label="Fechar detalhes" onClick={() => setSelected(null)}>×</button></header><div className="caregiver-profile"><span>{initials(selected.member.name)}</span><div><h3>{selected.member.name}</h3><p>{selected.relationship} · Responsável</p></div><em>Vinculado</em></div><div className="caregiver-info"><div><small>Telefone</small><b>{selected.member.phone}</b></div><div><small>Permissões</small><p>Recebe os resultados das simulações e pode registrar pareceres.</p></div><div><small>Status</small><b>Ativo no seu círculo de segurança</b></div></div><a className="call-senior" href={`tel:${selected.member.phone.replace(/\D/g, "")}`}><Icon n="phone" /> Ligar para {selected.member.name}</a></article></div>}
  </Frame>
}

export function Review({ user, analysis, busy, review }: { user: Profile; analysis: Analysis; busy: boolean; review: (verdict: "scam" | "not_scam") => void }) {
  if (analysis.verdict !== "open") return <section className={`review-panel closed ${analysis.verdict}`}><span><Icon n="check" /></span><div><small>CASO ENCERRADO PELO RESPONSÁVEL</small><h2>{verdictLabel(analysis.verdict)}</h2><p>O parecer humano foi registrado e esta análise não está mais pendente.</p></div></section>
  return <section className="review-panel"><div className="review-copy"><span><Icon n="user" /></span><div><small>VALIDAÇÃO DO RESPONSÁVEL</small><h2>Esta análise continua em aberto</h2><p>{user.account_type === "caregiver" ? "Revise as informações e encerre o caso com seu parecer." : "Aguarde a revisão de um responsável do seu círculo."}</p></div></div>{user.account_type === "caregiver" && <div className="review-actions"><button className="confirm-scam" disabled={busy} onClick={() => review("scam")}><Icon n="warn" /> É golpe</button><button className="confirm-safe" disabled={busy} onClick={() => review("not_scam")}><Icon n="check" /> Não é golpe</button></div>}</section>
}

function useElapsed(analysis: Analysis) {
  const [seconds, setSeconds] = useState(0)
  useEffect(() => { const tick = () => setSeconds(Math.max(0, Math.floor((Date.now() - new Date(analysis.created_at).getTime()) / 1000))); tick(); if (analysis.call_status !== "live") return; const timer = window.setInterval(tick, 1000); return () => window.clearInterval(timer) }, [analysis.id, analysis.call_status])
  return { seconds, time: `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}` }
}
type AnalysisProps = { phone?: string; user: Profile; analysis: Analysis; back: () => void; end: () => void; busy: boolean; review: (verdict: "scam" | "not_scam") => void }
export function AnalysisView(props: AnalysisProps) {
  const { user, analysis, back, end, busy } = props
  const { seconds, time } = useElapsed(analysis)
  const [muted, setMuted] = useState(false), [speaker, setSpeaker] = useState(true), [joined, setJoined] = useState(false)
  if (analysis.call_status === "ended") return user.account_type === "senior" ? <Result {...props} /> : <Incident {...props} />
  if (user.account_type === "senior") return <main className="call"><label>DEMONSTRAÇÃO · NENHUMA LIGAÇÃO REAL</label><span className="avatar"><Icon n="user" s={46} /></span><h1>{analysis.source}</h1><p>{analysis.title} · {analysis.profile_name}</p><b>{time}</b><article><small>TRANSCRIÇÃO EM TEMPO REAL · SIMULAÇÃO</small><p>“{analysis.transcript[Math.min(Math.floor(seconds / 3), Math.max(0, analysis.transcript.length - 1))]}”</p></article><div><button className={muted ? "control-on" : ""} onClick={() => setMuted(!muted)}><Icon n="mic" />{muted ? "Ativar áudio" : "Silenciar"}</button><button className={speaker ? "control-on" : ""} onClick={() => setSpeaker(!speaker)}><Icon n="volume" /> Viva-voz</button><button className="hang" disabled={busy} onClick={end}><Icon n="phone" /> Encerrar e analisar</button></div><small>Os controles fazem parte da simulação. Nenhuma chamada real está em curso.</small><button className="call-return" onClick={back}><Icon n="back" /> Voltar ao painel</button></main>
  return <main className="live-call-page"><header><button aria-label="Voltar" onClick={back}><Icon n="back" /></button><span><i /> ALERTA EM TEMPO REAL · SIMULAÇÃO</span></header><section className="live-person"><span className="avatar"><Icon n="user" s={42} /></span><small>PESSOA PROTEGIDA</small><h1>{analysis.profile_name}</h1><p>Em chamada com {analysis.source.toLowerCase()}</p><b>{time}</b></section><section className="ai-live"><div><Icon n="warn" /><span><small>RISCO ESTIMADO POR REGRAS</small><strong>Risco {risk(analysis).toLowerCase()}</strong></span></div><div className="mini-score"><i style={{ width: analysis.risk_level === "high" ? "100%" : analysis.risk_level === "medium" ? "50%" : "0%" }} /></div><p>{analysis.indicators.join(", ") || "Sem indícios relevantes nesta simulação."}</p></section><section className="live-transcript-card"><small>TRANSCRIÇÃO AO VIVO · SIMULADA</small><p>“{analysis.transcript[Math.min(Math.floor(seconds / 3), Math.max(0, analysis.transcript.length - 1))]}”</p><span><i /> Acompanhando a conversa de teste...</span></section>{!joined ? <button className="join-call" onClick={() => setJoined(true)}><Icon n="volume" /><span><b>Escutar chamada ao vivo</b><small>Acompanhar a transcrição simulada de {analysis.profile_name}</small></span></button> : <div className="remote-controls"><div className="connected-live"><i /> Você está acompanhando a simulação</div><div><button className={muted ? "" : "on"} onClick={() => setMuted(!muted)}><Icon n="mic" /><span>{muted ? "Ativar áudio" : "Silenciar"}</span></button><button className={speaker ? "on" : ""} onClick={() => setSpeaker(!speaker)}><Icon n="volume" /><span>Viva-voz</span></button></div><button className="end-remote" disabled={busy} onClick={end}><Icon n="phone" /> Encerrar ligação para {analysis.profile_name}</button><p>Ao encerrar, você verá o relatório completo da análise.</p></div>}</main>
}

function Result(props: AnalysisProps) {
  const { user, analysis, back, review, busy } = props, ok = analysis.risk_level === "low"
  return <main className="result"><button className="back" onClick={back}><Icon n="back" /> Voltar ao painel</button><section className={ok ? "resulthead ok" : "resulthead"}><Icon n={ok ? "check" : "warn"} s={38} /><div><small>ANÁLISE CONCLUÍDA · {analysis.profile_name}</small><h1>{ok ? "Nenhum sinal relevante de golpe" : "Possível tentativa de golpe identificada"}</h1><p>{ok ? "A conversa não apresentou pressão nem pedidos financeiros." : "A conversa reuniu sinais que merecem atenção antes de qualquer pagamento."}</p></div><span>Risco {risk(analysis).toLowerCase()}</span></section><div className="cols"><Card title="Sinais encontrados" icon={ok ? "check" : "warn"}>{analysis.indicators.length ? analysis.indicators.map(signal => <div className="finding" key={signal}><Icon n="warn" /><span><b>{signal}</b><small>Indicador usado na classificação</small></span></div>) : <div className="finding"><Icon n="check" /><span><b>Sem indícios relevantes</b><small>Conversa de teste classificada como segura</small></span></div>}</Card><Card title="Trecho analisado" icon="book">{analysis.transcript.map((line, index) => <p className="line" key={index}><b>{index + 1}</b>{line}</p>)}</Card></div>{!ok && <aside className="advice"><Icon n="shield" /><p><b>Orientação recomendada</b><br />Não transfira valores nem informe códigos. Confirme a identidade por um número conhecido.</p></aside>}<Review user={user} analysis={analysis} busy={busy} review={review} /><div className="actions"><button className="ghost dark" onClick={back}>Voltar ao painel</button></div></main>
}
function Incident({ user, analysis, phone, back, busy, review }: AnalysisProps) {
  return <main className="incident-page"><FlowHead title="Análise da ligação" back={back} /><section><div className="incident-title"><span><Icon n="shield" s={30} /></span><div><small>LIGAÇÃO DE TESTE ENCERRADA</small><h1>{analysis.risk_level === "low" ? "Conversa sem sinais relevantes" : "Possível golpe interrompido"}</h1><p>{analysis.profile_name} · {date(analysis.created_at)}</p></div></div><div className="score-card"><div><span>Nível de risco identificado</span><b>{risk(analysis)}</b></div><div className="risk-scale"><i style={{ width: analysis.risk_level === "high" ? "100%" : analysis.risk_level === "medium" ? "50%" : "0%" }} /><em /></div><footer><span>Baixo</span><span>Médio</span><span>Alto</span></footer><p>Classificação demonstrativa por regras locais, sem uso de uma IA.</p></div><div className="evidence-card"><label>TRECHOS E EXPRESSÕES IDENTIFICADOS</label><h2>O que foi analisado</h2>{analysis.transcript.map((line, index) => <article key={index}><span>{analysis.indicators[index] ?? "Trecho da conversa"}</span><p>“{line}”</p></article>)}</div><div className="safety-actions"><h2>Acompanhamento de {analysis.profile_name}</h2><p>Use um canal conhecido para confirmar como a pessoa está e orientar os próximos passos.</p>{phone && <><a className="call-senior" href={`tel:${phone.replace(/\D/g, "")}`}><Icon n="phone" /> Ligar para {analysis.profile_name}</a><a className="whatsapp" href={`https://wa.me/${phone.replace(/\D/g, "").length <= 11 ? "55" : ""}${phone.replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><Icon n="message" /> Enviar mensagem no WhatsApp</a></>}</div><Review user={user} analysis={analysis} busy={busy} review={review} /><button className="ghost dark full" onClick={back}>Voltar ao painel</button></section></main>
}

export function HistoryPage({ user, analyses, back, open, review, busy }: { user: Profile; analyses: Analysis[]; back: () => void; open: (analysis: Analysis) => void; review: (analysis: Analysis, verdict: "scam" | "not_scam") => void; busy: boolean }) {
  const [filter, setFilter] = useState("all"), [selectedId, setSelectedId] = useState<number | null>(null)
  const selected = analyses.find(item => item.id === selectedId)
  const visible = analyses.filter(item => filter === "all" || (filter === "open" ? item.verdict === "open" : item.verdict !== "open"))
  return <main className="data-page"><FlowHead title="Histórico de proteção" back={back} /><section><div className="data-intro"><span className="step-label">{user.account_type === "senior" ? "MINHAS LIGAÇÕES" : "HISTÓRICO DO MEU CÍRCULO"}</span><h1>Chamadas e alertas</h1><p>As análises ficam abertas até o responsável revisar e encerrar cada caso.</p></div><div className="history-filters">{[["all", "Todos"], ["open", "Em aberto"], ["closed", "Encerrados"]].map(([value, label]) => <button key={value} className={filter === value ? "active" : ""} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>)}</div>{!visible.length && <p>Nenhuma chamada neste filtro.</p>}<div className="history-list">{visible.map(item => <button key={item.id} onClick={() => setSelectedId(item.id)}><span className={`history-icon ${risk(item).toLowerCase()}`}><Icon n={item.risk_level === "low" ? "check" : "warn"} /></span><div><small>{date(item.created_at)} · {item.profile_name}</small><b>{item.title}</b><em>{item.source}</em><strong className={`case-status ${item.verdict}`}>{item.call_status === "live" ? "Em andamento" : verdictLabel(item.verdict)}</strong></div><span className={`history-score ${risk(item).toLowerCase()}`}>{risk(item)}</span></button>)}</div></section>{selected && <div className="detail-overlay" onClick={() => setSelectedId(null)}><article className="detail-sheet" role="dialog" aria-modal="true" aria-label="Detalhes da chamada" onClick={event => event.stopPropagation()}><div className="sheet-handle" /><header><div><small>ANÁLISE DA SIMULAÇÃO</small><h2>{selected.title}</h2></div><button aria-label="Fechar detalhes" onClick={() => setSelectedId(null)}>×</button></header><div className="detail-meta"><span>{date(selected.created_at)}</span><span>{selected.profile_name}</span><span>{verdictLabel(selected.verdict)}</span></div><div className="detail-score"><span>Risco estimado por regras</span><b>{risk(selected)}</b><div><i style={{ width: selected.risk_level === "high" ? "100%" : selected.risk_level === "medium" ? "50%" : "0%" }} /></div></div><h3>Indícios identificados</h3><div className="detail-tags">{selected.indicators.map(signal => <span key={signal}>{signal}</span>)}</div>{selected.transcript.map((line, index) => <blockquote key={index}>“{line}”</blockquote>)}<div className="detail-source"><Icon n="phone" /><p><small>Origem da chamada</small><b>{selected.source}</b></p></div>{selected.call_status === "ended" && <Review user={user} analysis={selected} busy={busy} review={verdict => review(selected, verdict)} />}<button className="primary full" onClick={() => open(selected)}>Ver chamada</button><button className="ghost dark full" onClick={() => setSelectedId(null)}>Fechar detalhes</button></article></div>}</main>
}

const categories = [
  { name: "Falso familiar", key: "familiar", count: "2.847", change: "+18%", risk: "Alto", desc: "Criminosos se passam por filhos ou netos e pedem transferências urgentes.", signs: ["Número novo", "Pedido de segredo", "Pix imediato"] },
  { name: "Falsa central bancária", key: "banc", count: "2.104", change: "+11%", risk: "Alto", desc: "Uma falsa equipe de segurança solicita códigos, senhas ou instalação de aplicativos.", signs: ["Pedido de token", "Ameaça de bloqueio", "Ligação inesperada"] },
  { name: "Prêmio ou benefício", key: "prêmio", count: "1.536", change: "+7%", risk: "Médio", desc: "Uma recompensa inexistente é usada para cobrar taxas antecipadas.", signs: ["Prêmio não solicitado", "Taxa de liberação", "Prazo curto"] },
  { name: "Falso suporte técnico", key: "suporte", count: "983", change: "+4%", risk: "Médio", desc: "O golpista tenta obter acesso remoto ao celular da vítima.", signs: ["Instalar aplicativo", "Compartilhar tela", "Acesso remoto"] },
]
export function Catalog({ user, back }: { user: Profile; back: () => void }) {
  const [selected, setSelected] = useState<string | null>(null)
  const stats = categories
  const detail = stats.find(category => category.key === selected)
  return <main className="data-page"><FlowHead title="Catálogo de golpes" back={back} /><section><div className="data-intro"><span className="step-label">INTELIGÊNCIA COLETIVA</span><h1>Golpes mais detectados</h1><p>Dados demonstrativos e anonimizados das detecções realizadas pela rede GuardAI.</p></div><div className="catalog-summary"><div><small>Detecções no mês</small><b>8.420</b><span>+12% em 30 dias</span></div><div className="bar-chart" aria-label="Gráfico demonstrativo de detecções">{[38, 56, 44, 72, 63, 86, 78].map((height, index) => <i key={index} style={{ height: `${height}%` }} />)}</div></div><div className="catalog-head"><h2>Mais frequentes</h2><span>Outubro de 2026</span></div><div className="catalog-grid">{stats.map((item, index) => <button key={item.key} onClick={() => setSelected(item.key)}><header><span>#{index + 1}</span><em>Risco {item.risk.toLowerCase()}</em></header><h3>{item.name}</h3><div><b>{item.count}</b><small>detecções</small><strong>{item.change}</strong></div><p>{item.desc}</p><footer>Ver detalhes <Icon n="back" s={17} /></footer></button>)}</div><p className="data-disclaimer">{user.account_type === "senior" ? "Use este catálogo para reconhecer abordagens suspeitas antes de agir." : "Use estes dados para orientar e proteger as pessoas que você acompanha."}</p></section>{detail && <div className="detail-overlay" onClick={() => setSelected(null)}><article className="detail-sheet" role="dialog" aria-modal="true" aria-label="Detalhes do golpe" onClick={event => event.stopPropagation()}><div className="sheet-handle" /><header><div><small>DETALHES DO GOLPE</small><h2>{detail.name}</h2></div><button aria-label="Fechar detalhes" onClick={() => setSelected(null)}>×</button></header><div className="catalog-detail-stat"><b>{detail.count}</b><span>detecções nos últimos 30 dias · demonstração</span><em>{detail.change}</em></div><p>{detail.desc}</p><h3>Sinais mais comuns</h3><div className="detail-tags">{detail.signs.map(sign => <span key={sign}>{sign}</span>)}</div><aside><Icon n="shield" /><p><b>Como se proteger</b><br />Interrompa o contato e confirme a história usando um número conhecido. Nunca informe códigos ou senhas.</p></aside><button className="primary full" onClick={() => setSelected(null)}>Fechar detalhes</button></article></div>}</main>
}
