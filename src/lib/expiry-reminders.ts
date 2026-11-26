export type ReminderMilestone = 7 | 1 | 0;

const DAY_MS = 86_400_000;

export function startOfUtcDay(date: Date): Date {
  const result = new Date(date);
  result.setUTCHours(0, 0, 0, 0);
  return result;
}

export function daysUntilExpiry(expiryDate: string, now = new Date()): number {
  const expiry = new Date(`${expiryDate}T00:00:00Z`);
  return Math.round(
    (expiry.getTime() - startOfUtcDay(now).getTime()) / DAY_MS,
  );
}

export function milestoneForCron(
  daysRemaining: number,
): ReminderMilestone | null {
  if (daysRemaining <= 0) return 0;
  if (daysRemaining === 1) return 1;
  if (daysRemaining <= 7) return 7;
  return null;
}

export function milestoneForImmediateUpload(
  daysRemaining: number,
): ReminderMilestone | null {
  return daysRemaining === 7 || daysRemaining === 1 || daysRemaining === 0
    ? daysRemaining
    : null;
}
