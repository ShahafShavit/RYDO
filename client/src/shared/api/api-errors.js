export class ApiError extends Error {
  constructor({ message, status = 500, code = 'request_failed', details = null, errors = null } = {}) {
    super(message || 'Request failed');
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.errors = errors;
  }
}

export async function parseErrorResponse(response) {
  const fallbackMessage = response.statusText || 'Request failed';
  const contentType = response.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const payload = await response.json().catch(() => null);

    if (payload) {
      return new ApiError({
        message: payload.detail || payload.message || payload.title || fallbackMessage,
        status: response.status,
        code: payload.code || payload.type || 'request_failed',
        details: payload.detail || null,
        errors: payload.errors || null,
      });
    }
  }

  const text = await response.text().catch(() => '');
  return new ApiError({
    message: text || fallbackMessage,
    status: response.status,
    details: text || null,
  });
}
