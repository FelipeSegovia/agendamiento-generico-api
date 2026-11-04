import { subHours } from 'date-fns';

// Si el plazo para confirmar ya venció al reservar, la cita nace confirmada; si no, pendiente.
export const initialAppointmentStatus = (
  startsAt: Date,
  confirmationDeadlineHours: number,
  now: Date,
): 'pending' | 'confirmed' =>
  now >= subHours(startsAt, confirmationDeadlineHours)
    ? 'confirmed'
    : 'pending';
