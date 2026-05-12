import { create } from 'zustand'

export const useAuthStore = create((set) => ({
  user: null,
  token: localStorage.getItem('grace_token'),
  isAuthenticated: !!localStorage.getItem('grace_token'),

  login: (user, token) => {
    localStorage.setItem('grace_token', token)
    set({ user, token, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('grace_token')
    set({ user: null, token: null, isAuthenticated: false })
  },
}))
