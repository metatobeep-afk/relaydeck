'use client'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, ShoppingCart, Package, Users, Truck,
  Factory, Mail, Settings, LogOut, Tablet, ShieldCheck, X,
} from 'lucide-react'
import { LogoMark } from './logo-mark'
import { L } from '@/lib/labels'

const OWNER_EMAIL = 'cbrickvalue@gmail.com'

const navGroups = [
  {
    label: L.overview,
    items: [
      { href: '/dashboard', label: L.dashboard, icon: LayoutDashboard },
      { href: '/orders',    label: L.orders,    icon: ShoppingCart },
    ],
  },
  {
    label: L.catalog,
    items: [
      { href: '/products',  label: L.products,  icon: Package },
      { href: '/customers', label: L.customers, icon: Users },
    ],
  },
  {
    label: L.operations,
    items: [
      { href: '/production', label: L.production, icon: Factory },
      { href: '/suppliers',  label: L.suppliers,  icon: Truck },
      { href: '/marketing',  label: L.marketing,  icon: Mail },
    ],
  },
  {
    label: 'Admin',
    items: [
      { href: '/admin', label: 'Προσκλήσεις', icon: ShieldCheck },
    ],
  },
]

interface SidebarProps {
  open?: boolean
  onClose?: () => void
}

export function Sidebar({ open = false, onClose }: SidebarProps) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()
  const [isOwner, setIsOwner] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setIsOwner(data.user?.email === OWNER_EMAIL)
    })
  }, [])

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <aside className={cn(
      'sidebar w-64 flex flex-col fixed left-0 top-0 bottom-0 z-40 select-none',
      'transition-transform duration-200 ease-in-out',
      'lg:translate-x-0 lg:w-56',
      open ? 'translate-x-0' : '-translate-x-full',
    )}>

      {/* Mobile close button */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Κλείσιμο μενού"
        className="lg:hidden absolute top-4 right-3 sidebar-item p-1.5 rounded-md"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Brand */}
      <div className="px-4 pt-5 pb-4">
        <div className="flex items-center gap-2.5">
          <LogoMark size={28} />
          <div>
            <p className="sidebar-logo-name text-[14px] font-bold leading-tight tracking-tight">RelayDeck</p>
            <p className="sidebar-logo-sub text-[11px] leading-tight">B2B Platform</p>
          </div>
        </div>
      </div>

      {/* Exhibition shortcut */}
      <div className="px-3 pb-3">
        <Link href="/pda" className="sidebar-pda flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium">
          <Tablet className="w-3.5 h-3.5 flex-shrink-0" />
          {L.exhibitionMode}
          <span className="sidebar-pda-badge ml-auto text-[10px] px-1.5 py-0.5 rounded font-semibold">PDA</span>
        </Link>
      </div>

      <div className="sidebar-divider mx-3 mb-4 border-t" />

      {/* Nav */}
      <nav className="flex-1 px-3 space-y-5 overflow-y-auto">
        {navGroups.filter(g => g.label !== 'Admin' || isOwner).map(group => (
          <div key={group.label}>
            <p className="sidebar-section-label px-2 mb-1.5 text-[10px] font-semibold uppercase tracking-widest">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map(({ href, label, icon: Icon }) => (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'sidebar-item flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium w-full',
                    isActive(href) && 'active'
                  )}
                >
                  <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                  {label}
                  {isActive(href) && <span className="sidebar-item-dot ml-auto w-1 h-3.5 rounded-full flex-shrink-0" />}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Bottom */}
      <div className="sidebar-divider px-3 pt-3 pb-4 mt-4 border-t space-y-0.5">
        <Link
          href="/settings"
          className={cn(
            'sidebar-item flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium w-full',
            isActive('/settings') && 'active'
          )}
        >
          <Settings className="w-3.5 h-3.5" />
          {L.settings}
        </Link>
        <button
          type="button"
          onClick={handleLogout}
          className="sidebar-item flex items-center gap-2.5 px-2.5 py-[7px] rounded-md text-[13px] font-medium w-full text-left"
        >
          <LogOut className="w-3.5 h-3.5" />
          {L.signOut}
        </button>
      </div>
    </aside>
  )
}
