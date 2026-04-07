import { NextRequest, NextResponse } from 'next/server'
import { randomBytes } from 'crypto'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { resend, RESEND_FROM, isResendConfigured } from '@/lib/resend'

/**
 * POST /api/auth/forgot
 * Body: { email: string }
 *
 * Looks up the email in `sellers` then `agents`, generates a reset
 * token, persists it in `password_resets`, and emails the user a link.
 *
 * For privacy we always return success — never reveal whether the
 * email exists or not.
 */
export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json().catch(() => ({}))
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ success: false, error: 'email required' }, { status: 400 })
    }
    const normalized = email.trim().toLowerCase()

    // 1. Find user
    let user: { id: string; email: string; name: string | null } | null = null
    let role: 'seller' | 'agent' | null = null

    const { data: seller } = await supabaseAdmin
      .from('sellers')
      .select('id, email, name')
      .ilike('email', normalized)
      .maybeSingle()
    if (seller) { user = seller as any; role = 'seller' }

    if (!user) {
      const { data: agent } = await supabaseAdmin
        .from('agents')
        .select('id, email, name')
        .ilike('email', normalized)
        .maybeSingle()
      if (agent) { user = agent as any; role = 'agent' }
    }

    // Always return success — don't leak existence
    if (!user || !role) {
      return NextResponse.json({ success: true })
    }

    // 2. Generate token + save row
    const token = randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1h

    const { error: insertErr } = await supabaseAdmin
      .from('password_resets')
      .insert({
        token,
        email:      user.email,
        role,
        user_id:    String(user.id),
        expires_at: expiresAt,
      })

    if (insertErr) {
      return NextResponse.json({ success: false, error: insertErr.message }, { status: 500 })
    }

    // 3. Send email
    if (!isResendConfigured) {
      console.warn('[auth/forgot] RESEND_API_KEY missing — email not sent.')
      return NextResponse.json({ success: true })
    }

    const origin =
      req.headers.get('origin') ??
      `${req.nextUrl.protocol}//${req.nextUrl.host}`
    const resetUrl = `${origin}/reset-password?token=${token}`
    const displayName = user.name ?? 'there'

    const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f7fb;font-family:Inter,Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.05);">
    <tr><td style="background:linear-gradient(135deg,#1a1c3a 0%,#252750 100%);padding:28px 32px;">
      <div style="display:inline-block;background:#f4991a;width:44px;height:44px;border-radius:12px;text-align:center;line-height:44px;color:#fff;font-size:22px;font-weight:800;">S</div>
      <div style="display:inline-block;margin-left:10px;vertical-align:middle;">
        <div style="color:#fff;font-size:20px;font-weight:800;letter-spacing:-.3px;">Shipedo</div>
        <div style="color:rgba(255,255,255,.5);font-size:11px;">Password reset</div>
      </div>
    </td></tr>
    <tr><td style="padding:32px;">
      <h2 style="margin:0 0 12px 0;font-size:20px;color:#1a1c3a;">Reset your password</h2>
      <p style="margin:0 0 16px 0;font-size:14px;color:#6b7280;line-height:1.6;">
        Hi ${displayName}, we got a request to reset your Shipedo password. Click the
        button below to set a new one. This link expires in <strong>1 hour</strong>.
      </p>
      <div style="text-align:center;margin:24px 0;">
        <a href="${resetUrl}" style="display:inline-block;background:#f4991a;color:#ffffff;font-weight:700;text-decoration:none;padding:14px 28px;border-radius:12px;font-size:14px;">Reset password</a>
      </div>
      <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
        If the button doesn't work, copy and paste this URL into your browser:<br />
        <a href="${resetUrl}" style="color:#f4991a;word-break:break-all;">${resetUrl}</a>
      </p>
      <p style="margin:24px 0 0 0;font-size:12px;color:#9ca3af;line-height:1.6;">
        If you didn't ask to reset your password you can safely ignore this email — your
        current password will keep working.
      </p>
    </td></tr>
    <tr><td style="padding:18px 32px;background:#fafafa;border-top:1px solid #f1f1f1;text-align:center;">
      <div style="font-size:11px;color:#9ca3af;">© ${new Date().getFullYear()} Shipedo</div>
    </td></tr>
  </table>
</body></html>`

    const text = `Hi ${displayName},\n\nReset your Shipedo password by opening this link (valid for 1 hour):\n\n${resetUrl}\n\nIf you didn't request this you can ignore the email.\n\n— Shipedo`

    try {
      await resend!.emails.send({
        from:    RESEND_FROM,
        to:      [user.email],
        subject: 'Reset your Shipedo password',
        html,
        text,
      })
    } catch (err) {
      console.error('[auth/forgot] resend error', err)
      // still return success for privacy
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? 'unknown error' }, { status: 500 })
  }
}
