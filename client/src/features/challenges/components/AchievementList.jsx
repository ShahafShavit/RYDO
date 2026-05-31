export default function AchievementList({ achievements = [] }) {
  const list = Array.isArray(achievements) ? achievements : [];
  if (list.length === 0) {
    return <p className="rydo-subtle mt-2 text-sm">Complete quests and milestones to earn badges.</p>;
  }
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {list.map((a) => (
        <li
          key={a.id}
          className="rounded-full border border-border bg-surface-strong px-3 py-1.5 text-xs font-semibold text-fg"
        >
          {a.title}
        </li>
      ))}
    </ul>
  );
}
