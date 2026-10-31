// Static checks on index.html, run in CI (no browser or firmware needed):
// the page's script parses, and nothing in the page would load anything from outside.
// Plain <a href> links are fine (they only go somewhere when clicked). Usage: node tests/check-static.cjs [file]
const fs = require('fs'), path = require('path');
const file = process.argv[2] || path.resolve(__dirname, '..', 'index.html');
// Embedded fonts and images are data: URIs; drop them so their base64 can't confuse the checks
const html = fs.readFileSync(file, 'utf8').replace(/data:[^"')\s]+/g, 'data:');
const problems = [];
const bad = (what, s) => problems.push(`${what}: ${s.trim().slice(0, 120)}`);
const remote = /^\s*(?:[a-z][a-z0-9+.-]*:)?\/\//i;   // http://, https://, ws://, protocol-relative //

const scripts = [], styles = [];
const markup = html
  .replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (m, attrs, body) => { scripts.push(body); return `<script${attrs}>`; })
  .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (m, body) => { styles.push(body); return '<style>'; });

if (!scripts.length) bad('no inline script found', file);
for (const s of scripts) {
  try { new Function(s); } catch (e) { bad('script does not parse', e.message); }
  for (const [re, what] of [
    [/https?:\/\/|wss?:\/\//i, 'URL in script'],
    [/\bfetch\s*\(/, 'fetch() in script'],
    [/\b(XMLHttpRequest|WebSocket|EventSource|importScripts)\b/, 'network API in script'],
    [/\bsendBeacon\b/, 'sendBeacon in script'],
    [/\bimport\s*\(/, 'dynamic import in script'],
  ]) { const m = s.match(re); if (m) bad(what, m[0]); }
}

const cssProblems = (css, where) => {
  for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]*)\1\s*\)/gi)) if (!/^(data:|#)/i.test(m[2])) bad(`url() in ${where}`, m[0]);
  for (const m of css.matchAll(/@import[^;]*/gi)) bad(`@import in ${where}`, m[0]);
};
styles.forEach(s => cssProblems(s, 'stylesheet'));

for (const tag of markup.matchAll(/<([a-zA-Z][\w-]*)\b([^>]*)>/g)) {
  const name = tag[1].toLowerCase();
  if (name === 'base') bad('<base> tag', tag[0]);
  for (const a of tag[2].matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+))/g)) {
    const attr = a[1].toLowerCase(), val = a[2] ?? a[3] ?? a[4];
    if (attr === 'style') cssProblems(val, `style attribute on <${name}>`);
    else if (attr === 'http-equiv' && /refresh/i.test(val)) bad('meta refresh', tag[0]);
    else if (attr.startsWith('xmlns')) continue;
    else if (attr === 'href' && name === 'a') continue;
    else if (attr === 'srcset' ? val.split(',').some(v => remote.test(v)) : remote.test(val)) bad(`outside URL in <${name} ${attr}>`, val);
  }
}

if (problems.length) { console.error(problems.map(p => 'FAIL ' + p).join('\n')); process.exit(1); }
console.log(`PASS ${path.basename(file)}: script parses and nothing loads from outside (${scripts.length} script, ${styles.length} stylesheet)`);
