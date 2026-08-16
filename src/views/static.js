import { store } from '../store.js';

function mdToHtml(md) {
  return md
    .split(/\n{2,}/)
    .map((block) => {
      const h = block.match(/^(#{1,3})\s+(.*)$/);
      if (h) return `<h${h[1].length}>${h[2]}</h${h[1].length}>`;
      if (/^[-*]\s+/m.test(block)) {
        const items = block.split('\n').filter(Boolean).map((l) => `<li>${l.replace(/^[-*]\s+/, '')}</li>`);
        return `<ul>${items.join('')}</ul>`;
      }
      return `<p>${block}</p>`;
    })
    .join('')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
}

export function renderStatic(el, page) {
  const md = store.pages?.[page];
  el.innerHTML = md
    ? `<article class="prose">${mdToHtml(md)}</article>`
    : `<p class="empty">Page not found. <a href="#/">Back to map</a></p>`;
}
