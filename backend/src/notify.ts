import { createNotification, getUserById, type User } from './db';

// Outbound messaging. Push and SMS have no provider wired yet: both log and
// return so callers (invite updates, RSVP decisions, OTP) work end to end.

// TODO(decision-17): SMS vs WhatsApp per country is still open, and no SMS
// provider is connected. This stub only logs.
export async function sendSms(to: string, body: string, channel: 'sms' | 'whatsapp' = 'sms'): Promise<void> {
  console.log(`[${channel}:stub] to=${to} ${body}`);
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
