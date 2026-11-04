import { initialAppointmentStatus } from './initial-appointment-status.js';

// H2.1 — Configurar el plazo de confirmación
describe('initialAppointmentStatus', () => {
  // Hoy es lunes 2 de noviembre de 2026 a las 10:00 en Santiago (UTC-3).
  const now = new Date('2026-11-02T10:00:00-03:00');
  const thursdayAt10 = new Date('2026-11-05T10:00:00-03:00');
  const wednesdayAt9 = new Date('2026-11-04T09:00:00-03:00');

  it('con plazo de 24 horas, una cita del jueves nace pendiente', () => {
    expect(initialAppointmentStatus(thursdayAt10, 24, now)).toBe('pending');
  });

  it('una cita del mismo día nace confirmada, porque el plazo ya venció', () => {
    const mondayAt15 = new Date('2026-11-02T15:00:00-03:00');
    expect(initialAppointmentStatus(mondayAt15, 24, now)).toBe('confirmed');
  });

  it('una cita a 47 horas nace pendiente con 24 horas de plazo y confirmada con 48', () => {
    expect(initialAppointmentStatus(wednesdayAt9, 24, now)).toBe('pending');
    expect(initialAppointmentStatus(wednesdayAt9, 48, now)).toBe('confirmed');
  });

  it('justo al vencer el plazo, la cita nace confirmada', () => {
    const tuesdayAt10 = new Date('2026-11-03T10:00:00-03:00');
    expect(initialAppointmentStatus(tuesdayAt10, 24, now)).toBe('confirmed');
  });
});
