/** @typedef {{ title?: string, text?: string, url: string }} SharePayload */

/** @typedef {{ ok: boolean, cancelled?: boolean }} ShareResult */

/**
 * @typedef {Object} ShareProvider
 * @property {(payload: SharePayload) => Promise<ShareResult>} share
 * @property {() => boolean} [isAvailable]
 */

/** @type {ShareProvider | null} */
let provider = null;

/**
 * Inject share implementation (Capacitor on native, Web Share API on web).
 * @param {ShareProvider} next
 */
export function setShareProvider(next) {
  provider = next;
}

/**
 * @param {SharePayload} payload
 * @returns {Promise<ShareResult>}
 */
function webShare(payload) {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') {
    return Promise.resolve({ ok: false });
  }
  const shareData = {
    title: payload.title,
    text: payload.text,
    url: payload.url,
  };
  if (typeof navigator.canShare === 'function' && !navigator.canShare(shareData)) {
    return Promise.resolve({ ok: false });
  }
  return navigator
    .share(shareData)
    .then(() => ({ ok: true }))
    .catch((err) => {
      if (err?.name === 'AbortError') return { ok: false, cancelled: true };
      return { ok: false };
    });
}

/** @returns {ShareProvider} */
function getBrowserShareProvider() {
  return {
    isAvailable: () =>
      typeof navigator !== 'undefined' &&
      typeof navigator.share === 'function' &&
      (typeof navigator.canShare !== 'function' ||
        navigator.canShare({ url: 'https://example.com' })),
    share: webShare,
  };
}

/**
 * @returns {ShareProvider}
 */
export function getShareProvider() {
  return provider ?? getBrowserShareProvider();
}

/**
 * Copy text to clipboard with graceful fallback.
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  if (!text) return false;
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through */
  }
  try {
    if (typeof document === 'undefined') return false;
    const el = document.createElement('textarea');
    el.value = text;
    el.setAttribute('readonly', '');
    el.style.position = 'fixed';
    el.style.opacity = '0';
    document.body.appendChild(el);
    el.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(el);
    return ok;
  } catch {
    return false;
  }
}

/**
 * @param {SharePayload} payload
 * @returns {Promise<ShareResult>}
 */
export function platformShare(payload) {
  return getShareProvider().share(payload);
}
