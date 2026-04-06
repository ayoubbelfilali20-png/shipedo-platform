'use client'

import Link from 'next/link'
import { useState } from 'react'
import {
  Package, Phone, Warehouse, MapPin, ChevronRight, CheckCircle,
  ArrowRight, Globe, Clock, Shield, TrendingUp, Menu, X,
  Truck, BarChart3, Users, Star, Zap
} from 'lucide-react'

export default function LandingPage() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="min-h-screen bg-white font-sans">
      {/* NAVBAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[#1a1c3a]/95 backdrop-blur-md border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#f4991a] rounded-lg flex items-center justify-center">
              <Truck size={18} className="text-white" />
            </div>
            <span className="text-white font-bold text-xl tracking-tight">Shipedo</span>
          </div>

          {/* Desktop Nav */}
          <div className="hidden md:flex items-center gap-8">
            <a href="#services" className="text-white/70 hover:text-white text-sm transition-colors">Services</a>
            <a href="#process" className="text-white/70 hover:text-white text-sm transition-colors">How it works</a>
            <a href="#coverage" className="text-white/70 hover:text-white text-sm transition-colors">Coverage</a>
            <a href="#about" className="text-white/70 hover:text-white text-sm transition-colors">About</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/login" className="text-white/70 hover:text-white text-sm transition-colors px-4 py-2">
              Sign in
            </Link>
            <Link href="/login" className="bg-[#f4991a] hover:bg-[#f8b44a] text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors">
              Get Started
            </Link>
          </div>

          <button className="md:hidden text-white" onClick={() => setMenuOpen(!menuOpen)}>
            {menuOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden bg-[#1a1c3a] border-t border-white/10 px-6 py-4 space-y-4">
            <a href="#services" className="block text-white/70 hover:text-white text-sm py-2">Services</a>
            <a href="#process" className="block text-white/70 hover:text-white text-sm py-2">How it works</a>
            <a href="#coverage" className="block text-white/70 hover:text-white text-sm py-2">Coverage</a>
            <Link href="/login" className="block w-full text-center bg-[#f4991a] text-white text-sm font-semibold px-5 py-3 rounded-lg mt-2">
              Get Started
            </Link>
          </div>
        )}
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen bg-[#1a1c3a] flex items-center overflow-hidden pt-20">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 right-20 w-96 h-96 bg-[#f4991a] rounded-full blur-3xl" />
          <div className="absolute bottom-20 left-20 w-64 h-64 bg-blue-500 rounded-full blur-3xl" />
        </div>

        {/* Grid lines decoration */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px'
        }} />

        <div className="relative max-w-7xl mx-auto px-6 py-20 grid lg:grid-cols-2 gap-16 items-center">
          {/* Left content */}
          <div>
            <div className="inline-flex items-center gap-2 bg-[#f4991a]/10 border border-[#f4991a]/20 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-[#f4991a] rounded-full animate-pulse" />
              <span className="text-[#f4991a] text-xs font-medium">Delivering across Kenya</span>
            </div>

            <h1 className="text-5xl lg:text-6xl font-bold text-white leading-tight mb-6">
              Logistics
              <span className="block text-[#f4991a]">Built for</span>
              African E-commerce
            </h1>

            <p className="text-white/60 text-lg leading-relaxed mb-8 max-w-xl">
              From sourcing in China & Dubai to last-mile delivery in Kenya.
              COD collection, call center confirmation, and fulfillment—all in one platform.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-12">
              <Link href="/login" className="flex items-center justify-center gap-2 bg-[#f4991a] hover:bg-[#f8b44a] text-white font-semibold px-8 py-4 rounded-xl transition-all hover:scale-105 shadow-lg shadow-orange-500/25">
                Start Shipping Today
                <ArrowRight size={18} />
              </Link>
              <a href="#services" className="flex items-center justify-center gap-2 border border-white/20 hover:border-white/40 text-white font-medium px-8 py-4 rounded-xl transition-all hover:bg-white/5">
                Explore Services
              </a>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-6">
              {[
                { value: '50+', label: 'Cities Covered' },
                { value: '98%', label: 'On-time Rate' },
                { value: '24h', label: 'Nairobi Delivery' },
              ].map((stat) => (
                <div key={stat.label}>
                  <div className="text-2xl font-bold text-white">{stat.value}</div>
                  <div className="text-white/50 text-xs mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Dashboard Preview */}
          <div className="hidden lg:block relative">
            <div className="relative bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 shadow-2xl">
              {/* Mini dashboard preview */}
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-6">
                  <span className="text-white/80 font-semibold text-sm">Live Orders</span>
                  <span className="text-[#f4991a] text-xs bg-[#f4991a]/10 px-2 py-1 rounded-full">248 Today</span>
                </div>

                {[
                  { name: 'James Mwangi', city: 'Nairobi', amount: 'KES 3,500', status: 'Delivered', color: 'bg-emerald-500' },
                  { name: 'Amina Hassan', city: 'Mombasa', amount: 'KES 9,200', status: 'Shipped', color: 'bg-blue-500' },
                  { name: 'Peter Kamau', city: 'Kisumu', amount: 'KES 4,200', status: 'Confirmed', color: 'bg-indigo-500' },
                  { name: 'Grace Wanjiku', city: 'Nakuru', amount: 'KES 2,800', status: 'Pending', color: 'bg-yellow-500' },
                ].map((order, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#f4991a]/20 to-blue-500/20 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {order.name[0]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-white text-xs font-medium truncate">{order.name}</div>
                      <div className="text-white/40 text-xs">{order.city}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-white text-xs font-semibold">{order.amount}</div>
                      <div className="flex items-center gap-1 justify-end mt-0.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${order.color}`} />
                        <span className="text-white/50 text-xs">{order.status}</span>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Mini stats */}
                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-white/10">
                  {[
                    { label: 'Revenue', value: 'KES 134K' },
                    { label: 'COD Due', value: 'KES 45K' },
                    { label: 'Delivered', value: '84.2%' },
                  ].map((s) => (
                    <div key={s.label} className="text-center">
                      <div className="text-white font-bold text-sm">{s.value}</div>
                      <div className="text-white/40 text-xs mt-0.5">{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Floating badges */}
            <div className="absolute -top-4 -right-4 bg-[#f4991a] text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg animate-float">
              COD Collected ✓
            </div>
            <div className="absolute -bottom-4 -left-4 bg-emerald-500 text-white text-xs font-semibold px-3 py-2 rounded-xl shadow-lg" style={{ animationDelay: '1s' }}>
              18 Delivered Today
            </div>
          </div>
        </div>
      </section>

      {/* TRUST BAR */}
      <section className="bg-[#f4991a] py-6">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
            {[
              { icon: Shield, text: 'Cash on Delivery' },
              { icon: Zap, text: 'Same-day Nairobi' },
              { icon: Globe, text: 'Nationwide Kenya' },
              { icon: Phone, text: '24/7 Call Center' },
              { icon: BarChart3, text: 'Real-time Tracking' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-white font-semibold text-sm">
                <Icon size={18} />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SERVICES */}
      <section id="services" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#f4991a] text-sm font-semibold uppercase tracking-wider">What We Offer</span>
            <h2 className="text-4xl font-bold text-[#1a1c3a] mt-3 mb-4">
              Complete Logistics Suite
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">
              Everything you need to run a successful e-commerce business in Kenya, from warehousing to doorstep delivery.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: Phone,
                title: 'Call Center',
                color: 'bg-blue-50',
                iconColor: 'text-blue-600',
                iconBg: 'bg-blue-100',
                desc: 'Professional order confirmation team. We call your customers, confirm orders, and reduce return rates with our trained agents.',
                features: ['Order confirmation calls', 'Customer follow-ups', 'Cancellation handling', 'Real-time status updates'],
              },
              {
                icon: Truck,
                title: 'Delivery',
                color: 'bg-orange-50',
                iconColor: 'text-[#f4991a]',
                iconBg: 'bg-orange-100',
                desc: 'Fast and reliable last-mile delivery across Kenya. COD collection with secure and transparent payout system.',
                features: ['24h Nairobi delivery', 'Nationwide coverage', 'COD collection', 'Real-time tracking'],
              },
              {
                icon: Warehouse,
                title: 'Fulfillment',
                color: 'bg-emerald-50',
                iconColor: 'text-emerald-600',
                iconBg: 'bg-emerald-100',
                desc: 'Store your inventory in our Nairobi warehouse. We handle picking, packing, and shipping for your e-commerce business.',
                features: ['Secure warehousing', 'Pick & pack service', 'Inventory management', 'Returns handling'],
              },
            ].map((service) => (
              <div key={service.title} className={`${service.color} rounded-2xl p-8 card-hover border border-transparent hover:border-gray-200`}>
                <div className={`${service.iconBg} w-14 h-14 rounded-xl flex items-center justify-center mb-6`}>
                  <service.icon size={28} className={service.iconColor} />
                </div>
                <h3 className="text-xl font-bold text-[#1a1c3a] mb-3">{service.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed mb-6">{service.desc}</p>
                <ul className="space-y-2">
                  {service.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                      <CheckCircle size={16} className={service.iconColor} />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="py-24 bg-[#1a1c3a]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-[#f4991a] text-sm font-semibold uppercase tracking-wider">How It Works</span>
            <h2 className="text-4xl font-bold text-white mt-3 mb-4">
              From Source to Doorstep
            </h2>
            <p className="text-white/50 max-w-xl mx-auto">
              A seamless end-to-end logistics flow designed for African e-commerce sellers.
            </p>
          </div>

          <div className="relative">
            {/* Connection line */}
            <div className="hidden md:block absolute top-16 left-[12.5%] right-[12.5%] h-0.5 bg-gradient-to-r from-[#f4991a] via-blue-500 to-emerald-500 opacity-30" />

            <div className="grid md:grid-cols-5 gap-6">
              {[
                { step: '01', icon: Globe, title: 'Sourcing', desc: 'Import products from China or Dubai', color: 'text-[#f4991a]', bg: 'bg-[#f4991a]/10' },
                { step: '02', icon: Warehouse, title: 'Fulfillment', desc: 'Store in our Nairobi warehouse', color: 'text-blue-400', bg: 'bg-blue-500/10' },
                { step: '03', icon: Phone, title: 'Confirmation', desc: 'Call center verifies every order', color: 'text-purple-400', bg: 'bg-purple-500/10' },
                { step: '04', icon: Package, title: 'Packing', desc: 'Pick, pack, and label for dispatch', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
                { step: '05', icon: Truck, title: 'Delivery', desc: 'Fast delivery with COD collection', color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              ].map((item, i) => (
                <div key={item.step} className="text-center relative">
                  <div className={`${item.bg} w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/10`}>
                    <item.icon size={28} className={item.color} />
                  </div>
                  <div className="text-white/30 text-xs font-bold mb-1">STEP {item.step}</div>
                  <h3 className="text-white font-bold mb-2">{item.title}</h3>
                  <p className="text-white/50 text-xs leading-relaxed">{item.desc}</p>
                  {i < 4 && (
                    <ChevronRight size={16} className="text-white/20 absolute -right-3 top-6 hidden md:block" />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* COVERAGE */}
      <section id="coverage" className="py-24 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-[#f4991a] text-sm font-semibold uppercase tracking-wider">Coverage</span>
              <h2 className="text-4xl font-bold text-[#1a1c3a] mt-3 mb-6">
                We Deliver Across Kenya
              </h2>
              <p className="text-gray-500 mb-8">
                Our network covers major cities and towns across Kenya, with express delivery in Nairobi and reliable nationwide shipping within 2-4 days.
              </p>

              <div className="space-y-4 mb-8">
                {[
                  { city: 'Nairobi', time: '24 hours', status: 'active' },
                  { city: 'Mombasa', time: '2-3 days', status: 'active' },
                  { city: 'Kisumu', time: '2-3 days', status: 'active' },
                  { city: 'Nakuru', time: '1-2 days', status: 'active' },
                  { city: 'Eldoret', time: '2-3 days', status: 'active' },
                  { city: 'Dar es Salaam', time: 'Coming Soon', status: 'soon' },
                ].map((loc) => (
                  <div key={loc.city} className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-100 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className={`w-2.5 h-2.5 rounded-full ${loc.status === 'active' ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                      <span className="font-medium text-[#1a1c3a] text-sm">{loc.city}</span>
                    </div>
                    <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                      loc.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {loc.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Map placeholder */}
            <div className="relative">
              <div className="bg-[#1a1c3a] rounded-2xl p-8 h-96 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 opacity-20" style={{
                  backgroundImage: 'radial-gradient(circle, rgba(244,153,26,0.3) 1px, transparent 1px)',
                  backgroundSize: '30px 30px'
                }} />
                <div className="relative text-center">
                  <MapPin size={60} className="text-[#f4991a] mx-auto mb-4" />
                  <div className="text-white font-bold text-2xl mb-2">Kenya</div>
                  <div className="text-white/50 text-sm">50+ delivery zones</div>
                  <div className="mt-6 flex gap-4 justify-center">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-emerald-500 rounded-full" />
                      <span className="text-white/70 text-xs">Active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 bg-gray-400 rounded-full" />
                      <span className="text-white/70 text-xs">Coming Soon</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="py-20 bg-[#f4991a]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { value: '10,000+', label: 'Orders Delivered' },
              { value: '500+', label: 'Active Sellers' },
              { value: '50+', label: 'Cities Covered' },
              { value: '98%', label: 'Customer Satisfaction' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-4xl font-bold text-white mb-2">{stat.value}</div>
                <div className="text-white/80 text-sm">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold text-[#1a1c3a] mb-6">
            Ready to Scale Your Business?
          </h2>
          <p className="text-gray-500 text-lg mb-10">
            Join hundreds of Kenyan e-commerce sellers who trust Shipedo for their logistics.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-[#1a1c3a] hover:bg-[#252750] text-white font-semibold px-10 py-4 rounded-xl transition-all hover:scale-105 shadow-xl">
              Start for Free
              <ArrowRight size={18} />
            </Link>
            <a href="tel:+254700000000" className="inline-flex items-center justify-center gap-2 border-2 border-[#1a1c3a] text-[#1a1c3a] font-semibold px-10 py-4 rounded-xl transition-all hover:bg-[#1a1c3a] hover:text-white">
              <Phone size={18} />
              Talk to Sales
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1a1c3a] py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 bg-[#f4991a] rounded-lg flex items-center justify-center">
                  <Truck size={18} className="text-white" />
                </div>
                <span className="text-white font-bold text-lg">Shipedo</span>
              </div>
              <p className="text-white/50 text-sm leading-relaxed">
                Africa's modern logistics platform for e-commerce growth.
              </p>
            </div>
            {[
              { title: 'Services', links: ['Delivery', 'Fulfillment', 'Call Center', 'COD Management'] },
              { title: 'Company', links: ['About Us', 'Careers', 'Blog', 'Contact'] },
              { title: 'Support', links: ['Help Center', 'Track Order', 'Seller Login', 'API Docs'] },
            ].map((col) => (
              <div key={col.title}>
                <h4 className="text-white font-semibold text-sm mb-4">{col.title}</h4>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-white/50 hover:text-white text-sm transition-colors">{link}</a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-white/40 text-sm">© 2024 Shipedo. All rights reserved. Kenya</p>
            <div className="flex gap-6">
              <a href="#" className="text-white/40 hover:text-white text-xs transition-colors">Privacy Policy</a>
              <a href="#" className="text-white/40 hover:text-white text-xs transition-colors">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
