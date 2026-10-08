/**
 * Moteur « vues gagnées » : attribue chaque vue (like, commentaire…) au moment où elle arrive,
 * comme viral.app, Whop ou Vyro, et non à la date de publication du post.
 *
 * Principe : à chaque rafraîchissement on photographie les compteurs de chaque post
 * (`PostSnapshot`). Entre deux photos, le gain (compteur N − compteur N-1) est réparti
 * linéairement dans le temps. La série journalière et les totaux de période découlent de
 * ces segments.
 *
 * Première photo d'un post :
 * - post publié APRÈS le rafraîchissement précédent du compte (donc vraiment nouveau) : ses
 *   vues sont créditées entre sa publication et la première photo ;
 * - post plus ancien (importé après coup par un « rafraîchir complet ») : la première photo
 *   sert de base, rien n'est crédité. Il commence à compter à partir de là.
 */

export type Metrics = { views: number; likes: number; comments: number; shares: number; saves: number };
export const ZERO: Metrics = { views: 0, likes: 0, comments: 0, shares: 0, saves: 0 };
const KEYS = Object.keys(ZERO) as (keyof Metrics)[];

export type SnapshotRow = Metrics & { postId: string; capturedAt: Date };
export type PostInfo = { id: string; accountId: string; publishedAt: Date };

/** Gain réparti uniformément entre `from` et `to`. */
export type Segment = { postId: string; accountId: string; from: number; to: number; gain: Metrics };

const DAY = 86_400_000;
/** Au tout premier rafraîchissement d'un compte, les posts publiés dans ce délai sont considérés nouveaux. */
const FIRST_SYNC_NEW_WINDOW = 2 * DAY;

function diff(a: Metrics, b: Metrics): Metrics {
  const out = { ...ZERO };
  for (const k of KEYS) out[k] = Math.max(0, a[k] - b[k]);
  return out;
}
function add(target: Metrics, m: Metrics, factor = 1) {
  for (const k of KEYS) target[k] += m[k] * factor;
}
function isZero(m: Metrics) {
  return KEYS.every((k) => m[k] === 0);
}

/**
 * Construit les segments de gain à partir des photos (triées ou non) et des dates de
 * rafraîchissement de chaque compte (`syncTimes`, triées croissantes).
 */
export function buildSegments(posts: PostInfo[], snapshots: SnapshotRow[], syncTimes: Map<string, number[]>): Segment[] {
  const byPost = new Map<string, SnapshotRow[]>();
  for (const s of snapshots) {
    const list = byPost.get(s.postId);
    if (list) list.push(s);
    else byPost.set(s.postId, [s]);
  }
  const segments: Segment[] = [];
  for (const post of posts) {
    const snaps = byPost.get(post.id);
    if (!snaps || snaps.length === 0) continue;
    snaps.sort((a, b) => a.capturedAt.getTime() - b.capturedAt.getTime());
    const first = snaps[0];
    const firstAt = first.capturedAt.getTime();
    const publishedAt = post.publishedAt.getTime();

    // Rafraîchissement du compte précédant la première photo de ce post.
    const times = syncTimes.get(post.accountId) ?? [];
    let previousSync: number | null = null;
    for (const t of times) {
      if (t < firstAt - 1000) previousSync = t;
      else break;
    }
    const isNew = previousSync == null ? firstAt - publishedAt <= FIRST_SYNC_NEW_WINDOW : publishedAt > previousSync;
    if (isNew && !isZero(first)) {
      const from = Math.min(publishedAt, firstAt - 60_000);
      segments.push({ postId: post.id, accountId: post.accountId, from, to: firstAt, gain: { ...first } });
    }
    for (let i = 1; i < snaps.length; i++) {
      const gain = diff(snaps[i], snaps[i - 1]);
      if (isZero(gain)) continue;
      segments.push({ postId: post.id, accountId: post.accountId, from: snaps[i - 1].capturedAt.getTime(), to: snaps[i].capturedAt.getTime(), gain });
    }
  }
  return segments;
}

/** Part d'un segment comprise dans [from, to]. */
export function portion(seg: Segment, from: number, to: number): Metrics {
  const span = seg.to - seg.from;
  const out = { ...ZERO };
  if (span <= 0) {
    if (seg.to >= from && seg.to <= to) add(out, seg.gain);
    return out;
  }
  const overlap = Math.min(seg.to, to) - Math.max(seg.from, from);
  if (overlap <= 0) return out;
  add(out, seg.gain, overlap / span);
  return out;
}

/** Total gagné sur [from, to], optionnellement groupé par post ou par compte. */
export function sumSegments(segments: Segment[], from: number, to: number): Metrics {
  const out = { ...ZERO };
  for (const s of segments) add(out, portion(s, from, to));
  return out;
}

export function sumBy(segments: Segment[], key: "postId" | "accountId", from: number, to: number): Map<string, Metrics> {
  const out = new Map<string, Metrics>();
  for (const s of segments) {
    const p = portion(s, from, to);
    if (isZero(p)) continue;
    const cur = out.get(s[key]) ?? { ...ZERO };
    add(cur, p);
    out.set(s[key], cur);
  }
  return out;
}

/** Série journalière sur [start, start + days). Chaque point = gains du jour. */
export function dailySeries(segments: Segment[], start: number, days: number): { date: string; views: number; likes: number }[] {
  const series = [];
  for (let i = 0; i < days; i++) {
    const from = start + i * DAY;
    const to = from + DAY;
    const m = sumSegments(segments, from, to);
    series.push({ date: new Date(to).toISOString().slice(0, 10), views: Math.round(m.views), likes: Math.round(m.likes) });
  }
  return series;
}

export function roundMetrics(m: Metrics): Metrics {
  const out = { ...ZERO };
  for (const k of KEYS) out[k] = Math.round(m[k]);
  return out;
}
