"""Tum dosyalari tek bir HTML dosyasinda birlestirir (dist/meow-g-terminal.html).
Kullanim:  python build.py
Tek dosya, GitHub Pages veya e-posta ile paylasim icin kolaydir."""
import re, os
base = os.path.dirname(os.path.abspath(__file__))
html = open(os.path.join(base, 'index.html'), encoding='utf-8').read()

def inline_js(m):
    return '<script>\n' + open(os.path.join(base, m.group(1)), encoding='utf-8').read() + '\n</script>'
def inline_css(m):
    return '<style>\n' + open(os.path.join(base, m.group(1)), encoding='utf-8').read() + '\n</style>'

html = re.sub(r'<script src="(js/[^"]+)"></script>', inline_js, html)
html = re.sub(r'<link rel="stylesheet" href="(css/[^"]+)">', inline_css, html)
os.makedirs(os.path.join(base, 'dist'), exist_ok=True)
out = os.path.join(base, 'dist', 'meow-g-terminal.html')
open(out, 'w', encoding='utf-8').write(html)
print('Yazildi:', out, round(len(html) / 1024), 'KB')
