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

export interface PickupSlot {
  value: string;
  label: string;
}

function formatMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

function minutesInPune(now: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const hour = Number(parts.find((part) => part.type === 'hour')?.value || 0);
  const minute = Number(parts.find((part) => part.type === 'minute')?.value || 0);
  return hour * 60 + minute;
}

export function getPickupSlots(now = new Date()): PickupSlot[] {
  const openMinutes = 9 * 60;
  const lastStartMinutes = 17 * 60 + 45;
  const earliestStart = Math.ceil((minutesInPune(now) + 15) / 15) * 15;
  const firstStart = Math.max(openMinutes, earliestStart);
  const slots: PickupSlot[] = [];

  for (let start = firstStart; start <= lastStartMinutes; start += 15) {
    const end = start + 15;
    slots.push({
      value: formatMinutes(start),
      label: `${formatTime12h(formatMinutes(start))} – ${formatTime12h(formatMinutes(end))}`,
    });
  }
  return slots;
}

export function isValidPickupSlot(timeStr: string): boolean {
  const match = timeStr.match(/^(09|1[0-7]):(00|15|30|45)$/);
  return Boolean(match);
}

export function formatPickupSlot(timeStr: string): string {
  if (!isValidPickupSlot(timeStr)) return timeStr;
  const [hourPart, minutePart] = timeStr.split(':').map(Number);
  const start = hourPart * 60 + minutePart;
  return `${formatTime12h(timeStr)} – ${formatTime12h(formatMinutes(start + 15))}`;
}
