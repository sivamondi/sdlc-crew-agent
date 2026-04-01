const TOKEN_KEY = 'sdlc-crew-token';

// API base URL — EC2 server for auth/projects/workflows
// Electron loads the app from local files, so API calls go to the remote server
const API_BASE = window.electronAPI
  ? 'https://sdlc.cogniaix.com'
  : '';  // Web mode: relative URLs (same origin)

export function getApiBase() {
  return API_BASE;
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

async function handleResponse(response) {
  if (response.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Session expired. Please login again.');
  }
  if (!response.ok) {
    let errMsg = `Request failed: ${response.status}`;
    try {
      const data = await response.json();
      errMsg = data.error || errMsg;
    } catch {}
    throw new Error(errMsg);
  }
  const text = await response.text();
  return text ? JSON.parse(text) : null;
}

export async function get(url) {
  const response = await fetch(`${API_BASE}${url}`, { headers: authHeaders() });
  return handleResponse(response);
}

export async function post(url, body) {
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function put(url, body) {
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  return handleResponse(response);
}

export async function del(url) {
  const response = await fetch(`${API_BASE}${url}`, {
    method: 'DELETE',
    headers: authHeaders(),
  });
  return handleResponse(response);
}
