// // client/src/shared/api/api-client.js
// import { API_CONFIG } from '@/shared/config/api-config';
// import { mockRequest } from '@/shared/api/mock-client';

// let _authToken = null;

// export function setAuthToken(token) {
//   _authToken = token;
//   if (token) localStorage.setItem('rydo_token', token);
//   else localStorage.removeItem('rydo_token');
// }

// function getDefaultHeaders(isFormData) {
//   const headers = {
//     ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
//     ...(!isFormData && { 'Content-Type': 'application/json' }),
//   };
//   return headers;
// }

// async function request(path, options = {}) {
//   const { isFormData = false, ...fetchOptions } = options;

//   if (API_CONFIG.useMockApi) {
//     try {
//       return await mockRequest(path, fetchOptions);
//     } catch (err) {
//       if (import.meta.env.DEV) {
//         console.warn('Mock request failed, falling back to real API:', err);
//         // continue to real fetch
//       } else {
//         throw err;
//       }
//     }
//   }

//   const headers = {
//     ...(fetchOptions.headers || {}),
//     ...getDefaultHeaders(isFormData),
//   };

//   const response = await fetch(`${API_CONFIG.apiBaseUrl}${path}`, {
//     headers,
//     ...fetchOptions,
//   });

//   if (response.status === 401) {
//     // Clear stored auth and redirect to login
//     localStorage.removeItem('rydo-user');
//     localStorage.removeItem('rydo_token');
//     try { window.location.href = '/login'; } catch { }
//     throw new Error('Unauthorized');
//   }

//   if (!response.ok) {
//     const errorText = await response.text();
//     throw new Error(errorText || 'Request failed');
//   }

//   if (response.status === 204) return null;
//   const contentType = response.headers.get('content-type') || '';
//   if (contentType.includes('application/json')) return response.json();
//   return response.text();
// }

// export const apiClient = {
//   setAuthToken,
//   get: (path, options = {}) => request(path, { method: 'GET', ...options }),
//   post: (path, body, options = {}) => request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
//   postFormData: (path, formData, options = {}) => request(path, { method: 'POST', body: formData, isFormData: true, ...options }),
//   put: (path, body, options = {}) => request(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
//   delete: (path, options = {}) => request(path, { method: 'DELETE', ...options }),
//   uploadFile: (path, file, additionalData = {}) => {
//     const form = new FormData();
//     form.append('GpxFile', file);
//     Object.entries(additionalData || {}).forEach(([k, v]) => form.append(k, String(v)));
//     return request(path, { method: 'POST', body: form, isFormData: true });
//   }
// };
import { env } from '@/shared/config/env';

let authToken = null;

export function setAuthToken(token) {
  authToken = token;
  if (token) localStorage.setItem('rydo_token', token);
  else localStorage.removeItem('rydo_token');
}

function getDefaultHeaders(isFormData) {
  const headers = {
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...(!isFormData && { 'Content-Type': 'application/json' }),
  };
  return headers;
}

async function request(path, options = {}) {
  const { isFormData = false, ...fetchOptions } = options;

  const headers = {
    ...(fetchOptions.headers || {}),
    ...getDefaultHeaders(isFormData),
  };

  const response = await fetch(`${env.apiBaseUrl}${path}`, {
    headers,
    ...fetchOptions,
  });

  if (response.status === 401) {
    // Clear stored auth and redirect to login
    localStorage.removeItem('rydo-user');
    localStorage.removeItem('rydo_token');
    try { window.location.href = '/login'; } catch { }
    throw new Error('Unauthorized');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || 'Request failed');
  }

  if (response.status === 204) return null;
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return response.json();
  return response.text();
}

export const apiClient = {
  setAuthToken,
  get: (path, options = {}) => request(path, { method: 'GET', ...options }),
  post: (path, body, options = {}) => request(path, { method: 'POST', body: JSON.stringify(body), ...options }),
  postFormData: (path, formData, options = {}) => request(path, { method: 'POST', body: formData, isFormData: true, ...options }),
  put: (path, body, options = {}) => request(path, { method: 'PUT', body: JSON.stringify(body), ...options }),
  delete: (path, options = {}) => request(path, { method: 'DELETE', ...options }),
  uploadFile: (path, file, additionalData = {}) => {
    const form = new FormData();
    form.append('GpxFile', file);
    Object.entries(additionalData || {}).forEach(([k, v]) => form.append(k, String(v)));
    return request(path, { method: 'POST', body: form, isFormData: true });
  }
};
