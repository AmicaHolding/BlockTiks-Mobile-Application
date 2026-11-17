import { api, type SahraEvent } from './api';
import { isAvailable } from './format';

export async function fetchAvailableEvents(
  params: { category?: string; q?: string; limit?: number } = {},
  maxPages = 3
): Promise<SahraEvent[]> {
  const limit = params.limit ?? 100;
  const events: SahraEvent[] = [];
  let cursor: string | undefined;

  for (let page = 0; page < maxPages && events.length < limit; page += 1) {
    const res = await api.events({ ...params, limit, cursor });
    events.push(...res.events.filter(isAvailable));
    cursor = res.nextCursor;
    if (!cursor) break;
  }

  return events.slice(0, limit);
}
