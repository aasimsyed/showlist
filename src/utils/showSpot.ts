import type { EventDay, Show } from '../types';

/** WordPress page that embeds the TablePress listings. */
export const SHOW_SPOT_PAGE_API =
  'https://www.austinshowspot.com/wp-json/wp/v2/pages/1485';

export function countShows(events: EventDay[]): number {
  let n = 0;
  for (const day of events) n += day.shows?.length || 0;
  return n;
}

/**
 * Parse Austin Show Spot TablePress HTML (or WP content.rendered) into EventDay[].
 */
export function parseAustinShowSpotHTML(html: string): EventDay[] {
  const tableHtml = extractTablepressHtml(html);
  if (!tableHtml) return [];

  const eventsByDate: Record<string, EventDay> = {};
  const rowChunks = tableHtml.split(/<tr\b/i);
  for (let i = 1; i < rowChunks.length; i++) {
    const chunk = rowChunks[i];
    const rowOpenEnd = chunk.indexOf('>');
    if (rowOpenEnd < 0) continue;
    const rowOpen = chunk.slice(0, rowOpenEnd);
    const rowNumMatch = rowOpen.match(/row-(\d+)/i);
    const rowNum = rowNumMatch ? parseInt(rowNumMatch[1], 10) : i;
    if (rowNum <= 1) continue;

    const rowEnd = chunk.indexOf('</tr>');
    const rowInner = chunk.slice(rowOpenEnd + 1, rowEnd < 0 ? undefined : rowEnd);
    const byCol = extractTablepressColumns(rowInner);

    const bandsHtml = byCol['3'];
    const dateMdY = cleanHTML(byCol['5'] || '');
    if (!bandsHtml || !dateMdY) continue;

    const fullDateRaw = cleanHTML(byCol['1'] || '');
    const dateKey = dateKeyFromMdY(dateMdY);
    if (!dateKey) continue;

    const show = parseShowSpotBandsCell(bandsHtml);
    if (!show) continue;

    if (!eventsByDate[dateKey]) {
      eventsByDate[dateKey] = {
        date: fullDateRaw || formatDateFromKey(dateKey),
        shows: [],
      };
    } else if (fullDateRaw && !/^[A-Za-z]+,/.test(eventsByDate[dateKey].date)) {
      eventsByDate[dateKey].date = fullDateRaw;
    }
    eventsByDate[dateKey].shows.push(show);
  }

  return Object.keys(eventsByDate)
    .sort()
    .map((k) => eventsByDate[k]);
}

export function mergeEventDays(primary: EventDay[], secondary: EventDay[]): EventDay[] {
  if (!secondary?.length) return primary || [];
  if (!primary?.length) return secondary;

  const byKey = new Map<
    string,
    { date: string; shows: Show[]; keys: Set<string> }
  >();

  for (const day of primary) {
    const key = dateKeyFromDisplay(day.date) || day.date;
    byKey.set(key, {
      date: day.date,
      shows: [...(day.shows || [])],
      keys: new Set((day.shows || []).map(normalizeShowKey)),
    });
  }

  for (const day of secondary) {
    const key = dateKeyFromDisplay(day.date) || dateKeyFromMdY(day.date) || day.date;
    let entry = byKey.get(key);
    if (!entry) {
      entry = { date: day.date, shows: [], keys: new Set() };
      byKey.set(key, entry);
    } else if (day.date && /^[A-Za-z]+,\s+[A-Za-z]+/.test(day.date)) {
      if (!entry.date || entry.date.length < day.date.length) entry.date = day.date;
    }

    for (const show of day.shows || []) {
      const sk = normalizeShowKey(show);
      if (entry.keys.has(sk)) {
        const existing = entry.shows.find((s) => normalizeShowKey(s) === sk);
        if (existing) enrichShow(existing, show);
        continue;
      }
      entry.shows.push(show);
      entry.keys.add(sk);
    }
  }

  return [...byKey.entries()]
    .sort((a, b) => String(a[0]).localeCompare(String(b[0])))
    .map(([, v]) => ({ date: v.date, shows: v.shows }));
}

export async function fetchShowSpotEventsFromDevice(): Promise<EventDay[]> {
  const res = await fetch(SHOW_SPOT_PAGE_API, {
    headers: {
      Accept: 'application/json',
      'User-Agent': 'ShowlistApp/1.0',
    },
  });
  if (!res.ok) throw new Error(`Show Spot API HTTP ${res.status}`);
  const data = await res.json();
  const rendered = data?.content?.rendered;
  if (typeof rendered !== 'string' || !/tablepress-/i.test(rendered)) {
    throw new Error('Show Spot page missing listings table');
  }
  return parseAustinShowSpotHTML(rendered);
}

function extractTablepressHtml(html: string): string | null {
  const idMatch = html.match(/id=["']tablepress-\d+["']/i);
  if (!idMatch || idMatch.index == null) return null;
  const start = html.lastIndexOf('<table', idMatch.index);
  if (start < 0) return null;
  const end = html.indexOf('</table>', idMatch.index);
  if (end < 0) return null;
  return html.slice(start, end + '</table>'.length);
}

function extractTablepressColumns(rowInner: string): Record<string, string> {
  const byCol: Record<string, string> = {};
  const parts = rowInner.split(/<t[dh]\b/i);
  for (let i = 1; i < parts.length; i++) {
    const part = parts[i];
    const openEnd = part.indexOf('>');
    if (openEnd < 0) continue;
    const open = part.slice(0, openEnd);
    const colMatch = open.match(/column-(\d+)/i);
    if (!colMatch) continue;
    const close = /^h\b/i.test(open) ? '</th>' : '</td>';
    const closeIdx = part.toLowerCase().indexOf(close);
    byCol[colMatch[1]] = part.slice(openEnd + 1, closeIdx < 0 ? undefined : closeIdx);
  }
  return byCol;
}

function parseShowSpotBandsCell(bandsHtml: string): Show | null {
  try {
    const doorsMatch = bandsHtml.match(/doors\s+at\s+(\d{1,2}:\d{2}\s*(?:am|pm))/i);
    let time = doorsMatch ? doorsMatch[1].replace(/\s+/g, '').toLowerCase() : null;

    const startMatch = bandsHtml.match(
      /<span\s+class=["']start["']>\s*(\d{1,2}\/\d{1,2}\/\d{4})\s+(\d{1,2}):(\d{2})\s*<\/span>/i
    );
    if (!time && startMatch) {
      time = formatHourMinute12(parseInt(startMatch[2], 10), parseInt(startMatch[3], 10));
    }

    const ticketMatch =
      bandsHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*title=["']Tickets link["'][^>]*>/i) ||
      bandsHtml.match(/<a[^>]*title=["']Tickets link["'][^>]*href=["']([^"']+)["'][^>]*>/i);
    const infoMatch =
      bandsHtml.match(/<a[^>]*href=["']([^"']+)["'][^>]*title=["']Information link["'][^>]*>/i) ||
      bandsHtml.match(/<a[^>]*title=["']Information link["'][^>]*href=["']([^"']+)["'][^>]*>/i) ||
      bandsHtml.match(
        /<a[^>]*href=["']([^"']+)["'][^>]*title=["'](?:Facebook event|Instagram post\/flyer)["'][^>]*>/i
      ) ||
      bandsHtml.match(
        /<a[^>]*title=["'](?:Facebook event|Instagram post\/flyer)["'][^>]*href=["']([^"']+)["'][^>]*>/i
      );

    const eventLink = (ticketMatch && ticketMatch[1]) || (infoMatch && infoMatch[1]) || null;

    const atVenueMatch = bandsHtml.match(
      /^([\s\S]*?)\s+at\s+<a[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>\s*,?\s*doors\s+at/i
    );
    if (!atVenueMatch) return null;

    const artist = cleanHTML(atVenueMatch[1]).replace(/\s+/g, ' ').trim();
    const venueHref = atVenueMatch[2].trim();
    const venueRaw = cleanHTML(atVenueMatch[3]).replace(/\s+/g, ' ').trim();
    if (!artist || !venueRaw) return null;

    const isMap = /google\.com\/maps|maps\.app\.goo\.gl|maps\.google\./i.test(venueHref);
    let venue = venueRaw;
    let address = venueRaw;
    const addrSplit = venueRaw.match(/^(.+?),\s+(\d+.+)$/);
    if (addrSplit) {
      venue = addrSplit[1].trim();
      address = addrSplit[2].trim();
    }

    return {
      artist,
      venue,
      address: address || venue,
      eventLink: eventLink || '',
      venueLink: isMap ? '' : venueHref,
      mapLink: isMap ? venueHref : null,
      time,
    };
  } catch {
    return null;
  }
}

function formatHourMinute12(hour24: number, minute: number): string {
  const h = ((hour24 + 11) % 12) + 1;
  const ampm = hour24 >= 12 ? 'pm' : 'am';
  return `${h}:${String(minute).padStart(2, '0')}${ampm}`;
}

function formatDateFromKey(dateKey: string): string {
  try {
    const year = dateKey.substring(0, 4);
    const month = dateKey.substring(4, 6);
    const day = dateKey.substring(6, 8);
    const date = new Date(`${year}-${month}-${day}`);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return dateKey;
  }
}

function dateKeyFromMdY(mdy: string): string | null {
  const m = String(mdy).trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  return `${m[3]}${m[1].padStart(2, '0')}${m[2].padStart(2, '0')}`;
}

const MONTH_NAMES = [
  'january', 'february', 'march', 'april', 'may', 'june',
  'july', 'august', 'september', 'october', 'november', 'december',
];

/**
 * Display date -> YYYYMMDD. Matches "Month Day, Year" (weekday name, if any,
 * is ignored) with an explicit month lookup instead of a native Date parse,
 * since Hermes's Date.parse is less permissive than V8 for this format and
 * a parse failure here would silently split a merged day into two entries.
 */
function dateKeyFromDisplay(dateStr: string): string | null {
  if (!dateStr) return null;
  const cleaned = String(dateStr).replace(/(\d+)(st|nd|rd|th)/gi, '$1').trim();
  const m = cleaned.match(/([A-Za-z]+)\s+(\d{1,2}),?\s+(\d{4})/);
  if (!m) return null;
  const monthIdx = MONTH_NAMES.indexOf(m[1].toLowerCase());
  if (monthIdx < 0) return null;
  const day = String(parseInt(m[2], 10)).padStart(2, '0');
  const month = String(monthIdx + 1).padStart(2, '0');
  return `${m[3]}${month}${day}`;
}

function normalizeShowKey(show: Show): string {
  let artist = String(show.artist || '')
    .toLowerCase()
    .replace(/&amp;/g, '&')
    .replace(/\([^)]*\)/g, ' ');
  const headliner = artist
    .split(/\s*,\s*|\s+with\s+|\s+w\/\s+|\s+\/\s+|\s+feat\.?\s+|\s+and\s+the\s+/i)[0]
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const venue = String(show.venue || '')
    .toLowerCase()
    .replace(/^the\s+/, '')
    .replace(/&amp;/g, '&')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return `${headliner}|${venue}`;
}

function enrichShow(target: Show, source: Show): void {
  if (!target.eventLink && source.eventLink) target.eventLink = source.eventLink;
  if (!target.venueLink && source.venueLink) target.venueLink = source.venueLink;
  if (!target.mapLink && source.mapLink) target.mapLink = source.mapLink;
  if (!target.time && source.time) target.time = source.time;
  if (
    (!target.address || target.address === target.venue) &&
    source.address &&
    source.address !== source.venue
  ) {
    target.address = source.address;
  }
}

function cleanHTML(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#8217;/g, "'")
    .replace(/&#8216;/g, "'")
    .replace(/&#8220;/g, '"')
    .replace(/&#8221;/g, '"')
    .trim();
}
