'use client'

import { useEffect } from 'react'
import { useAuth } from '@/lib/auth/context'

export default function Page() {
  const { logout } = useAuth()

  useEffect(() => {
    logout()
  }, [logout])

  return (
    <div className="p-6">
      <p>Signing you out…</p>
    </div>
  )
}


