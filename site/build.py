#!/usr/bin/env python3
"""Build index.html from site/index.template.html (Python 3 standard library only).

    python3 site/build.py          write index.html
    python3 site/build.py --check  exit 1 if index.html is out of date

index.html is a generated, self-contained file: the template's placeholders are
replaced with the 5x7 font table from scripts/build_3.0.1_0.js, the default boot
screen, the author's logo and the embedded web fonts (all as base64 data URIs).
Edit the template, not index.html.
"""
import base64
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
SITE = ROOT / 'site'


def b64(path):
    return base64.b64encode(path.read_bytes()).decode()


def build():
    script = (ROOT / 'scripts' / 'build_3.0.1_0.js').read_text()
    start = script.index('const FONT_5X7 = {')
    end = script.index('};', start) + 2
    font_table = script[start:end]

    faces = [
        ('Bricolage Grotesque', 600, 'bricolage-grotesque-latin-600-normal.woff2'),
        ('Bricolage Grotesque', 800, 'bricolage-grotesque-latin-800-normal.woff2'),
        ('Figtree', 400, 'figtree-latin-400-normal.woff2'),
        ('Figtree', 500, 'figtree-latin-500-normal.woff2'),
        ('Figtree', 600, 'figtree-latin-600-normal.woff2'),
    ]
    face_css = '\n'.join(
        '@font-face{font-family:"%s";font-style:normal;font-weight:%d;font-display:swap;'
        'src:url(data:font/woff2;base64,%s) format("woff2")}' % (name, weight, b64(SITE / 'fonts' / f))
        for name, weight, f in faces
    )

    html = (SITE / 'index.template.html').read_text()
    for token in ('/*__FONT__*/', '__DEFAULT_SPLASH__', '__LOGO__', '/*__FONTFACES__*/'):
        if token not in html:
            sys.exit('template is missing placeholder ' + token)
    html = (html.replace('/*__FONT__*/', font_table)
                .replace('__DEFAULT_SPLASH__', 'data:image/png;base64,' + b64(ROOT / 'assets' / 'default_splash.png'))
                .replace('__LOGO__', 'data:image/jpeg;base64,' + b64(SITE / 'logo_small.jpg'))
                .replace('/*__FONTFACES__*/', face_css))
    return html


if __name__ == '__main__':
    out = ROOT / 'index.html'
    html = build()
    if '--check' in sys.argv:
        if not out.exists() or out.read_text() != html:
            sys.exit('index.html is out of date. Run: python3 site/build.py')
        print('index.html is up to date')
    else:
        out.write_text(html)
        print('wrote index.html (%d bytes)' % len(html))
