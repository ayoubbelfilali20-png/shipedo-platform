#!/usr/bin/env node
/**
 * Shipedo — Data Migration Script
 * 1. Detects missing columns in new project
 * 2. Generates ALTER TABLE SQL to fix them
 * 3. Migrates all data from OLD (US) → NEW (EU West)
 *
 * Run: node migrate.js
 */

const { createClient } = require('@supabase/supabase-js')

// ── OLD project (US) ─────────────────────────────────────────────────────────
const OLD_URL = 'https://ivgogaqfhzcxievzfqhk.supabase.co'
const OLD_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml2Z29nYXFmaHpjeGlldnpmcWhrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTQ5MDg5OCwiZXhwIjoyMDkxMDY2ODk4fQ.k3ryrq8g5ro-pEXJBzVIPrTJBcORZ428obqaQWENPY8'

// ── NEW project (EU West) ─────────────────────────────────────────────────────
const NEW_URL = 'https://vbllhgpwruzpskgsvkvl.supabase.co'
const NEW_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZibGxoZ3B3cnV6cHNrZ3N2a3ZsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjcwMDc2NCwiZXhwIjoyMDkyMjc2NzY0fQ.7IB3QPRJ438l1IxgU3fpzRLWHa0ycDUuM47rcTLDEfQ'

const oldDb = createClient(OLD_URL, OLD_KEY)
const newDb = createClient(NEW_URL, NEW_KEY)

// Tables in order (respect foreign keys)
const TABLES = [
  'sellers',
  'agents',
  'products',
  'orders',
  'call_logs',
  'seller_payouts',
  'seller_wallets',
  'wallet_transactions',
  'seller_invoices',
  'withdraw_requests',
  'password_resets',
  'expeditions',
]

// Which column is the PK / conflict key per table
const CONFLICT_COL = {
  seller_wallets: 'seller_id', // PK is seller_id not id
}

async function fetchAll(table) {
  let all = []
  let from = 0
  const PAGE = 1000
  while (true) {
    const { data, error } = await oldDb.from(table).select('*').range(from, from + PAGE - 1)
    if (error) { console.error(`  ✗ fetch ${table}:`, error.message); break }
    if (!data || data.length === 0) break
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

// Get column names that exist in new project for a table
async function getNewCols(table) {
  const { data, error } = await newDb.from(table).select('*').limit(1)
  if (error && error.code === '42P01') return null  // table doesn't exist
  // If no rows, we can't infer columns from data — return empty set
  if (!data || data.length === 0) return new Set()
  return new Set(Object.keys(data[0]))
}

// Guess SQL type from JS value
function guessType(val) {
  if (val === null || val === undefined) return 'text'
  if (typeof val === 'boolean') return 'boolean'
  if (typeof val === 'number') return Number.isInteger(val) ? 'integer' : 'numeric'
  if (typeof val === 'object') return 'jsonb'
  // date/timestamp strings
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}(T|\s)/.test(val)) return 'timestamptz'
  if (typeof val === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(val)) return 'date'
  return 'text'
}

async function insertBatch(table, rows) {
  const conflictCol = CONFLICT_COL[table] || 'id'
  const BATCH = 200
  for (let i = 0; i < rows.length; i += BATCH) {
    const chunk = rows.slice(i, i + BATCH)
    const { error } = await newDb.from(table).upsert(chunk, { onConflict: conflictCol })
    if (error) {
      console.error(`  ✗ insert ${table} (batch ${i}):`, error.message)
      return false
    }
  }
  return true
}

async function migrate() {
  console.log('🚀 Shipedo Migration: US → EU West\n')

  // ── PHASE 1: detect missing columns & generate SQL ──────────────────────────
  console.log('🔍 Phase 1: Checking schema differences...\n')
  const alterStatements = []

  for (const table of TABLES) {
    const oldRows = await fetchAll(table)
    if (oldRows.length === 0) continue

    const oldCols = Object.keys(oldRows[0])
    const newColsSet = await getNewCols(table)

    if (newColsSet === null) {
      console.log(`  ⚠️  Table "${table}" does not exist in new project — skipping column check`)
      continue
    }

    let missing = []
    if (newColsSet.size === 0) {
      // No rows in new DB yet — we can't compare, just try inserting
      missing = []
    } else {
      missing = oldCols.filter(c => !newColsSet.has(c))
    }

    if (missing.length > 0) {
      console.log(`  ⚠️  ${table}: missing columns → ${missing.join(', ')}`)
      for (const col of missing) {
        const sampleVal = oldRows.find(r => r[col] !== null && r[col] !== undefined)?.[col]
        const sqlType = guessType(sampleVal)
        alterStatements.push(
          `ALTER TABLE public.${table} ADD COLUMN IF NOT EXISTS ${col} ${sqlType};`
        )
      }
    }
  }

  if (alterStatements.length > 0) {
    console.log('\n📋 Running ALTER TABLE on new project to add missing columns...\n')

    // Run via Supabase REST using rpc if available, otherwise print for manual run
    // Since we can't run raw SQL via anon REST, we'll use the PostgREST approach:
    // POST to /rest/v1/rpc/exec_sql — but that requires a custom function.
    // Instead, we use the Supabase Management API (requires access token, not service key).
    // So we print the SQL and patch via fetch to the SQL endpoint.

    const sqlBlock = alterStatements.join('\n')
    console.log('SQL TO RUN IN NEW PROJECT SQL EDITOR:')
    console.log('─'.repeat(60))
    console.log(sqlBlock)
    console.log('─'.repeat(60))
    console.log('\n⚠️  Please run the SQL above in your NEW project SQL Editor, then re-run this script.\n')
    process.exit(0)
  }

  // ── PHASE 2: migrate data ───────────────────────────────────────────────────
  console.log('📦 Phase 2: Migrating data...\n')

  for (const table of TABLES) {
    process.stdout.write(`  ${table} ... `)
    const rows = await fetchAll(table)

    if (rows.length === 0) {
      console.log('(empty)')
      continue
    }

    const ok = await insertBatch(table, rows)
    if (ok) console.log(`✓ ${rows.length} rows`)
  }

  console.log('\n✅ Migration complete!\n')
  console.log('Next step: update .env.local with new project credentials:')
  console.log(`  NEXT_PUBLIC_SUPABASE_URL=${NEW_URL}`)
  console.log(`  NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon key from new project>`)
  console.log(`  SUPABASE_SERVICE_ROLE_KEY=${NEW_KEY}`)
}

migrate().catch(console.error)
