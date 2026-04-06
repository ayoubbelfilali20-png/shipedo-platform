# Shipedo — Setup Guide

## Prerequisites

Install Node.js 18+ from: https://nodejs.org/

Or via Homebrew:
```bash
brew install node
```

## Installation

```bash
cd ~/Desktop/platforme
npm install
npm run dev
```

Open: http://localhost:3000

## Demo Credentials

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@shipedo.com | demo123 |
| Seller | seller@shipedo.com | demo123 |
| Call Agent | agent@shipedo.com | demo123 |

## Pages

| URL | Description |
|-----|-------------|
| `/` | Landing page |
| `/login` | Authentication |
| `/dashboard` | Main dashboard |
| `/dashboard/orders` | Order management |
| `/dashboard/call-center` | Call confirmation |
| `/dashboard/fulfillment` | Inventory & warehouse |
| `/dashboard/cod` | COD tracking & payouts |
| `/dashboard/invoices` | Invoice generation |
| `/dashboard/analytics` | Reports & charts |
| `/dashboard/customers` | Customer database |
| `/dashboard/settings` | Platform settings |

## API Endpoints

```
GET  /api/orders              # List all orders
POST /api/orders              # Create order
GET  /api/orders/:id          # Get single order
PATCH /api/orders/:id         # Update order status

GET  /api/invoices/:orderId   # Get invoice data
POST /api/notifications/email # Send email notification
```

## Email Types (POST /api/notifications/email)

```json
{
  "type": "order_confirmed",
  "orderId": "ord-001"
}
```

Types: `order_confirmed` | `order_shipped` | `order_delivered` | `cod_collected` | `daily_summary`

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS
- **Charts**: Recharts
- **Icons**: Lucide React
- **Language**: TypeScript

## Production

Connect to:
- **Database**: PostgreSQL (via Supabase)
- **Email**: SendGrid or Mailgun (replace mock in `/api/notifications/email`)
- **Auth**: NextAuth.js
- **PDF**: Puppeteer or @react-pdf/renderer for actual PDF generation
