export type ProfileInput = {
  name: string
  phone: string
  account_type: "senior" | "caregiver"
  consent_given: boolean
  relationship?: string | null
  email?: string | null
  birth_date?: string | null
}
export type Profile = ProfileInput & { id: number; created_at: string }
export type CircleLink = { id: number; member: Profile; relationship: string; status: "pending" | "active"; requested_by: number }
export type Analysis = { id: number; profile_id: number; profile_name: string; risk_level: "low" | "medium" | "high"; indicators: string[]; engine: string; created_at: string; title: string; source: string; transcript: string[]; verdict: "open" | "scam" | "not_scam"; call_status: "live" | "ended" }
export class ApiError extends Error { constructor(message: string, public status: number) { super(message) } }

async function response(path: string, options?: RequestInit): Promise<Response> {
  let result: Response
  try { result = await fetch(`/api${path}`, { ...options, credentials: "same-origin", headers: { "Content-Type": "application/json", ...options?.headers } }) }
  catch { throw new ApiError("Não foi possível conectar ao servidor. Verifique se o backend está iniciado.", 0) }
  if (!result.ok) {
    let message = `Erro ${result.status} ao comunicar com o servidor.`
    try {
      const body = await result.json()
      message = typeof body.detail === "string" ? body.detail : Array.isArray(body.detail) ? body.detail.map((e: { msg: string }) => e.msg).join(" ") : message
    } catch { /* Preserva a mensagem HTTP se a resposta não for JSON. */ }
    throw new ApiError(message, result.status)
  }
  return result
}
async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const result = await response(path, options)
  return result.status === 204 ? undefined as T : result.json() as Promise<T>
}
const body = (method: string, data: unknown) => ({ method, body: JSON.stringify(data) })
export const api = {
  me: () => request<Profile>("/auth/me"),
  register: (profile: ProfileInput, password: string) => request<Profile>("/auth/register", body("POST", { profile, password })),
  login: (phone: string, password: string) => request<Profile>("/auth/login", body("POST", { phone, password })),
  logout: () => request<void>("/auth/logout", { method: "POST" }),
  listProfiles: () => request<Profile[]>("/profiles"),
  getProfile: (id: number) => request<Profile>(`/profiles/${id}`),
  updateProfile: (id: number, profile: ProfileInput) => request<Profile>(`/profiles/${id}`, body("PUT", profile)),
  deleteProfile: (id: number) => request<void>(`/profiles/${id}`, { method: "DELETE" }),
  links: () => request<CircleLink[]>("/links"),
  invite: (phone: string, relationship: string) => request<CircleLink[]>("/links", body("POST", { phone, relationship })),
  accept: (id: number) => request<CircleLink[]>(`/links/${id}/accept`, { method: "POST" }),
  updateCircleMember: (id: number, profile: ProfileInput, relationship: string) => request<CircleLink>(`/links/${id}/member`, body("PUT", { profile, relationship })),
  unlink: (id: number) => request<void>(`/links/${id}`, { method: "DELETE" }),
  analyses: () => request<Analysis[]>("/analyses"),
  simulate: (profile_id: number, scenario: "safe" | "suspicious") => request<Analysis>("/simulations", body("POST", { profile_id, scenario })),
  end: (id: number) => request<Analysis>(`/analyses/${id}/end`, { method: "POST" }),
  review: (id: number, verdict: "scam" | "not_scam") => request<Analysis>(`/analyses/${id}/review`, body("PUT", { verdict })),
  exportProfiles: async () => {
    const result = await response("/profiles/export.csv")
    const url = URL.createObjectURL(await result.blob())
    const link = document.createElement("a")
    link.href = url; link.download = "guardai-perfis.csv"; link.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  },
}
