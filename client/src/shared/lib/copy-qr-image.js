const DEFAULT_PADDING = 16;
const DEFAULT_BACKGROUND = '#ffffff';

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load QR image.'));
    img.src = src;
  });
}

function svgToDataUrl(svg) {
  const serialized = new XMLSerializer().serializeToString(svg);
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(serialized)}`;
}

function canvasToBlob(canvas, type = 'image/png') {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Could not export QR image.'));
    }, type);
  });
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

async function renderQrPngBlob(svg, { padding = DEFAULT_PADDING, background = DEFAULT_BACKGROUND } = {}) {
  const width = Number(svg.getAttribute('width')) || svg.clientWidth || 200;
  const height = Number(svg.getAttribute('height')) || svg.clientHeight || 200;
  const canvas = document.createElement('canvas');
  canvas.width = width + padding * 2;
  canvas.height = height + padding * 2;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context.');

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const img = await loadImage(svgToDataUrl(svg));
  ctx.drawImage(img, padding, padding, width, height);

  return canvasToBlob(canvas);
}

async function copyBlobToClipboard(blob) {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    return false;
  }

  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
  return true;
}

/**
 * Copy a QR SVG as PNG to the clipboard, or download it when clipboard image write is unavailable.
 * @returns {'clipboard' | 'download'}
 */
export async function copyQrImageFromSvg(svg, { filename = 'rydo-live-demo-qr.png', ...options } = {}) {
  if (!svg) throw new Error('QR code is not ready.');

  const blob = await renderQrPngBlob(svg, options);

  try {
    const copied = await copyBlobToClipboard(blob);
    if (copied) return 'clipboard';
  } catch {
    // Fall through to download.
  }

  downloadBlob(blob, filename);
  return 'download';
}
