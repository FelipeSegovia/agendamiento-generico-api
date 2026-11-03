import { slotStartTimes } from './slot-start-times.js';

// H1.4 — Definir mi horario semanal
describe('slotStartTimes', () => {
  it('ofrece 09:00, 10:00 y 11:00 en un rango de 09:00 a 12:00 con un servicio de 60 minutos', () => {
    expect(
      slotStartTimes([{ startTime: '09:00', endTime: '12:00' }], 60),
    ).toEqual(['09:00', '10:00', '11:00']);
  });

  it('no ofrece las 11:00 si el rango termina a las 11:30', () => {
    expect(
      slotStartTimes([{ startTime: '09:00', endTime: '11:30' }], 60),
    ).toEqual(['09:00', '10:00']);
  });

  it('ofrece los inicios de cada rango cuando el día tiene varios', () => {
    expect(
      slotStartTimes(
        [
          { startTime: '09:00', endTime: '11:00' },
          { startTime: '15:00', endTime: '17:00' },
        ],
        60,
      ),
    ).toEqual(['09:00', '10:00', '15:00', '16:00']);
  });

  it('no ofrece cupos en un día sin rangos', () => {
    expect(slotStartTimes([], 60)).toEqual([]);
  });

  it('cuenta los inicios desde el comienzo del rango con duraciones que no son horas', () => {
    expect(
      slotStartTimes([{ startTime: '09:15', endTime: '11:00' }], 45),
    ).toEqual(['09:15', '10:00']);
  });
});
