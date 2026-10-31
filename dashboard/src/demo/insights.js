/**
 * Generate insight cards from diet rows.
 *
 * Returns an array of { icon, headline, body } objects.
 * This is the single function to swap for LLM-generated text later.
 *
 * @param {import('./useDemoData').DietRow[]} rows
 * @returns {{ icon: string, headline: string, body: string }[]}
 */
export function generateInsights(rows) {
  if (!rows || rows.length === 0) return [];

  const totalSec = rows.reduce((s, r) => s + r.seconds, 0);
  if (totalSec === 0) return [];

  const insights = [];

  // ── 1. Tone dominance ──────────────────────────────────────────────
  const toneSec = {};
  rows.forEach((r) => {
    toneSec[r.tone] = (toneSec[r.tone] || 0) + r.seconds;
  });

  const dominantTone = Object.entries(toneSec).sort((a, b) => b[1] - a[1])[0];
  const dominantPct = Math.round((dominantTone[1] / totalSec) * 100);

  if (dominantPct >= 50) {
    insights.push({
      icon: dominantTone[0] === 'negative' ? '⚠️' : dominantTone[0] === 'positive' ? '🌟' : '📊',
      headline: `${dominantPct}% of your tracked time was ${dominantTone[0]}`,
      body:
        dominantTone[0] === 'negative'
          ? 'Most of what you consumed today carried a negative tone. Consider balancing with constructive or solution-oriented sources.'
          : dominantTone[0] === 'positive'
            ? 'Your feed leaned positive today — a relatively upbeat information diet.'
            : 'Your feed was mostly neutral today — factual but not emotionally charged.',
    });
  }

  // ── 2. Evening spike ───────────────────────────────────────────────
  const eveningSec = rows
    .filter((r) => {
      const hour = parseInt(r.timestamp.split(' ')[1].split(':')[0], 10);
      return hour >= 20;
    })
    .reduce((s, r) => s + r.seconds, 0);

  const eveningNegSec = rows
    .filter((r) => {
      const hour = parseInt(r.timestamp.split(' ')[1].split(':')[0], 10);
      return hour >= 20 && r.tone === 'negative';
    })
    .reduce((s, r) => s + r.seconds, 0);

  const eveningPct = Math.round((eveningSec / totalSec) * 100);

  if (eveningPct >= 20) {
    const allNeg = eveningSec > 0 && eveningNegSec === eveningSec;
    insights.push({
      icon: '🌙',
      headline: `${eveningPct}% of your day came after 8 pm${allNeg ? ', all of it negative' : ''}`,
      body: allNeg
        ? 'Late-night doomscrolling is real. Everything you consumed after 8 pm was negative — that can affect sleep and mood.'
        : `A significant chunk of your attention happened late at night. ${
            eveningNegSec > eveningSec / 2
              ? 'Most of it was negative content.'
              : 'The tone was mixed.'
          }`,
    });
  }

  // ── 3. Top categories concentration ────────────────────────────────
  const catSec = {};
  rows.forEach((r) => {
    catSec[r.category] = (catSec[r.category] || 0) + r.seconds;
  });

  const sorted = Object.entries(catSec).sort((a, b) => b[1] - a[1]);
  const top3 = sorted.slice(0, 3);
  const top3Sec = top3.reduce((s, [, v]) => s + v, 0);
  const top3Pct = Math.round((top3Sec / totalSec) * 100);

  if (top3Pct >= 60) {
    const names = top3.map(([name]) => name);
    const label =
      names.length === 3
        ? `${names[0]}, ${names[1]} and ${names[2]}`
        : names.join(' and ');
    insights.push({
      icon: '🎯',
      headline: `${top3Pct}% of your time went to ${label}`,
      body: 'Your attention was heavily concentrated in just a few topics. A more varied diet can surface new ideas and reduce echo-chamber effects.',
    });
  }

  return insights;
}
