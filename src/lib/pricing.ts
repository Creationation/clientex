/**
 * Regles metier partagees entre le mode demo, les tests et le rendu.
 */

/**
 * Le client peut-il encore annuler lui-meme ? Vrai tant que le rendez-vous
 * est a plus de `deadlineHours` heures.
 */
export function canSelfCancel(
  bookingDate: string,
  startTime: string,
  deadlineHours: number,
  now: Date = new Date(),
): boolean {
  const start = new Date(`${bookingDate}T${startTime}:00`);
  return start.getTime() - now.getTime() >= deadlineHours * 3_600_000;
}
