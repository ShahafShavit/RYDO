import { hazardTypeIcon } from '@/features/hazards/hazard-constants';

const SPIDERFY_HIT_BOX = 80;
const SPIDERFY_HIT_ANCHOR = SPIDERFY_HIT_BOX / 2;

export function hazardLeafletIconDimensions() {
  return {
    iconSize: [SPIDERFY_HIT_BOX, SPIDERFY_HIT_BOX],
    iconAnchor: [SPIDERFY_HIT_ANCHOR, SPIDERFY_HIT_ANCHOR],
  };
}

/**
 * @param {{ type?: string, score?: number }} hazard
 * @param {{
 *   selected?: boolean,
 *   offsetPx?: { x: number, y: number },
 *   entering?: boolean,
 *   exiting?: boolean,
 *   pulsing?: boolean,
 *   scorePop?: boolean,
 *   clusterSize?: number,
 *   collapsed?: boolean,
 * }} [options]
 */
export function buildHazardMarkerHtml(
  hazard,
  {
    selected = false,
    offsetPx = { x: 0, y: 0 },
    entering = false,
    exiting = false,
    pulsing = false,
    scorePop = false,
    clusterSize = 1,
    collapsed = false,
  } = {},
) {
  const icon = hazardTypeIcon(hazard.type);
  const score = hazard.score ?? 0;
  const stacked = collapsed && clusterSize > 1;
  const markerClasses = [
    'rydo-hazard-marker',
    selected ? 'rydo-hazard-marker--selected' : '',
    stacked ? 'rydo-hazard-marker--cluster' : '',
    entering ? 'rydo-hazard-marker--enter' : '',
    exiting ? 'rydo-hazard-marker--exit' : '',
    pulsing ? 'rydo-hazard-marker--pulse' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const scoreClasses = [
    'rydo-hazard-marker-score',
    scorePop ? 'rydo-hazard-marker-score--pop' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const scale = selected ? 1.1 : 1;
  const ariaLabel = stacked
    ? `${clusterSize} hazards stacked — tap to expand`
    : `Hazard: ${hazard.type}, score ${score}`;
  const iconMarkup = stacked
    ? `<span class="rydo-hazard-marker-cluster-count">${clusterSize}</span>`
    : icon;
  const scoreMarkup = stacked
    ? `<span class="rydo-hazard-marker-score rydo-hazard-marker-score--cluster">Tap to expand</span>`
    : `<span class="${scoreClasses}" style="
          margin-top:2px;
          display:inline-flex;
          align-items:center;
          gap:2px;
          border-radius:9999px;
          background:rgba(0,0,0,0.75);
          padding:2px 6px;
          font-size:10px;
          font-weight:600;
          color:#fef3c7;
        ">👍 ${score}</span>`;

  return `
    <div class="rydo-hazard-marker-hitbox" data-hazard-id="${hazard.id ?? ''}" style="position:relative;width:${SPIDERFY_HIT_BOX}px;height:${SPIDERFY_HIT_BOX}px;display:flex;align-items:center;justify-content:center;">
      <div
        class="${markerClasses}"
        style="
          position:absolute;
          left:50%;
          top:50%;
          transform:translate(calc(-50% + ${offsetPx.x}px), calc(-50% + ${offsetPx.y}px)) scale(${scale});
          z-index:${selected ? 30 : 10};
          display:flex;
          flex-direction:column;
          align-items:center;
          pointer-events:auto;
          cursor:pointer;
        "
        role="img"
        aria-label="${ariaLabel}"
      >
        <span class="rydo-hazard-marker-icon" style="
          display:flex;
          width:36px;
          height:36px;
          align-items:center;
          justify-content:center;
          border-radius:50%;
          border:2px solid ${selected ? '#fcd34d' : 'rgba(245, 158, 11, 0.6)'};
          background:${selected ? 'rgba(245, 158, 11, 0.9)' : 'rgba(245, 158, 11, 0.75)'};
          font-size:${stacked ? '14px' : '16px'};
          font-weight:${stacked ? '700' : '400'};
          box-shadow:0 4px 6px rgba(0,0,0,0.3);
        ">${iconMarkup}</span>
        ${scoreMarkup}
      </div>
    </div>
  `;
}
