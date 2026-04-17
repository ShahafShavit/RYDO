import { getStoredToken } from '@/features/auth/utils/auth-storage';
import { env } from '@/shared/config/env';
import { buildQueryString } from '@/shared/api/api-helpers';
import { ApiError, parseErrorResponse } from '@/shared/api/api-errors';
import { mockRequest } from '@/shared/api/mock-client';

let authToken = null;
let unauthorizedHandler = null;

export function setAuthToken(token) {
  authToken = token;
  if (token) localStorage.setItem('rydo_token', token);
  else localStorage.removeItem('rydo_token');
}

export function setUnauthorizedHandler(handler) {
  unauthorizedHandler = typeof handler === 'function' ? handler : null;
}

/** In-memory token is null until AuthProvider's effect runs; child effects may fetch first after refresh. */
function effectiveAuthToken() {
  return authToken ?? getStoredToken();
}

function getDefaultHeaders(isFormData) {
  const token = effectiveAuthToken();
  const headers = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(!isFormData && { 'Content-Type': 'application/json' }),
  };
  return headers;
}

async function request(path, options = {}) {
  const { isFormData = false, query, ...fetchOptions } = options;
  const requestPath = `${path}${buildQueryString(query)}`;

  const headers = {
    ...(fetchOptions.headers || {}),
    ...getDefaultHeaders(isFormData),
  };

  if (env.isMockApi) {
    return mockRequest(requestPath, {
      headers,
      ...fetchOptions,
    });
  }

  const response = await fetch(`${env.apiBaseUrl}${requestPath}`, {
    ...fetchOptions,
    headers,
  });

  if (response.status === 401) {
    unauthorizedHandler?.();
  }

  if (!response.ok) {
    throw await parseErrorResponse(response);
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

function serializeBody(body, isFormData) {
  if (isFormData || body === undefined || body === null) return body;
  return JSON.stringify(body);
}

export const apiClient = {
  setAuthToken,
  setUnauthorizedHandler,
  buildQueryString,
  get: (path, options = {}) => request(path, { method: 'GET', ...options }),
  post: (path, body, options = {}) => request(path, { method: 'POST', body: serializeBody(body, false), ...options }),
  postFormData: (path, formData, options = {}) => request(path, { method: 'POST', body: formData, isFormData: true, ...options }),
  put: (path, body, options = {}) => request(path, { method: 'PUT', body: serializeBody(body, false), ...options }),
  patch: (path, body, options = {}) => request(path, { method: 'PATCH', body: serializeBody(body, false), ...options }),
  delete: (path, options = {}) => request(path, { method: 'DELETE', ...options }),
  uploadFile: (path, file, additionalData = {}, options = {}) => {
    const form = new FormData();
    const fileFieldName = options.fileFieldName || 'gpxFile';

    if (!(file instanceof File)) {
      throw new ApiError({ message: 'A valid file is required for upload', status: 400, code: 'invalid_file' });
    }

    form.append(fileFieldName, file);

    Object.entries(additionalData || {}).forEach(([key, value]) => {
      if (value === undefined || value === null || key === 'file') return;
      const serializedValue = Array.isArray(value) ? JSON.stringify(value) : String(value);
      form.append(key, serializedValue);
    });

    return request(path, { method: 'POST', body: form, isFormData: true });
  },
};
