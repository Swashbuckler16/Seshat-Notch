import { getLocalDateString } from './dateUtils.ts';

// Resolve the current app day at the moment of the write, never from a
// selected date or a dialog's cached render time.
export function assertTodayCompletion(date: string): void {
  if (date !== getLocalDateString()) {
    throw new Error('You can only update today’s completion. Past and future days are locked.');
  }
}
