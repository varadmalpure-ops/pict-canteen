/**
 * Formats a 24-hour time string (e.g. "14:30" or "09:15") or returns 12-hour string (e.g. "2:30 PM", "9:15 AM")
 */
export function formatTime12h(timeStr: string): string {
  if (!timeStr) return '';
  if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
  const parts = timeStr.split(':');
  if (parts.length < 2) return timeStr;
  let hours = parseInt(parts[0], 10);
  const minutes = parts[1].padStart(2, '0');
  if (isNaN(hours)) return timeStr;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${hours}:${minutes} ${ampm}`;
}

/**
 * Validates whether a given time is within canteen operating hours: 9:00 AM to 6:00 PM (09:00 - 18:00)
 */
export function isWithinOperatingHours(timeStr: string): boolean {
  if (!timeStr) return false;
  const match = timeStr.trim().match(/^(\d{1,2}):(\d{2})(?:\s*([AaPp][Mm]))?$/);
  if (!match) return false;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const meridiem = match[3]?.toUpperCase();
  if (minutes < 0 || minutes > 59) return false;
  if (meridiem === 'PM' && hours < 12) hours += 12;
  if (meridiem === 'AM' && hours === 12) hours = 0;
  if (hours < 0 || hours > 23) return false;
  const totalMins = hours * 60 + minutes;
  // 9:00 AM (540 mins) to 6:00 PM (1080 mins)
  return totalMins >= 540 && totalMins <= 1080;
}
