'use client'
import { Menu } from 'lucide-react'
import { LogoMark } from './logo-mark'

export function MobileHeader({ onMenuOpen }: { onMenuOpen: () => void }) {
  return (
    <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 h-14 bg-white border-b border-border">
      <button
        type="button"
        onClick={onMenuOpen}
        aria-label="Άνοιγμα μενού"
        className="p-2 -ml-1 rounded-md text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="flex items-center gap-2">
        <LogoMark size={22} />
        <span className="font-bold text-[13px] tracking-tight text-slate-900">RelayDeck</span>
      </div>
    </header>
  )
}
