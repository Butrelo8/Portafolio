// ─── User ─────────────────────────────────────────────
export type User = {
  id: string
  clerkId: string
  email: string
  name: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── API Response ──────────────────────────────────────
export type ApiSuccess<T> = {
  data: T
}

export type ApiError = {
  error: {
    code: string
    message: string
    status: number
  }
}

export type ApiResponse<T> = ApiSuccess<T> | ApiError

// ─── Environment ──────────────────────────────────────
export type Env = {
  Variables: {
    user: User
  }
}
