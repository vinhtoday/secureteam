'use client'

import { useAuthStore } from '@/stores/auth-store'

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const isInitialized = useAuthStore((s) => s.isInitialized)

  if (!isInitialized) {
    return null // Let Providers handle the loading state
  }

  if (!isAuthenticated) {
    return null // Let page.tsx handle showing login form
  }

  return <>{children}</>
}
