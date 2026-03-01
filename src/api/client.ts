const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ""

class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    throw new ApiError(
      response.status,
      (body as { error?: string }).error ?? response.statusText,
    )
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

function buildUrl(path: string): string {
  return `${BASE_URL}${path}`
}

export const apiClient = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(buildUrl(path))
    return handleResponse<T>(res)
  },

  async post<T>(path: string, data?: unknown): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    })
    return handleResponse<T>(res)
  },

  async put<T>(path: string, data: unknown): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })
    return handleResponse<T>(res)
  },

  async patch<T>(path: string, data?: unknown): Promise<T> {
    const res = await fetch(buildUrl(path), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: data ? JSON.stringify(data) : undefined,
    })
    return handleResponse<T>(res)
  },

  async delete<T>(path: string): Promise<T> {
    const res = await fetch(buildUrl(path), { method: "DELETE" })
    return handleResponse<T>(res)
  },
}

export { ApiError }
