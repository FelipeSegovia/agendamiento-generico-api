type TimeRange = { startTime: string; endTime: string };

const toMinutes = (time: string) => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

const toTime = (totalMinutes: number) =>
  `${String(Math.floor(totalMinutes / 60)).padStart(2, '0')}:${String(totalMinutes % 60).padStart(2, '0')}`;

// Inicios «HH:mm» de un servicio en los rangos de un día: cada «duración» minutos
// desde el comienzo de cada rango, y el cupo tiene que caber entero dentro del rango.
export function slotStartTimes(
  ranges: TimeRange[],
  durationMinutes: number,
): string[] {
  return ranges.flatMap(({ startTime, endTime }) => {
    const starts: string[] = [];
    for (
      let start = toMinutes(startTime);
      start + durationMinutes <= toMinutes(endTime);
      start += durationMinutes
    ) {
      starts.push(toTime(start));
    }
    return starts;
  });
}
