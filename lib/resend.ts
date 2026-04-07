import { Resend } from 'resend'

/**
 * Server-only Resend client.
 *
 * Requires in .env.local:
 *   RESEND_API_KEY        (from https://resend.com/api-keys)
 *   RESEND_FROM_EMAIL     e.g. "Shipedo Billing <billing@yourdomain.com>"
 *
 * For development without a verified domain, you can use:
 *   RESEND_FROM_EMAIL="Shipedo <onboarding@resend.dev>"
 *   (only delivers to the address tied to the Resend account)
 */
const apiKey = process.env.RESEND_API_KEY

export const resend = apiKey ? new Resend(apiKey) : null

export const RESEND_FROM =
  process.env.RESEND_FROM_EMAIL ?? 'Shipedo <onboarding@resend.dev>'

export const isResendConfigured = Boolean(apiKey)
