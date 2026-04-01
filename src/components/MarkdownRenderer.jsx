export default function MarkdownRenderer({ content }) {
  if (!content) return null;

  const html = content
    // Code blocks (must be before inline code)
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) =>
      `<pre><code class="lang-${lang}">${escapeHtml(code.trim())}</code></pre>`
    )
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold and italic
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Horizontal rule
    .replace(/^---$/gm, '<hr />')
    // Tables
    .replace(/^(\|.+\|)\n(\|[-| :]+\|)\n((?:\|.+\|\n?)+)/gm, (_, header, sep, body) => {
      const heads = header.split('|').filter(Boolean).map((h) => `<th>${h.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map((row) => {
        const cells = row.split('|').filter(Boolean).map((c) => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table><thead><tr>${heads}</tr></thead><tbody>${rows}</tbody></table>`;
    })
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Wrap consecutive <li> in <ul>
    .replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>')
    // Paragraphs (lines not already wrapped in HTML)
    .replace(/^(?!<[a-z/])((?!\s*$).+)$/gm, '<p>$1</p>')
    // Clean up extra newlines
    .replace(/\n{2,}/g, '\n');

  return <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />;
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
