'use client'
import { useEffect, useState } from 'react'
import { WifiOff, Wifi, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import { getPendingOrders } from '@/lib/offline-store'
import type { SyncResult } from '@/lib/sync'

export function OfflineBanner() {
  const [online, setOnline] = useState(true)
  const [pending, setPending] = useState(0)
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null)

  useEffect(() => {
    setOnline(navigator.onLine)
    setPending(getPendingOrders().length)

    function handleOnline() {
      setOnline(true)
      setPending(getPendingOrders().length)
    }
    function handleOffline() { setOnline(false) }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  async function handleSync() {
    setSyncing(true)
    setSyncResult(null)
    const { syncPendingOrders } = await import('@/lib/sync')
    const result = await syncPendingOrders()
    setSyncResult(result)
    setPending(getPendingOrders().length)
    setSyncing(false)
    setTimeout(() => setSyncResult(null), 5000)
  }

  // Nothing to show when online and no pending orders
  if (online && pending === 0 && !syncResult) return null

  return (
    <div className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-3 px-4 py-2.5 text-sm font-medium transition-all ${
      online ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white'
    }`}>
      {!online && (
        <>
          <WifiOff className="w-4 h-4 flex-shrink-0" />
          <span>Χωρίς σύνδεση — οι παραγγελίες αποθηκεύονται τοπικά</span>
          {pending > 0 && (
            <span className="bg-white/20 px-2 py-0.5 rounded-full text-xs">
              {pending} σε αναμονή
            </span>
          )}
        </>
      )}

      {online && pending > 0 && !syncing && !syncResult && (
        <>
          <Wifi className="w-4 h-4 flex-shrink-0" />
          <span>Σύνδεση αποκαταστάθηκε — {pending} παραγγελίες σε αναμονή</span>
          <button
            type="button"
            onClick={handleSync}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 px-3 py-1 rounded-full text-xs font-semibold transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
            Συγχρονισμός
          </button>
        </>
      )}

      {syncing && (
        <>
          <RefreshCw className="w-4 h-4 animate-spin flex-shrink-0" />
          <span>Συγχρονισμός παραγγελιών…</span>
        </>
      )}

      {syncResult && !syncing && (
        <>
          {syncResult.failed === 0 ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
          )}
          <span>
            {syncResult.synced > 0 && `${syncResult.synced} παραγγελίες συγχρονίστηκαν`}
            {syncResult.failed > 0 && ` · ${syncResult.failed} αποτυχίες`}
          </span>
        </>
      )}
    </div>
  )
}
