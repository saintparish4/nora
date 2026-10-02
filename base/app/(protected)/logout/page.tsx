'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'

export default function Page() {
  const { logout } = useAuth()

  useEffect(() => {
    logout()
  }, [logout])

  return (
    <div className="flex min-h-screen items-center justify-center text-[0.9375rem] text-body">
      <p>Signing you out…</p>
    </div>
  )
}


