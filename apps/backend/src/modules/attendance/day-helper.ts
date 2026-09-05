import { DayOfWeek } from '@prisma/client';

export function getDayOfWeekFromDate(date: Date): DayOfWeek {
  const days: DayOfWeek[] = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
  return days[date.getDay()];
}
