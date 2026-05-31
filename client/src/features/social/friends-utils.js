/**
 * @param {number} count
 * @returns {string}
 */
export function formatFriendsLabel(count) {
  const n = Number(count);
  if (!Number.isFinite(n) || n < 0) return '0 friends';
  if (n === 1) return '1 friend';
  return `${n} friends`;
}

/**
 * Whether the viewer may fetch and see this user's friends list (matches server rules).
 * @param {object} opts
 * @param {boolean} opts.isOwn
 * @param {boolean} opts.publicFriendsListOnProfile
 * @param {string | undefined} opts.relationshipStatus — from GET /relationship when !isOwn
 */
export function canViewUserFriendsList({ isOwn, publicFriendsListOnProfile, relationshipStatus }) {
  if (isOwn) return true;
  if (publicFriendsListOnProfile === false) return false;
  return relationshipStatus === 'friends';
}
