'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type Role = 'admin' | 'salesperson' | null

const RoleContext = createContext<Role>(null)

export function RoleProvider({ children }: { children: React.ReactNode }) {
  const [role, setRole] = useState<Role>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return
      supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single()
        .then(({ data: profile }) => setRole((profile?.role as Role) ?? 'admin'))
    })
  }, [])

  return <RoleContext.Provider value={role}>{children}</RoleContext.Provider>
}

export function useRole(): Role { return useContext(RoleContext) }
export function useIsAdmin(): boolean { return useContext(RoleContext) === 'admin' }
