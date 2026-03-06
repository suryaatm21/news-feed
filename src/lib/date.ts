const DATE_FORMATTER_CACHE = new Map<string, Intl.DateTimeFormat>();

export const DEFAULT_TIMEZONE = 'America/New_York';
export const TARGET_PUBLISH_HOUR = 8;
export const TARGET_PUBLISH_MINUTE = 30;

function getFormatter(
  timezone: string,
  options: Intl.DateTimeFormatOptions
): Intl.DateTimeFormat {
  const key = `${timezone}:${JSON.stringify(options)}`;
  const cached = DATE_FORMATTER_CACHE.get(key);
  if (cached) {
    return cached;
  }

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    ...options
  });
  DATE_FORMATTER_CACHE.set(key, formatter);
  return formatter;
}

export function getDateKey(date: Date, timezone = DEFAULT_TIMEZONE): string {
  const parts = getFormatter(timezone, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
    .formatToParts(date)
    .reduce<Record<string, string>>((accumulator, part) => {
      if (part.type !== 'literal') {
        accumulator[part.type] = part.value;
      }
      return accumulator;
    }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function formatLocalDateLabel(date: Date, timezone = DEFAULT_TIMEZONE): string {
  return getFormatter(timezone, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

export function getLocalTimeParts(date: Date, timezone = DEFAULT_TIMEZONE): {
  hour: number;
  minute: number;
} {
  const parts = getFormatter(timezone, {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).formatToParts(date);

  const map = parts.reduce<Record<string, string>>((accumulator, part) => {
    if (part.type !== 'literal') {
      accumulator[part.type] = part.value;
    }
    return accumulator;
  }, {});

  return {
    hour: Number(map.hour),
    minute: Number(map.minute)
  };
}

export function isWithinPublishWindow(
  date: Date,
  timezone = DEFAULT_TIMEZONE,
  targetHour = TARGET_PUBLISH_HOUR,
  targetMinute = TARGET_PUBLISH_MINUTE,
  toleranceMinutes = 15
): boolean {
  const { hour, minute } = getLocalTimeParts(date, timezone);
  if (hour !== targetHour) {
    return false;
  }

  return minute >= targetMinute && minute <= targetMinute + toleranceMinutes;
}

export function getStalenessCutoff(now: Date, hours = 36): number {
  return now.getTime() - hours * 60 * 60 * 1000;
}
