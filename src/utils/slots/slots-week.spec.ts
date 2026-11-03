import { slotsWeek } from './slots-week.js';

// H1.5 — Ver los cupos libres de un profesional
describe('slotsWeek', () => {
  const timezone = 'America/Santiago';
  // Lunes 2 de noviembre de 2026; Santiago está en UTC-3 (horario de verano).
  const mondayAt = (time: string) => new Date(`2026-11-02T${time}:00-03:00`);
  const mondayMorning = [{ weekday: 1, startTime: '09:00', endTime: '12:00' }];

  it('no muestra los cupos de hoy que ya empezaron', () => {
    const week = slotsWeek({
      ranges: mondayMorning,
      durationMinutes: 60,
      timezone,
      now: mondayAt('10:30'),
    });

    expect(week.days[0]).toEqual({
      date: '2026-11-02',
      slots: [{ startsAt: '2026-11-02T14:00:00.000Z', time: '11:00' }],
    });
  });

  it('calcula las horas en la zona del profesional y agrupa los cupos por día', () => {
    const week = slotsWeek({
      ranges: [
        ...mondayMorning,
        { weekday: 3, startTime: '15:00', endTime: '17:00' },
      ],
      durationMinutes: 60,
      timezone,
      now: mondayAt('08:00'),
    });

    expect(week.days).toEqual([
      {
        date: '2026-11-02',
        slots: [
          { startsAt: '2026-11-02T12:00:00.000Z', time: '09:00' },
          { startsAt: '2026-11-02T13:00:00.000Z', time: '10:00' },
          { startsAt: '2026-11-02T14:00:00.000Z', time: '11:00' },
        ],
      },
      {
        date: '2026-11-04',
        slots: [
          { startsAt: '2026-11-04T18:00:00.000Z', time: '15:00' },
          { startsAt: '2026-11-04T19:00:00.000Z', time: '16:00' },
        ],
      },
    ]);
  });

  it('usa la fecha de la zona del profesional aunque en UTC ya sea otro día', () => {
    // Domingo 1 a las 22:00 en Santiago, lunes 2 a la 01:00 en UTC.
    const week = slotsWeek({
      ranges: mondayMorning,
      durationMinutes: 60,
      timezone,
      now: new Date('2026-11-02T01:00:00Z'),
    });

    expect(week.from).toBe('2026-11-01');
    expect(week.days.map(({ date }) => date)).toEqual(['2026-11-02']);
  });

  it('parte hoy y sin semana anterior cuando no se pide fecha o se pide una pasada', () => {
    for (const from of [undefined, '2026-10-01']) {
      const week = slotsWeek({
        ranges: mondayMorning,
        durationMinutes: 60,
        timezone,
        now: mondayAt('08:00'),
        from,
      });
      expect(week.from).toBe('2026-11-02');
      expect(week.previousFrom).toBeNull();
      expect(week.nextFrom).toBe('2026-11-09');
    }
  });

  it('la semana anterior nunca empieza antes de hoy', () => {
    const week = slotsWeek({
      ranges: mondayMorning,
      durationMinutes: 60,
      timezone,
      now: mondayAt('08:00'),
      from: '2026-11-05',
    });

    expect(week.previousFrom).toBe('2026-11-02');
  });

  it('no ofrece cupos más allá del horizonte de 8 semanas ni semana siguiente', () => {
    const week = slotsWeek({
      ranges: mondayMorning,
      durationMinutes: 60,
      timezone,
      now: mondayAt('10:00'),
      from: '2026-12-28',
    });

    // El horizonte termina el lunes 28 de diciembre a las 10:00: las 11:00 quedan fuera.
    expect(week.days).toEqual([
      {
        date: '2026-12-28',
        slots: [
          { startsAt: '2026-12-28T12:00:00.000Z', time: '09:00' },
          { startsAt: '2026-12-28T13:00:00.000Z', time: '10:00' },
        ],
      },
    ]);
    expect(week.nextFrom).toBeNull();
  });
});
