import { TZDate } from '@date-fns/tz';
import {
  addDays,
  addHours,
  addMinutes,
  addWeeks,
  format,
  getDay,
} from 'date-fns';
import { slotStartTimes } from './slot-start-times.js';

type WeekdayRange = { weekday: number; startTime: string; endTime: string };
type BusyInterval = { startsAt: Date; endsAt: Date };

export type SlotsWeek = {
  from: string;
  previousFrom: string | null;
  nextFrom: string | null;
  days: { date: string; slots: { startsAt: string; time: string }[] }[];
};

const DAYS_PER_PAGE = 7;
// shortcut: valores iniciales fijos; pasan a ser datos del profesional en H3.3 y H3.4.
const MINIMUM_NOTICE_HOURS = 0;
const HORIZON_WEEKS = 8;

// Medianoche de una fecha «yyyy-MM-dd» en la zona del profesional.
const startOfDayIn = (date: string, timezone: string) => {
  const [year, month, day] = date.split('-').map(Number);
  return new TZDate(year, month - 1, day, timezone);
};

const toDateString = (date: Date) => format(date, 'yyyy-MM-dd');

// Cupos de un servicio en los 7 días desde `from`, en la zona del profesional. Solo se
// ofrecen inicios entre la antelación mínima y el horizonte que no se solapan con un
// intervalo ocupado (citas activas); `from` nunca es antes de hoy.
export function slotsWeek({
  ranges,
  busyIntervals,
  durationMinutes,
  timezone,
  now,
  from,
}: {
  ranges: WeekdayRange[];
  busyIntervals: BusyInterval[];
  durationMinutes: number;
  timezone: string;
  now: Date;
  from?: string;
}): SlotsWeek {
  const earliestStart = addHours(now, MINIMUM_NOTICE_HOURS);
  const latestStart = addWeeks(now, HORIZON_WEEKS);
  const today = toDateString(new TZDate(now, timezone));
  const lastBookableDate = toDateString(new TZDate(latestStart, timezone));
  // Las fechas «yyyy-MM-dd» se comparan bien como texto.
  const firstDate = from && from > today ? from : today;
  const firstDay = startOfDayIn(firstDate, timezone);

  const days = Array.from({ length: DAYS_PER_PAGE }, (_, index) =>
    addDays(firstDay, index),
  )
    .map((day) => {
      const dayRanges = ranges.filter((range) => range.weekday === getDay(day));
      const slots = slotStartTimes(dayRanges, durationMinutes)
        .map((time) => {
          const [hours, minutes] = time.split(':').map(Number);
          const startsAt = new TZDate(
            day.getFullYear(),
            day.getMonth(),
            day.getDate(),
            hours,
            minutes,
            timezone,
          );
          return { startsAt, time };
        })
        .filter(({ startsAt }) => {
          const endsAt = addMinutes(startsAt, durationMinutes);
          return (
            startsAt >= earliestStart &&
            startsAt <= latestStart &&
            // Intervalos semiabiertos: una cita que termina a las 10:00 no choca con un cupo de las 10:00.
            !busyIntervals.some(
              (busy) => startsAt < busy.endsAt && endsAt > busy.startsAt,
            )
          );
        })
        .map(({ startsAt, time }) => ({
          startsAt: new Date(startsAt.getTime()).toISOString(),
          time,
        }));
      return { date: toDateString(day), slots };
    })
    .filter((day) => day.slots.length > 0);

  const nextFrom = toDateString(addDays(firstDay, DAYS_PER_PAGE));
  const weekBefore = toDateString(addDays(firstDay, -DAYS_PER_PAGE));
  // La semana anterior nunca empieza antes de hoy.
  // biome-ignore lint/complexity/useMathMinMax: son fechas en texto, Math.max no las compara.
  const previousFrom = weekBefore > today ? weekBefore : today;
  return {
    from: firstDate,
    previousFrom: firstDate === today ? null : previousFrom,
    nextFrom: nextFrom <= lastBookableDate ? nextFrom : null,
    days,
  };
}
