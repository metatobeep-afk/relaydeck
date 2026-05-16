'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import type { Customer } from '@/types/database'
import { Mail, Send, Users, Tag, Filter } from 'lucide-react'

export default function MarketingPage() {
  const supabase = createClient()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [subject, setSubject] = useState('')
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.from('customers').select('*').then(({ data }) => {
      const cust = data ?? []
      setCustomers(cust)
      const tags = [...new Set(cust.flatMap(c => c.tags ?? []))]
      setAllTags(tags)
      setLoading(false)
    })
  }, [])

  const filtered = selectedTags.length > 0
    ? customers.filter(c => selectedTags.some(t => (c.tags ?? []).includes(t)))
    : customers

  function toggleTag(tag: string) {
    setSelectedTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag])
  }

  async function handleSend() {
    if (!subject || !body || filtered.length === 0) return
    setSending(true)
    const res = await fetch('/api/email/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipients: filtered.map(c => ({ email: c.email, name: c.business_name })), subject, body }),
    })
    setSending(false)
    if (res.ok) { setSent(true); setSubject(''); setBody('') }
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Email Marketing</h1>
        <p className="text-sm text-slate-500 mt-1">Send newsletters and follow-ups to your customer segments</p>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Segment selector */}
        <div className="col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Filter className="w-4 h-4" /> Segment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-semibold text-indigo-700">{filtered.length} recipients</span>
              </div>

              {allTags.length > 0 ? (
                <div>
                  <p className="text-xs text-slate-500 mb-2">Filter by tag:</p>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map(tag => (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${selectedTags.includes(tag) ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </button>
                    ))}
                  </div>
                  {selectedTags.length > 0 && (
                    <button onClick={() => setSelectedTags([])} className="mt-2 text-xs text-red-500 hover:text-red-700">
                      Clear filters (show all)
                    </button>
                  )}
                </div>
              ) : (
                <p className="text-sm text-slate-400">No tags yet. Add tags to customers to enable segmentation.</p>
              )}

              <div className="mt-4 border-t border-slate-100 pt-3">
                <p className="text-xs text-slate-500 mb-2">Recipients preview:</p>
                <div className="space-y-1 max-h-48 overflow-y-auto">
                  {loading ? (
                    <p className="text-xs text-slate-400">Loading…</p>
                  ) : filtered.slice(0, 15).map(c => (
                    <div key={c.id} className="flex items-center gap-1 text-xs text-slate-600">
                      <Mail className="w-3 h-3 text-slate-400 flex-shrink-0" />
                      <span className="truncate">{c.business_name}</span>
                    </div>
                  ))}
                  {filtered.length > 15 && (
                    <p className="text-xs text-slate-400">+{filtered.length - 15} more</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Email composer */}
        <div className="col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Mail className="w-4 h-4" /> Compose Email
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {sent && (
                <div className="bg-green-50 border border-green-200 text-green-800 text-sm rounded-lg p-3">
                  Email campaign sent successfully to {filtered.length} recipients!
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Subject</label>
                <Input value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. New Collection — Winter 2026" />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1 block">Message</label>
                <textarea
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm h-64 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Dear {business_name},&#10;&#10;We are excited to share our latest collection…"
                  value={body}
                  onChange={e => setBody(e.target.value)}
                />
                <p className="text-xs text-slate-400 mt-1">Use {'{business_name}'} and {'{contact_name}'} as merge fields</p>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-sm text-slate-500">
                  Will be sent via <span className="font-medium">Brevo API</span>
                </p>
                <Button
                  onClick={handleSend}
                  disabled={sending || !subject || !body || filtered.length === 0}
                  className="flex items-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  {sending ? 'Sending…' : `Send to ${filtered.length} contacts`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
