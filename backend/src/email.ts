import { env } from './env';

// Transactional email via Resend. When RESEND_API_KEY / EMAIL_FROM are not
// configured (local dev), messages are logged instead of sent.

export function emailConfigured(): boolean {
  return Boolean(env.resendApiKey && env.emailFrom);
}

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  if (!emailConfigured()) {
    console.log(`[email:dev] to=${input.to} subject=${input.subject}\n${input.text}`);
    return;
  }
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${env.resendApiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: env.emailFrom, to: [input.to], subject: input.subject, text: input.text, html: input.html }),
  });
  if (!res.ok) throw new Error(`Resend send failed: ${res.status} ${await res.text()}`);
}

export async function sendVerificationEmail(to: string, link: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Verify your Sahra email',
    text: `Confirm your email address by opening this link (valid for 24 hours):\n\n${link}\n\nIf you did not request this, you can ignore this email.`,
  });
}

export async function sendPasswordResetEmail(to: string, code: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Your Sahra password reset code',
    text: `Your Sahra password reset code is ${code}. It expires in 10 minutes.\n\nIf you did not request this, you can ignore this email.`,
  });
}

export async function sendOtpEmail(to: string, code: string): Promise<void> {
  await sendEmail({
    to,
    subject: 'Your Sahra code',
    text: `Your Sahra sign-in code is ${code}. It expires in 10 minutes.`,
    html: `<p>Your Sahra sign-in code is <strong style="font-size:24px;letter-spacing:4px">${code}</strong>.</p><p>It expires in 10 minutes.</p>`,
  });
}
