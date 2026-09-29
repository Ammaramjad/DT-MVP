export const BOOKING_STEPS = ['Service','Pickup','Destination','Date & time','Passengers & luggage','Vehicle class','Vehicle model','Options','Review'] as const
export type BookingStep = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8

export function canVisitStep(target: number, current: number) {
  return target >= 0 && target <= current
}
