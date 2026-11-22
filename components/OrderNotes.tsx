'use client'

import { useEffect, useMemo, useState } from 'react'
import { FileText, RefreshCw, Send, StickyNote } from 'lucide-react'

export type SharedNote = {
  id: string
  order_id: string
  agent_id: string
  agent_name: string
  note: string
  created_at: string
}

export type NotesUser = { id?: string; name?: string; role?: string }

const fmtDate = (d: string) =>
  new Date(d).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })

/** Batch-fetch the shared notes for a list of orders. */
export function useSharedNotes(orderIds: string[]) {
  const [notesByOrder, setNotesByOrder] = useState<Record<string, SharedNote[]>>({})
  const idsKey = useMemo(() => [...orderIds].sort().join(','), [orderIds])

  useEffect(() => {
    const ids = idsKey ? idsKey.split(',') : []
    if (ids.length === 0) { setNotesByOrder({}); return }
    let alive = true
    fetch('/api/order-notes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'list', ids }),
    })
      .then(r => r.json())
      .then(d => { if (alive && d?.notes) setNotesByOrder(d.notes) })
      .catch(() => {})
    return () => { alive = false }
  }, [idsKey])

  const addLocalNote = (note: SharedNote) =>
    setNotesByOrder(prev => ({ ...prev, [note.order_id]: [note, ...(prev[note.order_id] || [])] }))

  return { notesByOrder, addLocalNote }
}

/**
 * Shared notes thread on an order card. Every role sees the same notes and
 * can add to them, so anyone can tell an order's situation at a glance.
 */
export default function OrderNotes({ orderId, notes, user, onAdded }: {
  orderId: string
  notes: SharedNote[]
  user: NotesUser
  onAdded: (note: SharedNote) => void
}) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [saving, setSaving] = useState(false)

  const addNote = async () => {
    const body = text.trim()
    if (!body || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/order-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add', orderId, note: body,
          userId: user.id, userName: user.name, userRole: user.role,
        }),
      })
      const d = await res.json()
      if (d?.ok && d.note) { onAdded(d.note); setText('') }
    } catch {} finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-1">
      {!open && notes.map(n => (
        <div key={n.id} className="flex items-start gap-1 text-[11px] text-purple-700 bg-purple-50 rounded px-2 py-1">
          <StickyNote size={9} className="mt-0.5 flex-shrink-0" />
          <span className="font-semibold">{n.agent_name}:</span>
          <span className="flex-1">{n.note}</span>
          <span className="text-[9px] text-purple-300 flex-shrink-0">{fmtDate(n.created_at)}</span>
        </div>
      ))}

      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1 text-[10px] font-bold text-gray-300 hover:text-purple-600"
      >
        <FileText size={9} />
        {open ? 'Hide notes' : notes.length > 0 ? `Notes (${notes.length})` : 'Add note'}
      </button>

      {open && (
        <div className="bg-purple-50/40 border border-purple-100 rounded-lg p-2 space-y-1.5">
          <div className="flex gap-1.5">
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') addNote() }}
              placeholder="Write a note (everyone will see it)..."
              autoFocus
              className="flex-1 px-2 py-1.5 bg-white border border-gray-200 rounded text-[11px] focus:outline-none focus:border-purple-400"
            />
            <button
              onClick={addNote}
              disabled={!text.trim() || saving}
              className="px-2.5 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 text-white rounded"
            >
              {saving ? <RefreshCw size={11} className="animate-spin" /> : <Send size={11} />}
            </button>
          </div>
          {notes.length === 0 ? (
            <p className="text-[10px] text-gray-400 italic">No notes yet</p>
          ) : (
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {notes.map(n => (
                <div key={n.id} className="bg-white border border-purple-100 rounded px-2 py-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-600">{n.agent_name}</span>
                    <span className="text-[9px] text-gray-400">{fmtDate(n.created_at)}</span>
                  </div>
                  <p className="text-[11px] text-gray-700">{n.note}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
