import { create } from 'zustand'
import { getCurrentUser, login as apiLogin, setCookie, removeCookie } from '../api'

function getTokenFromCookie() {
  const decoded = decodeURIComponent(document.cookie)
  for (const c of decoded.split(';')) {
    const trimmed = c.trim()
    if (trimmed.startsWith('Authorization=')) {
      return trimmed.substring('Authorization='.length)
    }
  }
  return null
}

export const useAuthStore = create((set, get) => ({
  user: null,
  token: getTokenFromCookie(),
  loading: false,

  init: async () => {
    const token = getTokenFromCookie()
    if (!token) return
    set({ loading: true })
    try {
      const user = await getCurrentUser()
      set({ user, token, loading: false })
    } catch {
      removeCookie('Authorization')
      set({ user: null, token: null, loading: false })
    }
  },

  login: async (username, password, totpCode = null) => {
    const data = await apiLogin(username, password, totpCode)
    if (data.requires_2fa) return { requires_2fa: true }
    const token = data.access_token
    setCookie('Authorization', token, 30)
    const user = await getCurrentUser()
    set({ user, token })
    return user
  },

  logout: () => {
    removeCookie('Authorization')
    set({ user: null, token: null })
  },

  setUser: (user) => set({ user }),
}))
