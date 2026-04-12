/**
 * Split body into text + mention segments using mention labels (inserted after @ in composer).
 */
export function segmentMessageBody(body, mentions) {
  if (!body) return [];
  if (!mentions?.length) return [{ type: 'text', text: body }];

  const segments = [];
  let i = 0;
  while (i < body.length) {
    const at = body.indexOf('@', i);
    if (at === -1) {
      segments.push({ type: 'text', text: body.slice(i) });
      break;
    }
    if (at > i) segments.push({ type: 'text', text: body.slice(i, at) });
    const afterAt = body.slice(at + 1);
    let matched = null;
    for (const m of mentions) {
      const label = m.label || '';
      if (label && afterAt.startsWith(label)) {
        const next = afterAt[label.length];
        if (next === undefined || /\s/.test(next)) {
          matched = m;
          break;
        }
      }
    }
    if (matched) {
      segments.push({ type: 'mention', ...matched });
      i = at + 1 + (matched.label?.length || 0);
    } else {
      segments.push({ type: 'text', text: '@' });
      i = at + 1;
    }
  }
  return segments;
}
