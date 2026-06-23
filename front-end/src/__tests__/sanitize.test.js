import { describe, it, expect } from 'vitest';
import { sanitizeHtml } from '../lib/sanitize';

describe('sanitizeHtml', () => {
  describe('Safe content — passes through', () => {
    it('preserves basic HTML tags', () => {
      const result = sanitizeHtml('<p>Hello <strong>world</strong></p>');
      expect(result).toContain('<p>');
      expect(result).toContain('<strong>');
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });

    it('preserves headings', () => {
      const result = sanitizeHtml('<h2>Title</h2><h3>Subtitle</h3>');
      expect(result).toContain('<h2>Title</h2>');
      expect(result).toContain('<h3>Subtitle</h3>');
    });

    it('preserves lists', () => {
      const result = sanitizeHtml('<ul><li>Item 1</li><li>Item 2</li></ul>');
      expect(result).toContain('<ul>');
      expect(result).toContain('<li>Item 1</li>');
      expect(result).toContain('<li>Item 2</li>');
    });

    it('preserves tables', () => {
      const result = sanitizeHtml('<table><thead><tr><th>Header</th></tr></thead><tbody><tr><td>Cell</td></tr></tbody></table>');
      expect(result).toContain('<table>');
      expect(result).toContain('<th>Header</th>');
      expect(result).toContain('<td>Cell</td>');
    });

    it('preserves links with safe href', () => {
      const result = sanitizeHtml('<a href="https://example.com">Link</a>');
      expect(result).toContain('href="https://example.com"');
      expect(result).toContain('Link');
    });

    it('preserves images with safe src', () => {
      const result = sanitizeHtml('<img src="https://example.com/img.jpg" alt="Test" />');
      expect(result).toContain('src="https://example.com/img.jpg"');
      expect(result).toContain('alt="Test"');
    });

    it('preserves formatting tags (b, i, em, u, s)', () => {
      const result = sanitizeHtml('<b>bold</b><i>italic</i><em>emphasis</em><u>underline</u>');
      expect(result).toContain('<b>bold</b>');
      expect(result).toContain('<i>italic</i>');
      expect(result).toContain('<em>emphasis</em>');
      expect(result).toContain('<u>underline</u>');
    });

    it('preserves class attributes', () => {
      const result = sanitizeHtml('<p class="my-class">Text</p>');
      expect(result).toContain('class="my-class"');
    });

    it('handles empty string', () => {
      expect(sanitizeHtml('')).toBe('');
    });

    it('handles null/undefined', () => {
      expect(sanitizeHtml(null)).toBe('');
      expect(sanitizeHtml(undefined)).toBe('');
    });

    it('handles plain text (no HTML)', () => {
      const result = sanitizeHtml('Just plain text');
      expect(result).toBe('Just plain text');
    });
  });

  describe('Dangerous content — stripped', () => {
    it('removes script tags (unwraps inner text as non-executable text)', () => {
      const result = sanitizeHtml('<p>Safe</p><script>alert("xss")</script>');
      expect(result).not.toContain('<script');
      expect(result).toContain('Safe');
      // The script text is unwrapped as plain text — not inside a <script> tag,
      // so it's NOT executable. It's just visible text on the page.
    });

    it('removes style tags (unwraps inner text as plain text)', () => {
      const result = sanitizeHtml('<p>Text</p><style>body{display:none}</style>');
      expect(result).not.toContain('<style');
      expect(result).toContain('Text');
      // The CSS text is unwrapped as plain text — not executable, just visible text
      expect(result).toContain('body{display:none}');
    });

    it('removes iframe tags', () => {
      const result = sanitizeHtml('<iframe src="https://evil.com"></iframe>');
      expect(result).not.toContain('<iframe');
      expect(result).not.toContain('evil.com');
    });

    it('removes event handler attributes (onclick)', () => {
      const result = sanitizeHtml('<p onclick="alert(1)">Click me</p>');
      expect(result).not.toContain('onclick');
      expect(result).toContain('Click me');
    });

    it('removes event handler attributes (onerror)', () => {
      const result = sanitizeHtml('<img src="x" onerror="alert(1)" alt="test" />');
      expect(result).not.toContain('onerror');
    });

    it('removes event handler attributes (onload)', () => {
      const result = sanitizeHtml('<img src="x" onload="alert(1)" alt="test" />');
      expect(result).not.toContain('onload');
    });

    it('removes style attribute', () => {
      const result = sanitizeHtml('<p style="color: red">Text</p>');
      expect(result).not.toContain('style=');
      expect(result).toContain('Text');
    });

    it('removes javascript: URLs from href', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">Click</a>');
      expect(result).not.toContain('javascript:');
      expect(result).toContain('Click');
    });

    it('removes data: URLs from src', () => {
      const result = sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>" alt="x" />');
      expect(result).not.toContain('data:');
    });

    it('removes vbscript: URLs', () => {
      const result = sanitizeHtml('<a href="vbscript:msgbox(1)">Click</a>');
      expect(result).not.toContain('vbscript:');
    });

    it('removes object/embed tags', () => {
      const result = sanitizeHtml('<object data="evil.swf"></object><embed src="evil.swf">');
      expect(result).not.toContain('<object');
      expect(result).not.toContain('<embed');
    });

    it('removes form/input/button tags (unwraps inner text)', () => {
      const result = sanitizeHtml('<form><input type="text"><button>Submit</button></form>');
      // The tags themselves are removed (unwrapped — inner text kept as plain text)
      expect(result).not.toContain('<form');
      // 'Submit' text from <button> is kept as plain text (not dangerous)
      expect(result).toContain('Submit');
    });
  });

  describe('Edge cases', () => {
    it('unwraps unknown tags but keeps inner content', () => {
      const result = sanitizeHtml('<custom-tag>Inner text</custom-tag>');
      expect(result).not.toContain('<custom-tag');
      expect(result).toContain('Inner text');
    });

    it('handles nested sanitized content', () => {
      const result = sanitizeHtml('<div><p>Outer <script>x</script> <strong>bold</strong></p></div>');
      expect(result).not.toContain('<script');
      expect(result).toContain('Outer');
      expect(result).toContain('<strong>bold</strong>');
    });

    it('handles malformed HTML gracefully', () => {
      const result = sanitizeHtml('<p>Unclosed paragraph');
      // Should not throw — DOMParser is lenient
      expect(typeof result).toBe('string');
    });

    it('adds rel="noopener noreferrer" to target="_blank" links', () => {
      const result = sanitizeHtml('<a href="https://example.com" target="_blank">Link</a>');
      expect(result).toContain('rel="noopener noreferrer"');
    });

    it('preserves mailto: links', () => {
      const result = sanitizeHtml('<a href="mailto:test@example.com">Email</a>');
      expect(result).toContain('mailto:test@example.com');
    });

    it('preserves tel: links', () => {
      const result = sanitizeHtml('<a href="tel:+1234567890">Call</a>');
      expect(result).toContain('tel:+1234567890');
    });

    it('handles deeply nested content', () => {
      const html = '<div><div><div><p>Deep</p></div></div></div>';
      const result = sanitizeHtml(html);
      expect(result).toContain('Deep');
      expect(result.match(/<div>/g)?.length).toBe(3);
    });
  });
});
