import { Sidebar } from '@/components/layout/sidebar'

export const dynamic = 'force-dynamic'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-56 min-h-screen overflow-auto">
        {children}
      </main>
    </div>
  )
}
