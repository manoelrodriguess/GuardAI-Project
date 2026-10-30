export type ProfileInput = {
  name: string

  phone: string
  account_type: "senior" | "caregiver"
  consent_given: boolean
  relationship?: string
}

type ApiError = {
  detail?: string | { msg?: string }[]
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, {
    ...options,

    headers: {
      "Content-Type": "application/json",

      ...options?.headers,
    },
  })

  if (!response.ok) {
    let message = `Erro ${response.status} ao comunicar com o backend.`

    try {
      const body = (await response.json()) as ApiError

      if (typeof body.detail === "string") {
        message = body.detail
      } else if (Array.isArray(body.detail)) {
        message = body.detail
          .map((error) => error.msg ?? "Dados inválidos.")
          .join(" ")
      }
    } catch {
      
    }

    throw new Error(message)
  }

  return response.json() as Promise<T>
}

export const api = {
  health: () => request<{ status: string }>("/health"),

  createProfile: (profile: ProfileInput) =>
    request<{ id: number }>("/profiles", {
      method: "POST",

      body: JSON.stringify(profile),
    }),
}
