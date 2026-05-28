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
  isActive: boolean; // true if this prayer time has just passed (within 15 min window)
}

export const PRAYER_NAMES = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'] as const;
export type PrayerName = typeof PRAYER_NAMES[number];

// Calculation method options for AlAdhan API
export const CALCULATION_METHODS: { id: number; name: string; }[] = [
  { id: 1, name: 'University of Islamic Sciences, Karachi' },
  { id: 2, name: 'Islamic Society of North America (ISNA)' },
  { id: 3, name: 'Muslim World League' },
  { id: 4, name: 'Umm Al-Qura University, Makkah' },
  { id: 5, name: 'Egyptian General Authority of Survey' },
  { id: 7, name: 'Institute of Geophysics, University of Tehran' },
  { id: 8, name: 'Gulf Region' },
  { id: 9, name: 'Kuwait' },
  { id: 10, name: 'Qatar' },
  { id: 11, name: 'Majlis Ugama Islam Singapura' },
  { id: 12, name: 'UOIF (France)' },
  { id: 13, name: 'Diyanet İşleri Başkanlığı (Turkey)' },
  { id: 14, name: 'Spiritual Administration of Muslims of Russia' },
  { id: 15, name: 'Moonsighting Committee Worldwide' },
];

export function parseTimeString(timeStr: string): Date {
  const cleanTimeStr = timeStr.split(' ')[0];
  const [hours, minutes] = cleanTimeStr.split(':').map(Number);
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes, 0);
  return date;
}

export function parsePrayerTimings(timings: Record<string, string>): PrayerTime[] {
  return PRAYER_NAMES.map(name => ({
    name,
    time: timings[name] || '00:00',
    date: parseTimeString(timings[name] || '00:00'),
  }));
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
        isActive: false,
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
    isActive: false,
  };
}

export function formatCountdown(minutes: number, seconds: number): string {
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
