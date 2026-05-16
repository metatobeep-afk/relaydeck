import { OfflineBanner } from '@/components/offline-banner'

export const dynamic = 'force-dynamic'

export default function PdaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <OfflineBanner />
      {children}
    </div>
  )
}
