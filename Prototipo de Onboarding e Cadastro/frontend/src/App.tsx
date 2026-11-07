import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { CirclePage, ProfileForm, SettingsPage, errorMessage } from "./ProfilesPage"
import { api, ApiError, type Profile, type CircleLink, type Analysis } from "./lib/api"
import { useNavigation, type Page } from "./navigation"
import { Logo, Icon, FlowHead as Head } from "./ui"
import { Dashboard, Welcome, Choose, AnalysisView, HistoryPage, Catalog } from "./OriginalViews"

import "./bindings.css"

const homeOf = (user: Profile): Page => user.account_type === "senior" ? "senior" : "care"
const roleOf = (user: Profile) => user.account_type === "senior" ? "idoso" as const : "responsavel" as const
export default function App() {
  const { page, role, analysisId, navigate, back } = useNavigation()
  const [user, setUser] = useState<Profile | null>(null)
  const [links, setLinks] = useState<CircleLink[]>([]), [analyses, setAnalyses] = useState<Analysis[]>([])
  const [loading, setLoading] = useState(true), [busy, setBusy] = useState(false), [error, setError] = useState("")
  const [selectedSeniorId, setSelectedSeniorId] = useState<number | null>(null)
  const requestVersion = useRef(0)
  async function refresh(silent = false) {
    const version = ++requestVersion.current
    if (!silent) setError("")
    try {
      const current = await api.me()
      const [circle, history] = await Promise.all([api.links(), api.analyses()])
      if (version !== requestVersion.current) return
      setUser(current); setLinks(circle); setAnalyses(history)
    } catch (error) {
      if (version !== requestVersion.current) return
      if (error instanceof ApiError && error.status === 401) { setUser(null); setLinks([]); setAnalyses([]) }
      else setError(errorMessage(error))
    } finally { if (version === requestVersion.current) setLoading(false) }
  }
  useEffect(() => { void refresh() }, [])
  useEffect(() => {
    if (!user) return
    const update = () => { void refresh(true) }
    const timer = window.setInterval(update, 4000)
    window.addEventListener("focus", update)
    return () => { window.clearInterval(timer); window.removeEventListener("focus", update) }
  }, [user?.id])
  const publicPage = ["welcome", "login", "choose", "register"].includes(page)
  useEffect(() => {
    if (loading) return
    if (!user && !publicPage) { navigate("login", { replace: true, root: true }); return }
    if (!user) return
    const wrongPanel = user.account_type === "senior" ? ["care", "live", "incident", "circle-data"].includes(page) : ["senior", "call", "result"].includes(page)
    if (publicPage || wrongPanel) navigate(homeOf(user), { role: roleOf(user), replace: true, root: true })
    else if (role !== roleOf(user)) navigate(page, { role: roleOf(user), replace: true })
  }, [loading, user?.id, user?.account_type, page, role])
  const selectedAnalysis = analyses.find(item => item.id === analysisId)
  useEffect(() => {
    if (selectedAnalysis?.call_status === "ended" && (page === "call" || page === "live")) navigate(user?.account_type === "senior" ? "result" : "incident", { replace: true })
  }, [selectedAnalysis?.call_status, page])
  function go(target: Page) { setError(""); navigate(target, user ? { role: roleOf(user) } : {}) }
  function signedIn(profile: Profile) {
    ++requestVersion.current; setUser(profile); setLinks([]); setAnalyses([]); setSelectedSeniorId(null); setError("")
    navigate(homeOf(profile), { role: roleOf(profile), replace: true, root: true }); void refresh()
  }
  function clearSession() {
    ++requestVersion.current; setUser(null); setLinks([]); setAnalyses([]); setSelectedSeniorId(null); setError("")
    navigate("welcome", { replace: true, root: true })
  }
  async function act(action: () => Promise<unknown>) {
    if (busy) return
    setBusy(true); setError("")
    try { await action() } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  function logout() { void act(async () => { await api.logout(); clearSession() }) }
  async function start(profileId: number, scenario: "suspicious" | "safe") {
    await act(async () => {
      const analysis = await api.simulate(profileId, scenario)
      setAnalyses(current => [analysis, ...current.filter(item => item.id !== analysis.id)])
      navigate(user!.account_type === "senior" ? "call" : "live", { analysisId: analysis.id, role: roleOf(user!) })
      await refresh(true)
    })
  }
  async function end(analysis: Analysis) {
    await act(async () => {
      const saved = await api.end(analysis.id)
      setAnalyses(current => current.map(item => item.id === saved.id ? saved : item))
      navigate(user!.account_type === "senior" ? "result" : "incident", { analysisId: saved.id, replace: true })
    })
  }
  function review(analysis: Analysis, verdict: "scam" | "not_scam") {
    void act(async () => { const saved = await api.review(analysis.id, verdict); setAnalyses(current => current.map(item => item.id === saved.id ? saved : item)) })
  }
  if (loading) return <main className="flow"><section><p role="status">Carregando sua conta…</p></section></main>
  if (!user) {
    if (error) return <main className="flow"><section><Logo /><p className="form-error" role="alert">{error}</p><button className="primary" onClick={() => { setLoading(true); void refresh() }}>Tentar conectar novamente</button></section></main>
    if (page === "login" || !publicPage) return <Login back={back} signedIn={signedIn} />
    if (page === "choose") return <Choose back={back} choose={selected => navigate("register", { role: selected })} />
    if (page === "register") return <main className="flow"><Head title="Criar minha conta" back={back} /><section><span className="step-label">ETAPA 2 DE 2</span><h1>{role === "idoso" ? "Cadastro da pessoa protegida" : "Cadastro do responsável"}</h1><p>Use seu telefone e crie uma senha. Depois, convide a outra pessoa no Círculo de Segurança.</p><ProfileForm key={role} accountType={role === "idoso" ? "senior" : "caregiver"} onSaved={signedIn} onCancel={back} /></section></main>
    return <Welcome login={() => go("login")} signup={() => go("choose")} />
  }
  if (publicPage) return <main className="flow"><section><p>Entrando na sua conta…</p></section></main>
  const activeLinks = links.filter(link => link.status === "active")
  const seniors = activeLinks.map(link => link.member).filter(person => person.account_type === "senior")
  const subject = user.account_type === "senior" ? user : seniors.find(person => person.id === selectedSeniorId) ?? seniors[0]
  const subjectAnalyses = subject ? analyses.filter(item => item.profile_id === subject.id) : []
  const live = subjectAnalyses.find(item => item.call_status === "live")
  const toPanel = () => navigate(homeOf(user), { role: roleOf(user), replace: true, root: true })
  let content: ReactNode
  if (page === "circle" || page === "circle-data") content = <CirclePage key={page} management={page === "circle-data"} user={user} links={links} back={back} refresh={() => refresh()} />
  else if (page === "settings") content = <SettingsPage user={user} openCircleData={() => go("circle-data")} back={back} logout={logout} onDeleted={clearSession} onSaved={saved => { setUser(saved); void refresh() }} />
  else if (page === "history") content = <HistoryPage user={user} analyses={analyses} back={back} busy={busy} review={review} open={analysis => navigate(analysis.call_status === "live" ? user.account_type === "senior" ? "call" : "live" : user.account_type === "senior" ? "result" : "incident", { analysisId: analysis.id })} />
  else if (page === "catalog") content = <Catalog user={user} back={back} />
  else if (["call", "live", "result", "incident"].includes(page)) content = selectedAnalysis ? <AnalysisView user={user} analysis={selectedAnalysis} phone={selectedAnalysis.profile_id === user.id ? user.phone : activeLinks.find(link => link.member.id === selectedAnalysis.profile_id)?.member.phone} back={selectedAnalysis.call_status === "live" ? back : toPanel} busy={busy} end={() => void end(selectedAnalysis)} review={verdict => review(selectedAnalysis, verdict)} /> : <main className="flow"><Head title="Chamada" back={toPanel} /><section><p>Esta chamada não está disponível na sua conta ou no seu círculo.</p><button className="primary" onClick={toPanel}>Voltar ao painel</button></section></main>
  else content = <Dashboard user={user} links={links} analyses={analyses} subject={subject} subjectAnalyses={subjectAnalyses} live={live} go={go} logout={logout} busy={busy} selectSenior={setSelectedSeniorId} start={(id, scenario) => { void start(id, scenario) }} open={analysis => navigate(analysis.call_status === "live" ? user.account_type === "senior" ? "call" : "live" : user.account_type === "senior" ? "result" : "incident", { analysisId: analysis.id })} onConsent={() => void act(async () => { const saved = await api.updateProfile(user.id, { ...user, consent_given: !user.consent_given }); setUser(saved); await refresh(true) })} />
  return <>{error && <div className="global-error" role="alert">{error}<button onClick={() => setError("")} aria-label="Fechar aviso">×</button></div>}{content}</>
}

function Login({ back, signedIn }: { back: () => void; signedIn: (user: Profile) => void }) {
  const [phone, setPhone] = useState(""), [password, setPassword] = useState("")
  const [error, setError] = useState(""), [busy, setBusy] = useState(false)
  const [mode, setMode] = useState<"senior" | "caregiver">("senior")
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("")
    try { signedIn(await api.login(phone, password)) } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  return <main className="flow"><Head title="Entrar" back={back} /><section><span className="flow-icon"><Icon n="lock" s={30} /></span><h1>Entre na sua conta</h1><p>Acesse sua conta GuardAI.</p><div className="role-switch"><button type="button" className={mode === "senior" ? "on" : ""} onClick={() => setMode("senior")}>Idoso</button><button type="button" className={mode === "caregiver" ? "on" : ""} onClick={() => setMode("caregiver")}>Responsável</button></div><form className="profile-form" onSubmit={submit}><label>Telefone<input required type="tel" autoComplete="username" value={phone} onChange={e => setPhone(e.target.value)} /></label><label>Senha<input required type="password" maxLength={128} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} /></label>{error && <p role="alert" className="form-error">{error}</p>}<button className="primary full" disabled={busy}>{busy ? "Entrando…" : "Entrar"}</button></form><small className="demo-info">O painel será aberto conforme o seu cadastro.</small></section></main>
}
