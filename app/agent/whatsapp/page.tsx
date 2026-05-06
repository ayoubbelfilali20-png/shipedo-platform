'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import {
  MessageCircle, Search, Phone, Clock, Send, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'

type WaMessage = {
  id: string
  order_id: string | null
  phone: string
  direction: 'incoming' | 'outgoing'
  body: string
  agent_name: string | null
  created_at: string
}

type Conversation = {
  phone: string
  customerName: string
  trackingNumber: string
  lastMessage: string
  lastTime: string
  unread: number
}

function cleanPhone(p: string) {
  let num = (p || '').replace(/[^\d+]/g, '')
  if (/^0[17]\d{8}$/.test(num)) num = '254' + num.slice(1)
  return num
}

export default function AgentWhatsAppPage() {
  const [agentId, setAgentId] = useState('')
  const [agentName, setAgentName] = useState('')
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedPhone, setSelectedPhone] = useState('')
  const [messages, setMessages] = useState<WaMessage[]>([])
  const [loading, setLoading] = useState(true)
  const [msgsLoading, setMsgsLoading] = useState(false)
  const [reply, setReply] = useState('')
  const [sending, setSending] = useState(false)
  const [sendError, setSendError] = useState('')
  const [search, setSearch] = useState('')
  const chatRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('agent')
      if (raw) {
        const a = JSON.parse(raw)
        setAgentId(a.id || '')
        setAgentName(a.name || '')
      }
    } catch {}
  }, [])

  useEffect(() => {
    if (agentId) loadConversations()
  }, [agentId])

  async function loadConversations() {
    setLoading(true)
    const { data: orders } = await supabase
      .from('orders')
      .select('id, customer_name, customer_phone, tracking_number')
      .eq('assigned_agent_id', agentId)

    if (!orders || orders.length === 0) {
      setConversations([])
      setLoading(false)
      return
    }

    const phoneMap = new Map<string, { name: string; tracking: string; orderId: string }>()
    for (const o of orders) {
      const p = cleanPhone(o.customer_phone)
      if (p && !phoneMap.has(p)) {
        phoneMap.set(p, { name: o.customer_name, tracking: o.tracking_number, orderId: o.id })
      }
    }

    const phones = Array.from(phoneMap.keys())
    const { data: msgs } = await supabase
      .from('whatsapp_messages')
      .select('phone, body, direction, created_at')
      .in('phone', phones)
      .order('created_at', { ascending: false })

    const convos: Conversation[] = []
    for (const [phone, info] of phoneMap) {
      const phoneMsgs = (msgs || []).filter(m => m.phone === phone)
      const lastMsg = phoneMsgs[0]
      convos.push({
        phone,
        customerName: info.name,
        trackingNumber: info.tracking,
        lastMessage: lastMsg?.body || '',
        lastTime: lastMsg?.created_at || '',
        unread: phoneMsgs.filter(m => m.direction === 'incoming').length,
      })
    }

    convos.sort((a, b) => {
      if (!a.lastTime && !b.lastTime) return 0
      if (!a.lastTime) return 1
      if (!b.lastTime) return -1
      return new Date(b.lastTime).getTime() - new Date(a.lastTime).getTime()
    })

    setConversations(convos)
    setLoading(false)
  }

  async function loadMessages(phone: string) {
    setSelectedPhone(phone)
    setMsgsLoading(true)
    setSendError('')
    try {
      const res = await fetch(`/api/whatsapp/messages?phone=${encodeURIComponent(phone)}`)
      const data = await res.json()
      setMessages(Array.isArray(data) ? data : [])
    } catch {
      setMessages([])
    }
    setMsgsLoading(false)
    setTimeout(() => chatRef.current?.scrollTo({ top: chatRef.current.scrollHeight }), 100)
  }

  async function sendReply() {
    if (!reply.trim() || !selectedPhone || sending) return
    setSending(true)
    setSendError('')
    try {
      const convo = conversations.find(c => c.phone === selectedPhone)
      const res = await fetch('/api/whatsapp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: selectedPhone,
          text: reply.trim(),
          agentId,
          agentName,
        }),
      })
      const result = await res.json()
      if (result.ok) {
        setReply('')
        await loadMessages(selectedPhone)
      } else {
        setSendError(result.error || 'Failed to send')
      }
    } catch (err: any) {
      setSendError(err.message || 'Network error')
    }
    setSending(false)
  }

  const filtered = conversations.filter(c => {
    if (!search) return true
    const s = search.toLowerCase()
    return c.customerName.toLowerCase().includes(s) || c.phone.includes(s) || c.trackingNumber.toLowerCase().includes(s)
  })

  const selectedConvo = conversations.find(c => c.phone === selectedPhone)

  return (
    <div className="p-4 lg:p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500 flex items-center justify-center">
            <MessageCircle size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-[#1a1c3a]">WhatsApp</h1>
            <p className="text-xs text-gray-400">All conversations with your customers</p>
          </div>
        </div>
        <button
          onClick={() => window.open('https://web.whatsapp.com', 'whatsapp_' + agentId, 'width=1100,height=750,scrollbars=yes,resizable=yes')}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold rounded-xl transition-all"
        >
          <MessageCircle size={14} /> Open WhatsApp Web
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 200px)' }}>
        <div className="flex h-full">
          {/* Left — Conversation list */}
          <div className="w-80 border-r border-gray-100 flex flex-col flex-shrink-0">
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Search conversations..."
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 border border-gray-100 rounded-xl text-xs focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12 text-xs text-gray-400">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center px-4">
                  <MessageCircle size={32} className="text-gray-200 mb-2" />
                  <p className="text-xs text-gray-400">No conversations yet</p>
                </div>
              ) : filtered.map(c => (
                <button
                  key={c.phone}
                  onClick={() => loadMessages(c.phone)}
                  className={cn(
                    'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-all',
                    selectedPhone === c.phone && 'bg-emerald-50 border-l-2 border-l-emerald-500'
                  )}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-sm font-bold text-[#1a1c3a] truncate">{c.customerName}</span>
                    {c.lastTime && (
                      <span className="text-[9px] text-gray-400 flex-shrink-0 ml-2">
                        {new Date(c.lastTime).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 font-mono">{c.phone}</p>
                  {c.lastMessage && (
                    <p className="text-[11px] text-gray-500 truncate mt-0.5">{c.lastMessage}</p>
                  )}
                </button>
              ))}
            </div>
            <div className="p-2 border-t border-gray-100">
              <button
                onClick={() => loadConversations()}
                className="w-full py-2 text-xs text-gray-500 hover:text-emerald-600 flex items-center justify-center gap-1.5 rounded-lg hover:bg-gray-50"
              >
                <RefreshCw size={11} /> Refresh
              </button>
            </div>
          </div>

          {/* Right — Chat area */}
          <div className="flex-1 flex flex-col min-w-0">
            {selectedPhone ? (
              <>
                {/* Chat header */}
                <div className="bg-emerald-600 px-4 py-3 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                      <MessageCircle size={14} className="text-white" />
                    </div>
                    <div>
                      <span className="text-white font-bold text-sm">{selectedConvo?.customerName || selectedPhone}</span>
                      <p className="text-white/60 text-[10px]">{selectedPhone}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <a href={`tel:${selectedPhone}`} className="w-7 h-7 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center text-white">
                      <Phone size={12} />
                    </a>
                    <button onClick={() => loadMessages(selectedPhone)} className="text-white/60 hover:text-white text-xs font-semibold">
                      Refresh
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#e5ddd5]">
                  {msgsLoading ? (
                    <p className="text-xs text-gray-500 text-center py-12">Loading messages...</p>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-12">
                      <MessageCircle size={32} className="mx-auto mb-2 text-gray-300" />
                      <p className="text-xs text-gray-500">No messages yet</p>
                      <p className="text-[10px] text-gray-400 mt-1">Send a message to start the conversation</p>
                    </div>
                  ) : messages.map(m => (
                    <div key={m.id} className={`flex ${m.direction === 'outgoing' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[70%] rounded-lg px-3 py-2 text-sm shadow-sm ${
                        m.direction === 'outgoing'
                          ? 'bg-[#dcf8c6] text-gray-800'
                          : 'bg-white text-gray-800'
                      }`}>
                        {m.body?.startsWith('[Image]') ? (
                          <div className="space-y-1">
                            <div className="w-full h-32 bg-gray-100 rounded flex items-center justify-center text-gray-400 text-xs">Image sent</div>
                            {m.body.replace('[Image]', '').trim() && <p>{m.body.replace('[Image]', '').trim()}</p>}
                          </div>
                        ) : (
                          <p className="whitespace-pre-wrap break-words">{m.body}</p>
                        )}
                        <div className="flex items-center justify-end gap-1 mt-1">
                          {m.agent_name && m.direction === 'outgoing' && (
                            <span className="text-[9px] text-gray-400">{m.agent_name}</span>
                          )}
                          <span className="text-[9px] text-gray-400">
                            {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Error */}
                {sendError && (
                  <div className="px-4 py-2 bg-red-50 border-t border-red-200 text-xs text-red-600 font-semibold">
                    {sendError}
                  </div>
                )}

                {/* Input */}
                <div className="p-3 bg-gray-50 border-t border-gray-200 flex gap-2 flex-shrink-0">
                  <input
                    value={reply}
                    onChange={e => { setReply(e.target.value); setSendError('') }}
                    onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendReply()}
                    placeholder="Type a message..."
                    className="flex-1 px-4 py-2.5 bg-white border border-gray-200 rounded-full text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    onClick={sendReply}
                    disabled={sending || !reply.trim()}
                    className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-40 flex items-center justify-center text-white flex-shrink-0"
                  >
                    {sending ? <Clock size={16} /> : <Send size={16} />}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-8">
                <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mb-4">
                  <MessageCircle size={36} className="text-emerald-500" />
                </div>
                <h3 className="text-lg font-bold text-[#1a1c3a] mb-1">WhatsApp Messages</h3>
                <p className="text-sm text-gray-400">Select a conversation to view messages</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
