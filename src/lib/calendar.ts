import ical, { type CalendarResponse, type EventInstance } from 'node-ical';

const TZ = 'America/Mexico_City';
const TTL_MS = 10 * 60 * 1000;
const SHADES = ['#000', '#333', '#555', '#777', '#999', '#b3b3b3', '#cfcfcf'];

interface CalendarConfig {
  name: string;
  url: string;
}

interface CalendarEvent {
  summary: string;
  start: Date;
  end: Date;
  allDay: boolean;
  calendarName: string;
  shade: string;
  startKey?: string;
}

interface Day {
  date: Date;
  key: string;
  label: string;
  events: CalendarEvent[];
}

type Parts = { year: number; month: number; day: number; hour: number; minute: number; second: number };

const fmtParts = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
});

const dayKeyFmt = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

const headerFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

export const timeFmt = new Intl.DateTimeFormat('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

const updatedFmt = new Intl.DateTimeFormat('en-US', {
  timeZone: TZ,
  dateStyle: 'medium',
  timeStyle: 'short',
});

function zonedParts(date: Date): Parts {
  const p = Object.fromEntries(
    fmtParts
      .formatToParts(date)
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, x.value])
  );
  return { year: +p.year, month: +p.month, day: +p.day, hour: +p.hour, minute: +p.minute, second: +p.second };
}

function tzOffsetMs(date: Date): number {
  const p = zonedParts(date);
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - date.getTime();
}

function wallToDate(y: number, m: number, d: number, h = 0, mi = 0, s = 0): Date {
  const w = Date.UTC(y, m - 1, d, h, mi, s);
  let t = w;
  for (let i = 0; i < 3; i++) t = w - tzOffsetMs(new Date(t));
  return new Date(t);
}

function dayKey(date: Date): string {
  return dayKeyFmt.format(date);
}

function headerLabel(date: Date): string {
  const p = Object.fromEntries(
    headerFmt
      .formatToParts(date)
      .filter((x) => x.type !== 'literal')
      .map((x) => [x.type, x.value])
  );
  return `${p.weekday} ${p.month} ${p.day}`;
}

// In-memory cache keyed by the current day (the rolling window starts today).
const cache = new Map<string, { fetchedAt: number; events: CalendarEvent[] }>();

async function fetchEvents(calendars: CalendarConfig[], start: Date, end: Date): Promise<CalendarEvent[]> {
  const events: CalendarEvent[] = [];
  for (let i = 0; i < calendars.length; i++) {
    const c = calendars[i];
    if (!c || typeof c.name !== 'string' || typeof c.url !== 'string') {
      console.warn(`[kindle-calendar] skipped invalid calendar entry at index ${i}; expected { name, url }`);
      continue;
    }
    const { name, url } = c;
    let cal: CalendarResponse;
    const ac = new AbortController();
    const timer = setTimeout(() => ac.abort(), 15000);
    try {
      cal = await (ical.async.fromURL(url, { signal: ac.signal }) as unknown as Promise<CalendarResponse>);
    } catch (err) {
      console.warn(`[kindle-calendar] skipped calendar "${name}": ${err instanceof Error ? err.message : String(err)}`);
      continue;
    } finally {
      clearTimeout(timer);
    }
    for (const ev of Object.values(cal)) {
      if (!ev || ev.type !== 'VEVENT' || !ev.start) continue;
      let instances: EventInstance[];
      try {
        instances = ical.expandRecurringEvent(ev, { from: start, to: end, expandOngoing: true });
      } catch (err) {
        console.warn(`[kindle-calendar] skipped event "${ev.summary}" in "${name}": ${err instanceof Error ? err.message : String(err)}`);
        continue;
      }
      for (const inst of instances) {
        events.push({
          summary: String(inst.summary),
          start: inst.start,
          end: inst.end,
          allDay: inst.isFullDay,
          calendarName: name,
          shade: SHADES[i % SHADES.length],
        });
      }
    }
  }
  return events;
}

function buildDays(start: Date, end: Date): Day[] {
  const days: Day[] = [];
  for (let d = 0; d < 7; d++) {
    const date = new Date(start.getTime() + d * 86400000);
    days.push({ date, key: dayKey(date), label: headerLabel(date), events: [] });
  }
  return days;
}

export async function getWeek(now: Date = new Date()) {
  const todayParts = zonedParts(now);
  const start = wallToDate(todayParts.year, todayParts.month, todayParts.day);
  const end = new Date(start.getTime() + 7 * 86400000);

  // Runtime env wins. In dev, fall back to the `.env` value Astro exposes on
  // import.meta.env (Vite's loadEnv does not populate process.env). In
  // production builds `import.meta.env.DEV` is false, so nothing is baked in.
  const rawCalendars = process.env.CALENDARS ?? (import.meta.env.DEV ? import.meta.env.CALENDARS : undefined);
  let calendars: CalendarConfig[] = [];
  let configError = '';
  if (!rawCalendars) {
    configError = 'No calendars configured. Set the CALENDARS environment variable (see .env.example).';
  } else {
    try {
      calendars = JSON.parse(rawCalendars);
      if (!Array.isArray(calendars) || calendars.length === 0) {
        configError = 'CALENDARS is empty. Add at least one { name, url } calendar.';
      }
    } catch {
      configError = 'CALENDARS is not valid JSON. Expected an array of { name, url } objects.';
    }
  }

  const key = dayKey(now);
  let events: CalendarEvent[] = [];
  let updatedAt = now.getTime();
  if (!configError) {
    const cached = cache.get(key);
    if (cached && now.getTime() - cached.fetchedAt < TTL_MS) {
      events = cached.events;
      updatedAt = cached.fetchedAt;
    } else {
      events = await fetchEvents(calendars, start, end);
      updatedAt = Date.now();
      cache.set(key, { fetchedAt: updatedAt, events });
    }
  }

  const days = buildDays(start, end);
  for (const ev of events) {
    ev.startKey = dayKey(ev.start);
    let endKey = dayKey(new Date(ev.end.getTime() - 1));
    if (endKey < ev.startKey) endKey = ev.startKey;
    for (const day of days) {
      if (day.key >= ev.startKey && day.key <= endKey) day.events.push(ev);
    }
  }
  for (const day of days) {
    day.events.sort((a, b) => {
      if (a.allDay !== b.allDay) return a.allDay ? -1 : 1;
      return a.start.getTime() - b.start.getTime();
    });
  }

  const todayKey = dayKey(now);
  const stripRows = [];
  for (let i = 1; i < days.length; i += 3) {
    stripRows.push(days.slice(i, i + 3));
  }
  const weekLabel = `${headerLabel(start)} – ${headerLabel(new Date(end.getTime() - 1))}, ${zonedParts(new Date(end.getTime() - 1)).year}`;
  const updatedTimeStr = updatedFmt.format(new Date(updatedAt));

  return { configError, days, todayKey, stripRows, weekLabel, updatedTimeStr, updatedAt };
}