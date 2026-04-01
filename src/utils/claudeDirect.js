/**
 * Direct Claude API calling — bypasses the server entirely.
 * Used in Electron mode to reduce server load.
 * In web app mode, calls go through the server proxy instead.
 */

const CLAUDE_API_URL = 'https://api.anthropic.com/v1/messages';
const API_VERSION = '2023-06-01';
const DEFAULT_MODEL = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 16384;

/**
 * Stream a Claude API response directly from the client.
 * @param {string} apiKey - Anthropic API key
 * @param {string} systemPrompt - System prompt for the agent
 * @param {string} userPrompt - User prompt with context
 * @param {function} onChunk - Callback: (chunk, fullText) => void
 * @param {object} options - { model, maxTokens }
 * @returns {Promise<string>} Full response text
 */
export async function runClaudeDirect(apiKey, systemPrompt, userPrompt, onChunk, options = {}) {
  const response = await fetch(CLAUDE_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': API_VERSION,
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: options.model || DEFAULT_MODEL,
      max_tokens: options.maxTokens || DEFAULT_MAX_TOKENS,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
      stream: true,
    }),
  });

  if (!response.ok) {
    let errMsg = `Claude API error: ${response.status}`;
    try {
      const errData = await response.json();
      errMsg = errData.error?.message || errData.error?.type || errMsg;
    } catch {}
    throw new Error(errMsg);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let fullText = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      try {
        const event = JSON.parse(data);

        if (event.type === 'content_block_delta' && event.delta?.type === 'text_delta') {
          const text = event.delta.text;
          fullText += text;
          onChunk(text, fullText);
        } else if (event.type === 'error') {
          throw new Error(event.error?.message || 'Unknown streaming error');
        }
      } catch (e) {
        // Skip JSON parse errors for incomplete chunks
        if (e instanceof SyntaxError) continue;
        throw e;
      }
    }
  }

  return fullText;
}

/**
 * Check if we're in Electron mode and should use direct API calls.
 */
export function isElectronDirect() {
  return !!(window.electronAPI?.isElectron);
}
