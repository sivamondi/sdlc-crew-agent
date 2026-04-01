import { getToken } from './apiClient';
import { runClaudeDirect } from './claudeDirect';

function authHeaders() {
  const token = getToken();
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

/**
 * Stream agent response — always calls Claude API directly from the client.
 * No server proxy needed. API key must be provided.
 */
export async function runAgentStream(systemPrompt, userPrompt, onChunk, options = {}) {
  if (!options.apiKey) {
    throw new Error('No API key available. Set it in Project settings or global Settings.');
  }

  return runClaudeDirect(
    options.apiKey,
    systemPrompt,
    userPrompt,
    onChunk,
    { model: options.model, maxTokens: options.maxTokens }
  );
}

export async function checkHealth() {
  const { getApiBase } = await import('./apiClient');
  const response = await fetch(`${getApiBase()}/api/health`);
  if (!response.ok) throw new Error('Health check failed');
  return response.json();
}
