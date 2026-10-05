/** Types et constantes partagés client / serveur (aucune dépendance Node ici). */
export type Period = 7 | 30 | 90;
export const PERIODS: Period[] = [7, 30, 90];

export type SeriesPoint = { date: string; views: number; likes: number; followers: number };
