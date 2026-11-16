// One-off demo seed: inserts a VALID ticket for the fan test account on an
// existing published event so the resale flow can be exercised end-to-end.
// Usage: FTOKEN=<fan jwt> EVENT_ID=<id> npx tsx scripts/seed-demo-ticket.ts
import { PutCommand } from '@aws-sdk/lib-dynamodb';
import { docClient } from '../src/aws';

const T = () => process.env.TABLE_NAME ?? 'blocktiks';

async function main() {
  const API = process.env.API_URL ?? 'http://localhost:4000';
  const EVENT_ID = process.env.EVENT_ID;
  const TOKEN = process.env.FTOKEN;
  const CODE = process.env.TICKET_CODE ?? 'SAHRA-DEMO-FAN-001';

  if (!EVENT_ID || !TOKEN) {
    console.error('Set EVENT_ID and FTOKEN env vars');
    process.exit(1);
  }

  const authed = { headers: { authorization: `Bearer ${TOKEN}` } };

  const meRes = await fetch(`${API}/auth/me`, authed);
  const me = (await meRes.json()) as { user: { id: string } };
  const eventRes = await fetch(`${API}/events/${EVENT_ID}`);
  const { event: e } = (await eventRes.json()) as {
    event: {
      title: string;
      startsAt: string;
      location?: string;
      tiers?: { id: string; name: string }[];
    };
  };
  const tier = e.tiers?.[0];

  const createdAt = new Date().toISOString();
  const userId = me.user.id;

  await docClient.send(
    new PutCommand({
      TableName: T(),
      Item: {
        pk: `TICKET#${CODE}`,
        sk: 'METADATA',
        code: CODE,
        orderId: 'seed-demo-order',
        eventId: EVENT_ID,
        eventTitle: e.title,
        eventStartsAt: e.startsAt,
        eventLocation: e.location ?? '',
        tierId: tier?.id ?? '',
        tierName: tier?.name ?? 'General Admission',
        userId,
        status: 'VALID',
        createdAt,
        gsi2pk: `USER#${userId}#TICKETS`,
        gsi2sk: `CREATED#${createdAt}#${CODE}`,
        gsi1pk: `EVENTTIX#${EVENT_ID}`,
        gsi1sk: `CREATED#${createdAt}#${CODE}`,
      },
    })
  );

  console.log(`Seeded ticket ${CODE} for user ${userId} on "${e.title}"`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
