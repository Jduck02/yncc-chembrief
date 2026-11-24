export function getKstDateString(date: Date = new Date()): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(date);
}

export function getOffsetKstDateString(daysOffset: number, baseDate: Date = new Date()): string {
  const target = new Date(baseDate.getTime() + daysOffset * 24 * 60 * 60 * 1000);
  return getKstDateString(target);
}

export function formatKstDateTime(date: Date = new Date()): string {
  const datePart = getKstDateString(date);
  const timeFormatter = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${datePart} ${timeFormatter.format(date)} KST`;
}

export interface BriefingWindowBounds {
  todayKst: string;
  yesterdayKst: string;
  windowStartKstLabel: string;
  windowStartMs: number;
  nowKstLabel: string;
}

/**
 * Returns the briefing attribution date (todayKst) and collection start boundary.
 * Articles published after yesterday 18:00 KST (including yesterday 18:00~23:59 KST
 * before midnight) are collected and attributed to todayKst.
 */
export function getBriefingWindowBoundsKst(now: Date = new Date()): BriefingWindowBounds {
  const todayKst = getKstDateString(now);
  const yesterdayKst = getOffsetKstDateString(-1, now);
  const windowStartKstLabel = `${yesterdayKst} 18:00 KST`;
  const windowStartMs = Date.parse(`${yesterdayKst}T18:00:00+09:00`);
  return {
    todayKst,
    yesterdayKst,
    windowStartKstLabel,
    windowStartMs,
    nowKstLabel: formatKstDateTime(now),
  };
}

function extractUrlDateString(sourceUrl?: string): string | null {
  if (!sourceUrl) return null;
  const slashMatch = sourceUrl.match(/\/(202\d)[/-](0[1-9]|1[0-2])[/-](0[1-9]|[12]\d|3[01])(?:\/|$|[?#])/);
  if (slashMatch) {
    return `${slashMatch[1]}-${slashMatch[2]}-${slashMatch[3]}`;
  }
  const compactMatch = sourceUrl.match(/(?:^|[^\d])(202\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?:\d{4,}|[^\d]|$)/);
  if (compactMatch) {
    return `${compactMatch[1]}-${compactMatch[2]}-${compactMatch[3]}`;
  }
  return null;
}

/**
 * Checks if an article timestamp (and optional URL-embedded date) falls within
 * [yesterday 18:00 KST, now + 1h]. Rejects stale URLs dated strictly before yesterdayKst.
 */
export function isWithinBriefingWindow(
  publishedAt: string,
  bounds: BriefingWindowBounds,
  now: Date = new Date(),
  sourceUrl?: string
): boolean {
  const urlDate = extractUrlDateString(sourceUrl);
  if (urlDate && urlDate < bounds.yesterdayKst) {
    return false;
  }

  if (!publishedAt) return true;
  const normalized = publishedAt
    .trim()
    .replace(/\s+KST$/i, '+09:00')
    .replace(/\s+/, 'T');
  const parsed = Date.parse(normalized);
  if (Number.isNaN(parsed)) {
    return true;
  }
  return parsed >= bounds.windowStartMs && parsed <= now.getTime() + 60 * 60 * 1000;
}
