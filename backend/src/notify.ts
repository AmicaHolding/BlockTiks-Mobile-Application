import { createNotification, getUserById, type User } from './db';
import { env } from './env';

// Outbound messaging. Push and SMS have no provider wired yet: both log and
// return so callers (invite updates, RSVP decisions, OTP) work end to end.

// TODO(decision-17): SMS vs WhatsApp per country is still open — the caller
// picks the channel, Twilio delivers both (whatsapp: prefix for whatsapp).
export async function sendSms(to: string, body: string, channel: 'sms' | 'whatsapp' = 'sms'): Promise<void> {
  if (!env.twilioAccountSid || !env.twilioAuthToken || (!env.twilioFrom && !env.twilioMessagingSid)) {
    console.log(`[${channel}:stub] to=${to} ${body}`);
    return;
  }
  const addr = channel === 'whatsapp' ? `whatsapp:${to}` : to;
  const params = new URLSearchParams({ To: addr, Body: body });
  if (env.twilioMessagingSid) params.set('MessagingServiceSid', env.twilioMessagingSid);
  else params.set('From', channel === 'whatsapp' ? `whatsapp:${env.twilioFrom}` : env.twilioFrom);
  const res = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    }
  );
  if (!res.ok) {
    const err = await res.text().catch(() => '');
    throw new Error(`twilio ${res.status}: ${err.slice(0, 200)}`);
  }
}

// TODO(api-gap): no push provider (APNs/FCM) yet; device tokens are not stored.
export async function sendPush(userId: string, title: string, body: string): Promise<void> {
  console.log(`[push:stub] user=${userId} ${title}: ${body}`);
}

export interface NotifyInput {
  type: string;
  title: string;
  body: string;
  link?: string;
}

// Stores a Notification (shows in the inbox) and delivers it. I8: push to app
// users, SMS to others — a user who turned push off but has a phone gets SMS.
export async function notifyUser(
  userOrId: User | string,
  input: NotifyInput,
  opts: { sms?: boolean } = {}
): Promise<{ channel: 'push' | 'sms' | 'none' }> {
  const user = typeof userOrId === 'string' ? await getUserById(userOrId) : userOrId;
  if (!user || user.deletedAt) return { channel: 'none' };
  await createNotification(user.id, input);
  const pushOff = user.notificationPrefs?.push === false;
  if (opts.sms && pushOff && user.phone) {
    await sendSms(user.phone, `${input.title}: ${input.body}`);
    return { channel: 'sms' };
  }
  if (!pushOff) {
    await sendPush(user.id, input.title, input.body);
    return { channel: 'push' };
  }
  return { channel: 'none' };
}
