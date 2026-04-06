'use client'

import { useState } from 'react'
import Header from '@/components/dashboard/Header'
import {
  Copy, CheckCircle, ExternalLink,
  Code2, FileSpreadsheet, Zap,
  ChevronRight, Eye, EyeOff
} from 'lucide-react'
import { cn } from '@/lib/utils'

/* ─── Types ─────────────────────────────────────────── */

type IntegrationStatus = 'connected' | 'disconnected' | 'coming_soon'

interface Integration {
  id: string
  name: string
  description: string
  logo: React.ReactNode
  status: IntegrationStatus
  category: 'ecommerce' | 'sheets' | 'api'
  color: string
  bg: string
}

/* ─── Logo components ────────────────────────────────── */

function WordpressLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
      <path d="M12 2C6.486 2 2 6.486 2 12s4.486 10 10 10 10-4.486 10-10S17.514 2 12 2zm0 1.5c4.687 0 8.5 3.813 8.5 8.5s-3.813 8.5-8.5 8.5S3.5 16.687 3.5 12 7.313 3.5 12 3.5zM5.5 12c0 3.584 2.083 6.688 5.117 8.148L6.22 9.117A6.47 6.47 0 0 0 5.5 12zm12.5 0c0-1.117-.402-2.14-1.063-2.93l-3.055 8.876A6.502 6.502 0 0 0 18 12zm-6.5 6.5c.613 0 1.204-.083 1.766-.24l-1.875-5.44-1.875 5.44c.586.157 1.177.24 1.984.24z"/>
    </svg>
  )
}

function ShopifyLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
      <path d="M15.337 23.979l7.216-1.561s-2.6-17.574-2.621-17.716c-.021-.139-.144-.231-.27-.231-.125 0-2.315-.047-2.315-.047s-1.539-1.485-1.709-1.654v21.209zM13.776 1.22c-.028.009-1.739.537-1.739.537A5.264 5.264 0 0 0 10.524.22C9.792.22 9.094.66 8.541 1.441c-1.422 2-2.079 4.787-2.315 7.244L3.31 9.626l-1.961 28.353 14.427-2.778V1.22z"/>
    </svg>
  )
}

function YouCanLogo() {
  return (
    <div className="w-7 h-7 bg-gradient-to-br from-violet-600 to-purple-700 rounded-lg flex items-center justify-center text-white font-black text-xs">
      YC
    </div>
  )
}

function DropifyLogo() {
  return (
    <div className="w-7 h-7 bg-gradient-to-br from-sky-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-black text-xs">
      DP
    </div>
  )
}

function GoogleSheetsLogo() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="currentColor">
      <path d="M11.318 12.545H7.91v-1.909h3.41v1.91zm0 0M12.682 10.636h3.41v1.91h-3.41v-1.91zm0 0M11.318 14.727H7.91v-1.909h3.41v1.91zm0 0M12.682 12.818h3.41v1.909h-3.41v-1.91zm0 0M11.318 16.91H7.91V15h3.41v1.91zm0 0M12.682 15h3.41v1.91h-3.41V15zm0 0M19.5 3h-3V1.5A1.5 1.5 0 0 0 15 0H9a1.5 1.5 0 0 0-1.5 1.5V3h-3A1.5 1.5 0 0 0 3 4.5v18A1.5 1.5 0 0 0 4.5 24h15a1.5 1.5 0 0 0 1.5-1.5v-18A1.5 1.5 0 0 0 19.5 3zm-9 0V1.5h3V3h-3zm9 19.5h-15V9h15v13.5zm0-15h-15V4.5h3V6h9V4.5h3V7.5z"/>
    </svg>
  )
}

/* ─── Integration card ──────────────────────────────── */

function IntegrationCard({ integration, onConnect }: { integration: Integration; onConnect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className={cn(
      'bg-white rounded-2xl border shadow-sm transition-all hover:shadow-md',
      integration.status === 'connected' ? 'border-emerald-200' : 'border-gray-100',
    )}>
      <div className="p-5">
        <div className="flex items-start gap-4">
          <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 border', integration.bg)}>
            <span className={integration.color}>{integration.logo}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1 flex-wrap">
              <h3 className="font-bold text-[#1a1c3a] text-sm">{integration.name}</h3>
              {integration.status === 'connected' && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                  Connected
                </span>
              )}
              {integration.status === 'coming_soon' && (
                <span className="text-xs font-semibold bg-gray-50 text-gray-400 px-2 py-0.5 rounded-full border border-gray-100">
                  Coming Soon
                </span>
              )}
            </div>
            <p className="text-xs text-gray-500 leading-relaxed">{integration.description}</p>
          </div>
          <div className="flex-shrink-0">
            {integration.status === 'coming_soon' ? (
              <button disabled className="px-4 py-2 text-xs font-semibold text-gray-400 bg-gray-50 rounded-xl cursor-not-allowed border border-gray-100">
                Soon
              </button>
            ) : integration.status === 'connected' ? (
              <button className="px-4 py-2 text-xs font-semibold text-red-500 bg-red-50 rounded-xl hover:bg-red-100 transition-all border border-red-100">
                Disconnect
              </button>
            ) : (
              <button
                onClick={() => onConnect(integration.id)}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#1a1c3a] rounded-xl hover:bg-[#252750] transition-all"
              >
                Connect
              </button>
            )}
          </div>
        </div>
        {integration.status !== 'coming_soon' && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-3 flex items-center gap-1 text-xs text-gray-400 hover:text-[#f4991a] transition-colors"
          >
            {expanded ? 'Hide details' : 'Show setup guide'}
            <ChevronRight size={12} className={cn('transition-transform', expanded && 'rotate-90')} />
          </button>
        )}
      </div>
      {expanded && integration.status !== 'coming_soon' && (
        <div className="border-t border-gray-50 p-5 bg-gray-50/50 rounded-b-2xl">
          <SetupGuide integration={integration} />
        </div>
      )}
    </div>
  )
}

/* ─── Copy box ───────────────────────────────────────── */

function CopyBox({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(value)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <div className="bg-[#1a1c3a] rounded-xl p-3">
      <div className="text-white/40 text-[10px] mb-1.5 uppercase tracking-wider">{label}</div>
      <div className="flex items-center gap-2">
        <code className="text-[#f4991a] text-xs flex-1 truncate font-mono">{value}</code>
        <button onClick={copy} className="text-white/40 hover:text-white transition-colors flex-shrink-0">
          {copied ? <CheckCircle size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
    </div>
  )
}

/* ─── Setup guides ───────────────────────────────────── */

function SetupGuide({ integration }: { integration: Integration }) {
  if (integration.id === 'api') return <APIGuide />
  if (integration.id === 'wordpress') return <WordpressGuide />
  if (integration.id === 'google_sheets') return <SheetsGuide />
  if (integration.id === 'shopify') return <ShopifyGuide />
  if (integration.id === 'youcan') return <YouCanGuide />
  if (integration.id === 'dropify') return <DropifyGuide />
  return null
}

function APIGuide() {
  const [showKey, setShowKey] = useState(false)
  const apiKey = 'sk_live_shipedo_a8f3b2c9d4e1f7g6h5i2j0k'
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Use our REST API to integrate Shipedo with any platform.</p>
      <CopyBox label="Base URL" value="https://api.shipedo.co.ke/v1" />
      <div className="bg-[#1a1c3a] rounded-xl p-3">
        <div className="text-white/40 text-[10px] mb-1.5 uppercase tracking-wider">API Key</div>
        <div className="flex items-center gap-2">
          <code className="text-[#f4991a] text-xs flex-1 truncate font-mono">
            {showKey ? apiKey : '••••••••••••••••••••••••'}
          </code>
          <button onClick={() => setShowKey(!showKey)} className="text-white/40 hover:text-white transition-colors">
            {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
          <button onClick={() => navigator.clipboard.writeText(apiKey)} className="text-white/40 hover:text-white transition-colors">
            <Copy size={14} />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          { method: 'POST', path: '/orders',     desc: 'Create order'  },
          { method: 'GET',  path: '/orders/:id', desc: 'Get order'     },
          { method: 'PATCH',path: '/orders/:id', desc: 'Update status' },
          { method: 'GET',  path: '/invoices/:id',desc: 'Get invoice'  },
        ].map(ep => (
          <div key={ep.path} className="bg-white rounded-xl p-2.5 border border-gray-100">
            <div className="flex items-center gap-1.5">
              <span className={cn('text-[10px] font-bold px-1.5 py-0.5 rounded font-mono',
                ep.method === 'GET' ? 'bg-blue-50 text-blue-600' :
                ep.method === 'POST' ? 'bg-emerald-50 text-emerald-600' : 'bg-yellow-50 text-yellow-600'
              )}>
                {ep.method}
              </span>
              <code className="text-[10px] text-gray-500 font-mono">{ep.path}</code>
            </div>
            <div className="text-[10px] text-gray-400 mt-1">{ep.desc}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function WordpressGuide() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Install the Shipedo plugin on your WordPress / WooCommerce store.</p>
      <div className="space-y-2">
        {[
          'Go to Plugins → Add New in your WordPress admin',
          'Search for "Shipedo" or upload the plugin zip',
          'Activate the plugin',
          'Go to Settings → Shipedo and enter your API key',
          'Map your order statuses to Shipedo statuses',
          'Test with a sample order',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-[#1a1c3a] text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            <span className="text-xs text-gray-600">{step}</span>
          </div>
        ))}
      </div>
      <CopyBox label="Your API Key" value="sk_live_shipedo_a8f3b2c9d4e1f7g6h5i2j0k" />
    </div>
  )
}

function SheetsGuide() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Sync orders automatically to Google Sheets for reporting.</p>
      <div className="space-y-2">
        {[
          'Open our Google Sheets template (link below)',
          'Make a copy to your Google Drive',
          'Go to Extensions → Apps Script',
          'Set your Shipedo API key in the config tab',
          'Run "Sync Orders" to import data',
          'Set a trigger for automatic hourly sync',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-green-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            <span className="text-xs text-gray-600">{step}</span>
          </div>
        ))}
      </div>
      <button className="flex items-center gap-2 text-xs font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-2 rounded-xl hover:bg-green-100 transition-all">
        <FileSpreadsheet size={14} /> Open Template Sheet <ExternalLink size={12} />
      </button>
    </div>
  )
}

function ShopifyGuide() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Connect your Shopify store to auto-push orders to Shipedo.</p>
      <div className="space-y-2">
        {[
          'In Shopify admin, go to Apps → App and sales channel settings',
          'Click "Develop apps" → Create an app named "Shipedo"',
          'Under API credentials, enable Orders read/write scope',
          'Copy your Admin API access token',
          'Paste it below and click Connect',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-green-700 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            <span className="text-xs text-gray-600">{step}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <input placeholder="Your Shopify store URL (e.g. mystore.myshopify.com)" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a]" />
        <input placeholder="Admin API Access Token" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] font-mono" />
        <button className="w-full py-2.5 bg-green-700 hover:bg-green-800 text-white text-xs font-semibold rounded-xl transition-all">
          Connect Shopify Store
        </button>
      </div>
    </div>
  )
}

function YouCanGuide() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-gray-500">Link your YouCan store — orders auto-sync to Shipedo for fulfilment.</p>
      <div className="space-y-2">
        {[
          'Go to YouCan dashboard → Settings → Integrations',
          'Find "Webhook" and create a new webhook',
          'Paste the Shipedo webhook URL below',
          'Select event: "Order Created"',
          'Save and test with a sample order',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-violet-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            <span className="text-xs text-gray-600">{step}</span>
          </div>
        ))}
      </div>
      <CopyBox label="Shipedo Webhook URL" value="https://api.shipedo.co.ke/webhooks/youcan" />
    </div>
  )
}

function DropifyGuide() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3 bg-sky-50 border border-sky-200 rounded-xl p-4">
        <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-blue-600 rounded-xl flex items-center justify-center flex-shrink-0">
          <span className="text-white font-black text-sm">DP</span>
        </div>
        <div>
          <div className="font-bold text-sky-700 text-sm">Dropify Integration</div>
          <div className="text-xs text-sky-600">Link your Dropify dropshipping store directly with Shipedo</div>
        </div>
      </div>
      <p className="text-xs text-gray-500">Automatically send Dropify orders to Shipedo for COD delivery and fulfilment.</p>
      <div className="space-y-2">
        {[
          'Login to your Dropify account',
          'Go to Settings → API & Integrations',
          'Generate a new API key with "Orders" permission',
          'Enter your Dropify store ID and API key below',
          'Map your products to Shipedo SKUs',
          'Orders will sync automatically every 15 minutes',
        ].map((step, i) => (
          <div key={i} className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-sky-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{i + 1}</span>
            <span className="text-xs text-gray-600">{step}</span>
          </div>
        ))}
      </div>
      <div className="space-y-2">
        <input placeholder="Dropify Store ID" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] font-mono" />
        <input placeholder="Dropify API Key" className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#f4991a]/20 focus:border-[#f4991a] font-mono" />
        <button className="w-full py-2.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-semibold rounded-xl transition-all">
          Connect Dropify Store
        </button>
      </div>
      <CopyBox label="Shipedo Webhook URL (for Dropify)" value="https://api.shipedo.co.ke/webhooks/dropify" />
    </div>
  )
}

/* ─── Main page ──────────────────────────────────────── */

const integrations: Integration[] = [
  {
    id: 'api',
    name: 'Shipedo API',
    description: 'Connect any platform using our REST API. Full control over orders, tracking, invoices, and COD.',
    logo: <Code2 size={26} />,
    status: 'connected',
    category: 'api',
    color: 'text-gray-700',
    bg: 'bg-gray-50 border-gray-200',
  },
  {
    id: 'wordpress',
    name: 'WordPress / WooCommerce',
    description: 'Automatically push WooCommerce orders to Shipedo for fulfillment and COD delivery.',
    logo: <WordpressLogo />,
    status: 'disconnected',
    category: 'ecommerce',
    color: 'text-blue-700',
    bg: 'bg-blue-50 border-blue-200',
  },
  {
    id: 'google_sheets',
    name: 'Google Sheets',
    description: 'Sync all orders and COD data to Google Sheets automatically for easy reporting.',
    logo: <GoogleSheetsLogo />,
    status: 'disconnected',
    category: 'sheets',
    color: 'text-green-700',
    bg: 'bg-green-50 border-green-200',
  },
  {
    id: 'shopify',
    name: 'Shopify',
    description: 'Connect your Shopify store — new orders are instantly sent to Shipedo for processing.',
    logo: <ShopifyLogo />,
    status: 'disconnected',
    category: 'ecommerce',
    color: 'text-green-800',
    bg: 'bg-green-50 border-green-200',
  },
  {
    id: 'youcan',
    name: 'YouCan',
    description: 'Integrate YouCan stores with Shipedo via webhook. Perfect for North African sellers.',
    logo: <YouCanLogo />,
    status: 'disconnected',
    category: 'ecommerce',
    color: 'text-violet-700',
    bg: 'bg-violet-50 border-violet-200',
  },
  {
    id: 'dropify',
    name: 'Dropify',
    description: 'Link your Dropify dropshipping store. Orders sync automatically for COD delivery.',
    logo: <DropifyLogo />,
    status: 'disconnected',
    category: 'ecommerce',
    color: 'text-sky-700',
    bg: 'bg-sky-50 border-sky-200',
  },
]

export default function SellerIntegrationsPage() {
  const [items, setItems] = useState(integrations)
  const [activeCategory, setActiveCategory] = useState<'all' | 'ecommerce' | 'sheets' | 'api'>('all')

  const connect = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, status: 'connected' as const } : i))
  }

  const filtered = activeCategory === 'all' ? items : items.filter(i => i.category === activeCategory)
  const connectedCount = items.filter(i => i.status === 'connected').length

  return (
    <div className="min-h-screen">
      <Header title="Integrations" subtitle="Connect your store with Shipedo" role="seller" />

      <div className="p-6 space-y-6">

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Available',  value: integrations.length,                   color: 'text-[#f4991a]',    bg: 'bg-orange-50'  },
            { label: 'Connected',  value: connectedCount,                         color: 'text-emerald-600',  bg: 'bg-emerald-50' },
            { label: 'Pending',    value: integrations.length - connectedCount,   color: 'text-gray-500',     bg: 'bg-gray-50'    },
          ].map(s => (
            <div key={s.label} className={`${s.bg} rounded-2xl p-5 border border-white`}>
              <div className={`text-3xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label} integrations</div>
            </div>
          ))}
        </div>

        {/* Category tabs */}
        <div className="flex gap-2">
          {(['all', 'ecommerce', 'sheets', 'api'] as const).map(cat => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'px-4 py-2 text-xs font-semibold rounded-xl transition-all capitalize',
                activeCategory === cat ? 'bg-[#1a1c3a] text-white' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'
              )}
            >
              {cat === 'all' ? 'All' : cat === 'ecommerce' ? 'E-commerce' : cat === 'sheets' ? 'Sheets' : 'API'}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {filtered.map(integration => (
            <IntegrationCard key={integration.id} integration={integration} onConnect={connect} />
          ))}
        </div>

        {/* Footer */}
        <div className="bg-[#1a1c3a] rounded-2xl p-6 flex items-start gap-4">
          <div className="w-10 h-10 bg-[#f4991a]/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Zap size={20} className="text-[#f4991a]" />
          </div>
          <div>
            <div className="text-white font-bold mb-1">Need a custom integration?</div>
            <p className="text-white/50 text-sm leading-relaxed">
              We can build a custom connector for any platform. Contact our team at{' '}
              <span className="text-[#f4991a]">integrations@shipedo.co.ke</span> or use the API directly.
            </p>
          </div>
        </div>

      </div>
    </div>
  )
}
