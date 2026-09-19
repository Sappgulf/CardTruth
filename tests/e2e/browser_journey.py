from pathlib import Path
import json
from playwright.sync_api import sync_playwright
# The managed validation environment blocks file/localhost navigation.
# set_content tests the exact bundled document, not a hosted deployment or Safari.
import argparse, shutil, tempfile
parser=argparse.ArgumentParser(description='Reproduce the CardTruth inline Chromium workflow checks.')
parser.add_argument('--chromium', default=shutil.which('chromium') or shutil.which('google-chrome'))
parser.add_argument('--output', default=None)
args=parser.parse_args()
ROOT=Path(__file__).resolve().parents[2]
OUT=Path(args.output or tempfile.mkdtemp(prefix='cardtruth-qa-'));OUT.mkdir(exist_ok=True)
print('QA artifacts:',OUT)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=args.chromium,headless=True)
 page=browser.new_page(viewport={'width':1440,'height':1050},device_scale_factor=1)
 errors=[];network=[]
 page.on('pageerror',lambda e:errors.append(str(e)))
 page.on('request',lambda r:network.append(r.url) if r.url.startswith(('http://','https://')) else None)
 page.on('dialog',lambda d:d.accept())
 page.set_content((ROOT/'CardTruth.html').read_text(), wait_until='load');page.wait_for_timeout(500)
 print('Title:',page.title());print('Errors:',errors)
 page.screenshot(path=str(OUT/'desktop-start.png'),full_page=True)
 page.locator('#demoBtn').click();page.locator('#confirmOutline').wait_for();print('DEMO LOADED')
 page.locator('#confirmOutline').click();page.locator('#measureBtn').wait_for()
 print('MEASUREMENT STAGE:',page.locator('#liveLR').inner_text(),page.locator('#liveTB').inner_text())
 page.screenshot(path=str(OUT/'desktop-measure.png'),full_page=True)
 page.locator('#measureBtn').click();page.locator('#markBtn').wait_for()
 page.locator('#markBtn').click();box=page.locator('#overlay').bounding_box();page.mouse.click(box['x']+box['width']*.65,box['y']+box['height']*.6)
 page.locator('#markKind').select_option('Whitening');page.locator('#markNote').fill('Review under a second lighting angle.');page.locator('#saveMark').click()
 assert 'Review under a second' in page.locator('.annotation-list').inner_text()
 page.locator('#nextSide').click();page.locator('#confirmOutline').click();page.locator('#measureBtn').wait_for();page.locator('#measureBtn').click()
 page.locator('#nextSide').click();page.locator('#reportDialog').wait_for(state='visible')
 assert 'Overall grade: withheld' in page.locator('#reportContent').inner_text()
 page.screenshot(path=str(OUT/'desktop-report.png'),full_page=True)
 page.locator('.outcome-editor summary').click();page.locator('#outcomeGrader').select_option('CGC');page.locator('#outcomeGrade').select_option('Pristine 10');page.locator('#saveOutcome').click()
 with page.expect_download() as d:page.locator('#downloadBtn').click()
 report_path=OUT/'roundtrip.ctscan.json';d.value.save_as(str(report_path));r=json.loads(report_path.read_text())
 assert r['grade_prediction']['probabilities']==[] and r['synthetic'] is True
 assert len(r['sides']['front']['annotations'])==1
 assert r['returned_grade']['grade']=='Pristine 10'
 page.locator('#closeReport').click();page.locator('#resetBtn').click();page.locator('#reportInput').set_input_files(str(report_path));page.locator('#markBtn').wait_for()
 assert 'Review under a second' in page.locator('.annotation-list').inner_text()
 page.screenshot(path=str(OUT/'desktop-review.png'),full_page=True)
 print('ROUNDTRIP OK',r['receipt_sha256'])
 # Test corrupted input preserves the open inspection.
 bad=OUT/'tampered.json';r['card_name']='changed';bad.write_text(json.dumps(r))
 page.locator('#reportInput').set_input_files(str(bad));page.wait_for_timeout(500)
 assert r['receipt_sha256'] and 'checksum does not match' in page.locator('#toast').inner_text()
 assert page.locator('#markBtn').is_visible()
 page.set_viewport_size({'width':390,'height':844});page.wait_for_timeout(400);page.screenshot(path=str(OUT/'mobile-review.png'),full_page=True)
 assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
 page.locator('#resetBtn').click();page.screenshot(path=str(OUT/'mobile-start.png'),full_page=True)
 # Native bridge accepts two camera frames atomically and rejects malformed data.
 result=page.evaluate('''async () => {
 const c=document.createElement('canvas');c.width=700;c.height=1000;
 const x=c.getContext('2d');x.fillStyle='#222222';x.fillRect(0,0,700,1000);
 x.fillStyle='#eeeecc';x.fillRect(80,100,540,780);x.fillStyle='#447788';x.fillRect(110,130,480,720);
 const b=c.toDataURL('image/jpeg').split(',')[1];
 return await window.CardTruth.importNativeBundle({frames:[{side:'front',jpeg_base64:b},{side:'back',jpeg_base64:b}]});
 }''')
 assert result['ok']
 page.locator('#confirmOutline').wait_for()
 bad=page.evaluate('''async () => {try {await window.CardTruth.importNativeBundle({frames:[]});return false;}catch {return true;}}''')
 assert bad and page.locator('#confirmOutline').is_visible()
 print('NATIVE JS BRIDGE OK; bad bundle left inspection intact')
 # Real file-input event path, unsupported upload, and safe skip on an unusable frame.
 from PIL import Image, ImageDraw
 from io import BytesIO
 photo=Image.new('RGB',(900,1200),(20,25,30));paint=ImageDraw.Draw(photo)
 paint.rectangle((140,170,760,1030),fill=(220,185,60));paint.rectangle((175,210,725,990),fill=(40,70,100))
 for y in range(300,800,35):paint.line((220,y,680,y),fill=(110,180,210),width=3)
 buffer=BytesIO();photo.save(buffer,format='JPEG');data=buffer.getvalue()
 page.locator('#resetBtn').click()
 page.locator('#photoInput').set_input_files({'name':'fixture.jpg','mimeType':'image/jpeg','buffer':data})
 page.locator('#confirmOutline').wait_for()
 page.locator('#photoInput').set_input_files({'name':'wrong.txt','mimeType':'text/plain','buffer':b'not a card'})
 page.wait_for_timeout(300)
 assert 'Use a JPEG' in page.locator('#toast').inner_text()
 assert page.locator('#confirmOutline').is_visible()
 page.locator('#confirmOutline').click();page.locator('#measureBtn').wait_for()
 page.locator('#border-left').fill('35');page.locator('#border-right').fill('35')
 assert page.locator('#liveLR').inner_text()=='50.0 / 50.0'
 page.locator('#skipBtn').click();page.locator('#markBtn').wait_for()
 page.locator('#referenceInput').set_input_files({'name':'angle.jpg','mimeType':'image/jpeg','buffer':data})
 page.locator('#referenceGallery img').wait_for()
 page.locator('#rotateBtn').click();page.locator('#confirmOutline').wait_for()
 page.locator('#resetBtn').click()
 blank=BytesIO();Image.new('RGB',(900,1200),'white').save(blank,format='PNG')
 page.locator('#photoInput').set_input_files({'name':'blank.png','mimeType':'image/png','buffer':blank.getvalue()})
 page.locator('#confirmOutline').wait_for();page.locator('#confirmOutline').click();page.locator('#measureBtn').wait_for()
 assert page.locator('#measureBtn').is_disabled()
 page.locator('#skipBtn').click();page.locator('#markBtn').wait_for()
 page.locator('#reportBtn').click()
 assert 'Not measured' in page.locator('#reportContent').inner_text()
 print('FILE INPUT / INVALID FILE / BORDER EDIT / REFERENCE / ROTATION / QUALITY GATE / SKIP OK')
 print('ERRORS',errors,'NETWORK',network)
 assert not errors;assert not network
 browser.close()
