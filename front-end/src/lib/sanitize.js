/**
 * Lightweight HTML sanitizer for untrusted content displayed via dangerouslySetInnerHTML.
 *
 * Allows a safe subset of HTML tags and attributes, strips everything else.
 * No external dependencies — uses DOMParser which is available in all modern browsers.
 *
 * Usage:
 *   import { sanitizeHtml } from '../lib/sanitize';
 *   <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(product.description) }} />
 */

// Tags that are safe to render
const ALLOWED_TAGS = new Set([
  'p', 'br', 'hr', 'span', 'div', 'blockquote', 'pre', 'code',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li', 'dl', 'dt', 'dd',
  'strong', 'b', 'em', 'i', 'u', 's', 'small', 'mark', 'sub', 'sup',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption', 'colgroup', 'col',
]);

// Attributes that are safe per-tag
const ALLOWED_ATTRS = {
  global: ['class', 'id', 'title', 'lang', 'dir'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt', 'width', 'height', 'loading'],
  td: ['colspan', 'rowspan'],
  th: ['colspan', 'rowspan'],
  col: ['span'],
  colgroup: ['span'],
  ol: ['start', 'type'],
};

// URL schemes that are safe (blocks javascript:, data:, vbscript:)
const SAFE_URL_SCHEMES = new Set(['http:', 'https:', 'mailto:', 'tel:']);

function isSafeUrl(url) {
  try {
    const parsed = new URL(url, window.location.origin);
    return SAFE_URL_SCHEMES.has(parsed.protocol);
  } catch {
    return false;
  }
}

function sanitizeNode(node) {
  // Remove comments and processing instructions
  if (node.nodeType === Node.COMMENT_NODE || node.nodeType === Node.PROCESSING_INSTRUCTION_NODE) {
    node.parentNode?.removeChild(node);
    return;
  }

  if (node.nodeType === Node.TEXT_NODE) {
    return; // Text nodes are safe
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    // Remove unknown node types (CDATA, etc.)
    node.parentNode?.removeChild(node);
    return;
  }

  const tag = node.tagName.toLowerCase();

  // Remove entirely: script, style, iframe, object, embed, form, input, etc.
  if (!ALLOWED_TAGS.has(tag)) {
    // For unwanted tags, unwrap their children (keep inner content) rather than nuke everything
    const parent = node.parentNode;
    while (node.firstChild) {
      parent?.insertBefore(node.firstChild, node);
    }
    parent?.removeChild(node);
    return;
  }

  // Sanitize attributes
  const allowed = new Set([
    ...(ALLOWED_ATTRS.global || []),
    ...(ALLOWED_ATTRS[tag] || []),
  ]);

  const attrs = [...node.attributes];
  for (const attr of attrs) {
    const name = attr.name.toLowerCase();

    // Strip event handlers (onclick, onload, onerror, etc.)
    if (name.startsWith('on')) {
      node.removeAttribute(attr.name);
      continue;
    }

    // Strip style attribute (could contain expression() or url(javascript:))
    if (name === 'style') {
      node.removeAttribute(attr.name);
      continue;
    }

    // Remove attributes not in the allow list
    if (!allowed.has(name)) {
      node.removeAttribute(attr.name);
      continue;
    }

    // Validate URL attributes
    if ((name === 'href' || name === 'src') && !isSafeUrl(attr.value)) {
      node.removeAttribute(attr.name);
      continue;
    }

    // Force rel="noopener noreferrer" on target="_blank" links
    if (tag === 'a' && name === 'target' && attr.value === '_blank') {
      node.setAttribute('rel', 'noopener noreferrer');
    }
  }

  // Recursively sanitize children
  const children = [...node.childNodes];
  for (const child of children) {
    sanitizeNode(child);
  }
}

/**
 * Sanitize an HTML string, returning a safe HTML string.
 * @param {string} html - Untrusted HTML
 * @returns {string} - Sanitized HTML safe for dangerouslySetInnerHTML
 */
export function sanitizeHtml(html) {
  if (!html) return '';

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="__sanitize_root__">${html}</div>`, 'text/html');
  const root = doc.getElementById('__sanitize_root__');

  if (!root) return '';

  const children = [...root.childNodes];
  for (const child of children) {
    sanitizeNode(child);
  }

  return root.innerHTML;
}