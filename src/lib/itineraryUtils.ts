export const LONG_TERM_TRIP_THRESHOLD = 4;

export function calculateTripDuration(startDate: Date | string, endDate: Date | string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);

  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);

  const diffTime = Math.abs(end.getTime() - start.getTime());
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

export function isLongTermTrip(durationDays: number): boolean {
  return durationDays > LONG_TERM_TRIP_THRESHOLD;
}

export function getInitialGenerationDays(durationDays: number): number {
  return durationDays > 0 ? 1 : 0;
}
