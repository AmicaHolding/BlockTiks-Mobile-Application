import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { env } from './env';

// Transactional email via AWS SES. When SES_FROM_EMAIL is not configured
// (local dev), messages are logged instead of sent — callers still work and
// dev-only fallbacks (e.g. devCode) remain available in development.

let ses: SESClient | null = null;

function sesClient(): SESClient {
  if (!ses) ses = new SESClient({ region: env.sesRegion });
  return ses;
}

export function emailConfigured(): boolean {
  return Boolean(env.sesFromEmail);
}

export async function sendEmail(input: { to: string; subject: string; text: string; html?: string }): Promise<void> {
  if (!emailConfigured()) {
    // Dev fallback: log the message body so local flows remain testable.
    console.log(`[email:dev] to=${input.to} subject=${input.subject}\n${input.text}`);
    return;
  }
  await sesClient().send(
    new SendEmailCommand({
      Source: env.sesFromEmail,
      Destination: { ToAddresses: [input.to] },
      Message: {
        Subject: { Data: input.subject },
        Body: {
          Text: { Data: input.text },
          ...(input.html ? { Html: { Data: input.html } } : {}),
        },
      },
    })
  );
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
