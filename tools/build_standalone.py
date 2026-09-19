from pathlib import Path
import re
root=Path(__file__).resolve().parents[1]
web=root/'apps/web'
source=[]
for name in ['core.js','io.js','demo.js','app.js']:
    text=(web/name).read_text()
    text=re.sub(r'^import .*?;\n','',text,flags=re.M)
    text=re.sub(r'^export ', '', text,flags=re.M)
    source.append(text)
html=(web/'index.html').read_text()
html=html.replace('<link rel="stylesheet" href="styles.css">','<style>\n'+(web/'styles.css').read_text()+'\n</style>')
html=html.replace('<script type="module" src="app.js"></script>','<script>\n(async () => {\n'+ '\n'.join(source)+'\n})();\n</script>')
(root/'CardTruth.html').write_text(html)
static=root/'services/api/static';static.mkdir(parents=True,exist_ok=True)
(static/'index.html').write_text(html)
print(f'Built standalone app: {len(html.encode()):,} bytes')

ios=root/'apps/ios/CardTruth/Resources';ios.mkdir(parents=True,exist_ok=True)
(ios/'CardTruth.html').write_text(html)
