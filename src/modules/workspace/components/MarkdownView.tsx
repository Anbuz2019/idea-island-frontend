import { clampText } from '../../../shared/utils/format';

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderInlineMarkdown(value: string) {
  return escapeHtml(value)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>');
}

function renderMarkdown(value?: string | null) {
  const text = value?.trim();
  if (!text) return '<p>尚未评价</p>';

  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const html: string[] = [];
  let inCode = false;
  let codeLines: string[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (!listItems.length) return;
    html.push(`<ul>${listItems.join('')}</ul>`);
    listItems = [];
  };

  const flushCode = () => {
    html.push(`<pre><code>${escapeHtml(codeLines.join('\n'))}</code></pre>`);
    codeLines = [];
  };

  lines.forEach((line) => {
    if (line.trim().startsWith('```')) {
      if (inCode) {
        flushCode();
        inCode = false;
      } else {
        flushList();
        inCode = true;
      }
      return;
    }

    if (inCode) {
      codeLines.push(line);
      return;
    }

    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const heading = /^(#{1,3})\s+(.+)$/.exec(trimmed);
    if (heading) {
      flushList();
      const level = heading[1].length + 3;
      html.push(`<h${level}>${renderInlineMarkdown(heading[2])}</h${level}>`);
      return;
    }

    const list = /^[-*]\s+(.+)$/.exec(trimmed);
    if (list) {
      listItems.push(`<li>${renderInlineMarkdown(list[1])}</li>`);
      return;
    }

    const quote = /^>\s+(.+)$/.exec(trimmed);
    if (quote) {
      flushList();
      html.push(`<blockquote>${renderInlineMarkdown(quote[1])}</blockquote>`);
      return;
    }

    flushList();
    html.push(`<p>${renderInlineMarkdown(trimmed)}</p>`);
  });

  flushList();
  if (inCode) flushCode();
  return html.join('');
}

export function MarkdownView({ value, emptyText = '尚未评价' }: { value?: string | null; emptyText?: string }) {
  return (
    <div
      className="markdown-view"
      dangerouslySetInnerHTML={{ __html: renderMarkdown(value?.trim() ? value : emptyText) }}
    />
  );
}

export function commentPreviewText(comment?: string | null) {
  const text = comment?.trim();
  if (!text) return '';
  const firstLine = text.split(/\r?\n/)[0].trim();
  if (firstLine.startsWith('#')) {
    return firstLine.replace(/^#+\s*/, '');
  }
  return clampText(text, 40);
}
