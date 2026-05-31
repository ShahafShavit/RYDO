import { RIDES_PER_LEVEL } from '@/shared/constants/gamification';

export const HELP_TOOLTIPS = {
  physicsIntensity:
    'Mechanical intensity from the GPX track shape — climbing and rolling resistance combined. Scored 1–10 against a fixed set of seed routes. Not the same as the Difficulty tag.',

  routeDifficulty:
    'Subjective rating set by the uploader (casual, moderate, or hard). Use it for how demanding the ride feels overall.',

  routeTerrain:
    'Surface type tag: road, gravel, trail, or mixed. Helps you pick routes that match your bike and style.',

  estimatedTimeBase:
    'How long the route might take. The source varies — see the note below when shown.',

  elevationGain:
    'Total climbing along the track. Computed from smoothed elevation samples with GPS noise filtered out.',

  routeWarnings:
    'Notes written by the route uploader (e.g. gravel, exposure, traffic). These are not live community hazard reports.',

  nearMe:
    'Shows routes with a known start point, sorted by straight-line distance from you. Optionally limit how far away they can be.',

  fromYou:
    'Straight-line distance from your current location to where the route starts.',

  level: `Your RYDO level increases every ${RIDES_PER_LEVEL} completed rides. Progress resets within each level bracket.`,

  streak:
    'Consecutive weeks with at least one completed ride. Missing a week resets the current streak; your best streak is saved.',

  weeklySnapshot:
    'Totals for the current calendar week (Monday–Sunday) from completed rides only.',

  challenge:
    'Progress toward the active community challenge. Percentage is your contribution vs the challenge target.',

  leaderboardHorizonChasers:
    'All-time total distance from your completed rides on RYDO.',

  leaderboardSaddleJunkies: 'Total count of rides you have completed and logged on RYDO.',

  leaderboardSummitSeekers:
    'All-time elevation gain from your completed rides (from ride history, falling back to route data when needed).',

  leaderboardTrailblazers: 'Number of published routes you have uploaded to RYDO.',

  leaderboardStanding:
    'Leaderboards rank all members by completed ride history (or published routes for Trailblazers). Ride more to appear and climb.',

  leaderboardBadge:
    'You finished in the top 3 on this board. Tap the badge to view full standings.',

  clubVisibility:
    'Public clubs can be discovered and joined by anyone. Private clubs require approval or an invite code.',

  clubRidePolicy:
    'Controls who may schedule rides for this club. Organizers are designated from the member roster when using “Organizers and admins”.',

  rideType:
    'Personal rides are yours to plan and invite friends. Club rides are posted to a club and visible to its members.',

  privacyRouteRiders:
    'When off, you still count toward totals, but your name is hidden from the rider list on route pages.',

  privacyUploadedRoutes:
    'When off, other members cannot list routes you uploaded from your profile or explore filters.',

  privacyParticipatedRides:
    'When off, others won\'t see scheduled rides you participate in on your profile (club and ride visibility rules still apply when shown).',

  privacyLifetimeStats:
    'When off, others won\'t see your Distance, Climbed, or completed Rides totals on your profile. Leaderboards are unchanged.',

  privacyFriendsList:
    'When off, other members won\'t see your friends on your profile. You can still see your own list.',

  privacyOthersFriendsLists:
    'When off, your name won\'t appear when someone else views a mutual friend\'s friends list.',
};

/** @param {keyof typeof HELP_TOOLTIPS} key */
export function helpTooltip(key) {
  return HELP_TOOLTIPS[key] ?? '';
}
