import { useEffect, useRef, useState } from "react"
export type Role = "idoso" | "responsavel"
export const pages = ["welcome", "login", "choose", "register", "senior", "care", "call", "result", "settings", "live", "incident", "history", "catalog", "circle", "circle-data"] as const
export type Page = typeof pages[number]
type Route = { page: Page; role: Role; analysisId: number | null }
type Navigation = { route: Route; depth: number }
const normalize = (route: Route): Route => ({ ...route, analysisId: ["call", "result", "live", "incident"].includes(route.page) ? route.analysisId : null })
function address(route: Route) { return `#/${route.page}?role=${route.role}${route.analysisId ? `&analysis=${route.analysisId}` : ""}` }
function readLocation(): Navigation {
  const [path, search = ""] = window.location.hash.replace(/^#\/?/, "").split("?")
  const query = new URLSearchParams(search), id = Number(query.get("analysis"))
  const route = normalize({ page: pages.includes(path as Page) ? path as Page : "welcome", role: query.get("role") === "responsavel" ? "responsavel" : "idoso", analysisId: Number.isSafeInteger(id) && id > 0 ? id : null })
  const saved = window.history.state?.guardaiNavigation as Navigation | undefined
  return saved && JSON.stringify(saved.route) === JSON.stringify(route) && Number.isInteger(saved.depth) ? saved : { route, depth: 0 }
}
export function useNavigation() {
  const [state, setState] = useState<Navigation>(readLocation)
  const current = useRef(state)
  function commit(next: Navigation, replace = false) {
    current.current = next
    window.history[replace ? "replaceState" : "pushState"]({ guardaiNavigation: next }, "", address(next.route))
    setState(next); window.scrollTo(0, 0)
  }
  useEffect(() => {
    window.history.replaceState({ guardaiNavigation: current.current }, "", address(current.current.route))
    const restore = () => { const next = readLocation(); current.current = next; window.history.replaceState({ guardaiNavigation: next }, "", address(next.route)); setState(next); window.scrollTo(0, 0) }
    window.addEventListener("popstate", restore); window.addEventListener("hashchange", restore)
    return () => { window.removeEventListener("popstate", restore); window.removeEventListener("hashchange", restore) }
  }, [])
  function navigate(page: Page, options: { role?: Role; analysisId?: number | null; replace?: boolean; root?: boolean } = {}) {
    const previous = current.current
    const route = normalize({ ...previous.route, page, role: options.role ?? previous.route.role, analysisId: options.analysisId === undefined ? previous.route.analysisId : options.analysisId })
    if (JSON.stringify(route) === JSON.stringify(previous.route)) return
    commit({ route, depth: options.root ? 0 : previous.depth + (options.replace ? 0 : 1) }, options.replace)
  }
  function back() {
    const { route, depth } = current.current
    if (depth > 0) { window.history.back(); return }
    navigate(["login", "choose", "register"].includes(route.page) ? "welcome" : route.role === "idoso" ? "senior" : "care", { replace: true, root: true })
  }
  return { ...state.route, navigate, back }
}
