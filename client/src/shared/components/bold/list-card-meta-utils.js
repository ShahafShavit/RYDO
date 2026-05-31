export function difficultyAccent(difficulty) {
  const d = String(difficulty || '').toLowerCase();
  if (d === 'hard') return 'amber';
  if (d === 'casual' || d === 'easy') return 'green';
  return undefined;
}
