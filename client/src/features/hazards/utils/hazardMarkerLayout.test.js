import { describe, expect, it } from 'vitest';
import {
  buildHazardMarkerLayout,
  clusterHazardsByProximity,
  spiderfyOffsetsForCluster,
} from '@/features/hazards/utils/hazardMarkerLayout';
import { haversineDistanceM } from '@/shared/lib/geoDistance';

function hazard(id, lat, lng) {
  return { id, location: { lat, lng } };
}

/** Approximate north offset in degrees for a given distance in meters at a latitude. */
function offsetNorthM(lat, lng, meters) {
  return hazard(0, lat + meters / 111_320, lng);
}

describe('clusterHazardsByProximity', () => {
  const baseLat = 32.08;
  const baseLng = 34.78;

  it('keeps a singleton as its own cluster', () => {
    const hazards = [hazard(1, baseLat, baseLng)];
    const clusters = clusterHazardsByProximity(hazards, 8);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(1);
  });

  it('groups hazards within 8m', () => {
    const a = hazard(1, baseLat, baseLng);
    const b = offsetNorthM(baseLat, baseLng, 5);
    b.id = 2;
    const clusters = clusterHazardsByProximity([a, b], 8);
    expect(clusters).toHaveLength(1);
    expect(clusters[0]).toHaveLength(2);
  });

  it('keeps hazards more than 8m apart in separate clusters', () => {
    const a = hazard(1, baseLat, baseLng);
    const b = offsetNorthM(baseLat, baseLng, 15);
    b.id = 2;
    const clusters = clusterHazardsByProximity([a, b], 8);
    expect(clusters).toHaveLength(2);
  });
});

describe('spiderfyOffsetsForCluster', () => {
  it('returns zero offset for a single marker', () => {
    expect(spiderfyOffsetsForCluster(1)).toEqual([{ x: 0, y: 0 }]);
  });

  it('places two markers on opposite sides', () => {
    const [a, b] = spiderfyOffsetsForCluster(2, { radiusPx: 28 });
    expect(a.y).toBeLessThan(0);
    expect(b.y).toBeGreaterThan(0);
    expect(a.x).toBe(0);
    expect(b.x).toBe(0);
  });

  it('uses a wider radius for four or more markers', () => {
    const three = spiderfyOffsetsForCluster(3, { radiusPx: 28 });
    const four = spiderfyOffsetsForCluster(4, { radiusPx: 28 });
    const threeDist = Math.hypot(three[0].x, three[0].y);
    const fourDist = Math.hypot(four[0].x, four[0].y);
    expect(fourDist).toBeGreaterThan(threeDist);
  });
});

describe('buildHazardMarkerLayout', () => {
  const baseLat = 32.08;
  const baseLng = 34.78;

  it('anchors a singleton at its own coordinates with no offset', () => {
    const hazards = [hazard(1, baseLat, baseLng)];
    const layout = buildHazardMarkerLayout(hazards);
    const entry = layout.get(1);
    expect(entry.anchorLat).toBe(baseLat);
    expect(entry.anchorLng).toBe(baseLng);
    expect(entry.offsetPx).toEqual({ x: 0, y: 0 });
    expect(entry.clusterSize).toBe(1);
  });

  it('spiderfies two nearby hazards around a shared centroid', () => {
    const a = hazard(1, baseLat, baseLng);
    const b = offsetNorthM(baseLat, baseLng, 5);
    b.id = 2;
    const layout = buildHazardMarkerLayout([a, b], { zoom: 16 });

    const entryA = layout.get(1);
    const entryB = layout.get(2);
    expect(entryA.clusterSize).toBe(2);
    expect(entryB.clusterSize).toBe(2);
    expect(entryA.anchorLat).toBeCloseTo(entryB.anchorLat, 5);
    expect(entryA.anchorLng).toBeCloseTo(entryB.anchorLng, 5);
    expect(entryA.offsetPx).not.toEqual(entryB.offsetPx);

    const distFromAnchorA = haversineDistanceM(
      entryA.anchorLat,
      entryA.anchorLng,
      a.location.lat,
      a.location.lng,
    );
    const distFromAnchorB = haversineDistanceM(
      entryB.anchorLat,
      entryB.anchorLng,
      b.location.lat,
      b.location.lng,
    );
    expect(distFromAnchorA).toBeLessThan(3);
    expect(distFromAnchorB).toBeLessThan(3);
  });

  it('does not spiderfy hazards farther than 8m apart', () => {
    const a = hazard(1, baseLat, baseLng);
    const b = offsetNorthM(baseLat, baseLng, 15);
    b.id = 2;
    const layout = buildHazardMarkerLayout([a, b]);
    expect(layout.get(1).offsetPx).toEqual({ x: 0, y: 0 });
    expect(layout.get(2).offsetPx).toEqual({ x: 0, y: 0 });
    expect(layout.get(1).clusterSize).toBe(1);
    expect(layout.get(2).clusterSize).toBe(1);
  });

  it('collapses clustered hazards when zoom is below the spiderfy threshold', () => {
    const a = hazard(1, baseLat, baseLng);
    const b = offsetNorthM(baseLat, baseLng, 5);
    b.id = 2;
    const layout = buildHazardMarkerLayout([a, b], { zoom: 14 });

    expect(layout.get(1).offsetPx).toEqual({ x: 0, y: 0 });
    expect(layout.get(2).offsetPx).toEqual({ x: 0, y: 0 });
    expect(layout.get(1).collapsed).toBe(true);
    expect(layout.get(2).collapsed).toBe(true);
    expect(layout.get(1).clusterSize).toBe(2);
    expect(layout.get(2).hidden).toBe(true);
  });

  it('spiderfies tap-expanded clusters regardless of zoom', () => {
    const a = hazard(1, baseLat, baseLng);
    const b = offsetNorthM(baseLat, baseLng, 5);
    b.id = 2;
    const clusterKey = '1-2';
    const layout = buildHazardMarkerLayout([a, b], {
      zoom: 10,
      expandedClusterKeys: new Set([clusterKey]),
    });

    expect(layout.get(1).offsetPx).not.toEqual({ x: 0, y: 0 });
    expect(layout.get(2).offsetPx).not.toEqual(layout.get(1).offsetPx);
    expect(layout.get(1).collapsed).toBe(false);
    expect(layout.get(2).hidden).toBe(false);
    expect(layout.get(1).clusterKey).toBe(clusterKey);
  });

  it('hides non-representative markers when tap-collapsed', () => {
    const a = hazard(1, baseLat, baseLng);
    const b = offsetNorthM(baseLat, baseLng, 5);
    b.id = 2;
    const layout = buildHazardMarkerLayout([a, b], { expandedClusterKeys: new Set() });

    expect(layout.get(1).clusterRepresentative).toBe(true);
    expect(layout.get(1).hidden).toBe(false);
    expect(layout.get(2).hidden).toBe(true);
  });
});
