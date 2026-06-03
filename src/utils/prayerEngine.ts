export interface PrayerTime {
  name: string;
  time: string; // "HH:mm" format from API
  date: Date;   // Today's Date object for this prayer
}

export interface NextPrayerInfo {
  name: string;
  time: string;
  remainingMinutes: number;
  remainingSeconds: number;
}

export const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = typeof PRAYER_NAMES[number];


export function parseTimeString(timeStr: string, timezone: string = ''): Date {
  const cleanTimeStr = timeStr.split(' ')[0];
  const [hours, minutes] = cleanTimeStr.split(':').map(Number);
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);

  if (timezone) {
    try {
      const tzString = date.toLocaleString('en-US', { timeZone: timezone });
      const localString = date.toLocaleString('en-US');
      const diffMs = Date.parse(localString) - Date.parse(tzString);
      if (!isNaN(diffMs)) {
        return new Date(date.getTime() + diffMs);
      }
    } catch (e) {
      console.warn('Timezone offset calculation failed for:', timezone, e);
    }
  }
  return date;
}

export function formatTo12Hour(timeStr: string): string {
  if (!timeStr) return '';
  const parts = timeStr.trim().split(/\s+/);
  const rawTime = parts[0];
  const suffix = parts.slice(1).join(' ');

  const timeParts = rawTime.split(':');
  if (timeParts.length < 2) return timeStr;

  let hours = parseInt(timeParts[0], 10);
  const minutes = timeParts[1];

  if (isNaN(hours)) return timeStr;

  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;

  const formattedTime = `${hours}:${minutes} ${ampm}`;
  return suffix ? `${formattedTime} ${suffix}` : formattedTime;
}

export function parsePrayerTimings(timings: Record<string, string>, timezone: string = ''): PrayerTime[] {
  return PRAYER_NAMES.map(name => {
    const rawTime = timings[name] || '00:00';
    return {
      name,
      time: formatTo12Hour(rawTime),
      date: parseTimeString(rawTime, timezone),
    };
  });
}

export function getNextPrayer(prayers: PrayerTime[], now: Date = new Date()): NextPrayerInfo {
  // Find the next upcoming prayer
  for (const prayer of prayers) {
    if (prayer.date > now) {
      const diffMs = prayer.date.getTime() - now.getTime();
      const remainingMinutes = Math.floor(diffMs / 60000);
      const remainingSeconds = Math.floor((diffMs % 60000) / 1000);
      return {
        name: prayer.name,
        time: prayer.time,
        remainingMinutes,
        remainingSeconds,
      };
    }
  }

  // All prayers passed today - next is Fajr tomorrow
  const fajr = prayers[0];
  const tomorrowFajr = new Date(fajr.date);
  tomorrowFajr.setDate(tomorrowFajr.getDate() + 1);
  const diffMs = tomorrowFajr.getTime() - now.getTime();
  const remainingMinutes = Math.floor(diffMs / 60000);
  const remainingSeconds = Math.floor((diffMs % 60000) / 1000);
  return {
    name: fajr.name,
    time: fajr.time,
    remainingMinutes,
    remainingSeconds,
  };
}

export function formatCountdown(minutes: number, seconds: number): string {
  if (minutes <= 0 && seconds <= 0) {
    return 'Active';
  }
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function formatCapsuleText(name: string, minutes: number): string {
  if (minutes <= 0) return `${name} Active`;
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${name}: ${hours}h${mins}m`;
  }
  return `${name}: ${minutes}m`;
}

export function getPrayerStatus(prayer: PrayerTime, nextPrayer: NextPrayerInfo, now: Date): 'passed' | 'active' | 'upcoming' | 'next' {
  if (prayer.name === nextPrayer.name) return 'next';
  if (prayer.date <= now) {
    // Check if this prayer became active within the last 15 minutes
    const diff = now.getTime() - prayer.date.getTime();
    if (diff <= 15 * 60000) return 'active';
    return 'passed';
  }
  return 'upcoming';
}
