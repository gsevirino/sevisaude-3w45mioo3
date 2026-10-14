import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import pb from '@/lib/pocketbase/client'
import type { User } from '@/types/health'

interface AuthContextType {
  user: User | null
  token: string | null
  isLoading: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  refresh: () => Promise<void>
  updateProfile: (data: Partial<User>) => Promise<User>
  requestPasswordReset: (email: string) => Promise<void>
  confirmPasswordReset: (token: string, password: string) => Promise<void>
  requestVerification: (email: string) => Promise<void>
  confirmVerification: (token: string) => Promise<void>
  deleteAccount: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>((pb.authStore.model as unknown as User) || null)
  const [token, setToken] = useState<string | null>(pb.authStore.token || null)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  const refresh = useCallback(async () => {
    try {
      if (pb.authStore.isValid) {
        const authData = await pb.collection('users').authRefresh()
        setUser(authData.record as unknown as User)
        setToken(pb.authStore.token)
      } else {
        setUser(null)
        setToken(null)
      }
    } catch {
      pb.authStore.clear()
      setUser(null)
      setToken(null)
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refresh()
    const unsubscribe = pb.authStore.onChange((newToken, model) => {
      setToken(newToken)
      setUser((model as unknown as User) || null)
    })
    return () => {
      unsubscribe()
    }
  }, [refresh])

  const login = async (email: string, password: string) => {
    const authData = await pb.collection('users').authWithPassword(email.trim(), password)
    setUser(authData.record as unknown as User)
    setToken(pb.authStore.token)
  }

  const signup = async (name: string, email: string, password: string) => {
    await pb.collection('users').create({
      name: name.trim(),
      email: email.trim(),
      password,
      passwordConfirm: password,
    })
    // try to request email verification
    try {
      await pb.collection('users').requestVerification(email.trim())
    } catch {
      // ignore in dev if SMTP not configured
    }
    await login(email, password)
  }

  const logout = () => {
    pb.authStore.clear()
    setUser(null)
    setToken(null)
  }

  const updateProfile = async (data: Partial<User>): Promise<User> => {
    if (!user) throw new Error('Usuário não autenticado')
    const updated = await pb.collection('users').update<User>(user.id, data)
    setUser(updated)
    return updated
  }

  const requestPasswordReset = async (email: string) => {
    await pb.collection('users').requestPasswordReset(email.trim())
  }

  const confirmPasswordReset = async (token: string, password: string) => {
    await pb.collection('users').confirmPasswordReset(token, password, password)
  }

  const requestVerification = async (email: string) => {
    await pb.collection('users').requestVerification(email.trim())
  }

  const confirmVerification = async (token: string) => {
    await pb.collection('users').confirmVerification(token)
    await refresh()
  }

  const deleteAccount = async () => {
    if (!user) return
    await pb.collection('users').delete(user.id)
    logout()
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        isAuthenticated: !!user && pb.authStore.isValid,
        login,
        signup,
        logout,
        refresh,
        updateProfile,
        requestPasswordReset,
        confirmPasswordReset,
        requestVerification,
        confirmVerification,
        deleteAccount,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
