"""Self-host a bounded, licensed basemap. No external tile requests at runtime."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib, json, os, shutil, subprocess, tarfile, tempfile, urllib.request, urllib.parse, urllib.error
ROOT=Path(__file__).resolve().parents[1]
DEST=ROOT/'app/public/maps'
RELEASE='bali-basemap-20260925-v1'
ARCHIVE='bali-maps.tar.gz'
REPO='woshicuiyao/bali-trip'
DATA='bali-20260925.pmtiles'
ASSET_REV='028c18f713baecad011301ff7a69acc39bcc2ae7'
CLI_SHA='3ed7dbf4ec2e6dfe5e25b6f70d1ffc932729f93c86db353bf514dd71010a312f'
def download(url,dest):
    dest.parent.mkdir(parents=True,exist_ok=True)
    with urllib.request.urlopen(url,timeout=120) as src, dest.open('wb') as out:shutil.copyfileobj(src,out)
def verify():
    p=DEST/DATA
    if not p.exists() or p.stat().st_size<5_000_000:raise RuntimeError('Detailed basemap is missing or truncated')
    with p.open('rb') as f:
        if f.read(8)!=b'PMTiles\x03':raise RuntimeError('Invalid PMTiles header')
    manifest=json.loads((DEST/'manifest.json').read_text())
    if hashlib.sha256(p.read_bytes()).hexdigest()!=manifest['sha256']:raise RuntimeError('Basemap checksum mismatch')
if (DEST/'manifest.json').exists():
    verify();print('Detailed Bali basemap already prepared');raise SystemExit
DEST.mkdir(parents=True,exist_ok=True)
with tempfile.TemporaryDirectory() as temp:
    temp=Path(temp)
    try:
        download(f'https://github.com/{REPO}/releases/download/{RELEASE}/{ARCHIVE}',temp/ARCHIVE)
        with tarfile.open(temp/ARCHIVE) as bundle:bundle.extractall(DEST,filter='data')
        verify();print('Loaded the archived Bali basemap');raise SystemExit
    except urllib.error.HTTPError as error:
        if error.code!=404:raise
    if os.environ.get('SEED_MAP_RELEASE')!='1':
        raise RuntimeError('Run the first map release workflow before building locally')
    cli=temp/'pmtiles-tool.tar.gz'
    download('https://github.com/protomaps/go-pmtiles/releases/download/v1.31.2/go-pmtiles_1.31.2_Linux_x86_64.tar.gz',cli)
    if hashlib.sha256(cli.read_bytes()).hexdigest()!=CLI_SHA:raise RuntimeError('Map tool checksum mismatch')
    with tarfile.open(cli) as bundle:bundle.extractall(temp,filter='data')
    subprocess.run([str(temp/'pmtiles'),'extract','https://build.protomaps.com/20260925.pmtiles',str(DEST/DATA),'--bbox=114.38,-8.92,115.78,-8.02','--maxzoom=14','--download-threads=4','--quiet'],check=True,timeout=1200)
    subprocess.run([str(temp/'pmtiles'),'verify',str(DEST/DATA)],check=True)
    paths=[f'fonts/{font}/{r}.pbf' for font in ['Noto Sans Regular','Noto Sans Medium','Noto Sans Italic'] for r in ['0-255','256-511','512-767','768-1023','8192-8447']]+['fonts/OFL.txt']+[f'sprites/v4/light{s}.{e}' for s in ['','@2x'] for e in ['png','json']]
    def asset(path):
        download(f'https://raw.githubusercontent.com/protomaps/basemaps-assets/{ASSET_REV}/'+urllib.parse.quote(path),DEST/path.replace('sprites/v4/','sprites/'))
    with ThreadPoolExecutor(6) as pool:list(pool.map(asset,paths))
    download('https://raw.githubusercontent.com/tangrams/icons/master/LICENSE.md',DEST/'sprites/LICENSE.md')
    download('https://raw.githubusercontent.com/protomaps/basemaps/main/LICENSE.md',DEST/'LICENSE-protomaps.md')
    (DEST/'manifest.json').write_text(json.dumps({'source':'https://build.protomaps.com/20260925.pmtiles','bounds':[114.38,-8.92,115.78,-8.02],'maxzoom':14,'sha256':hashlib.sha256((DEST/DATA).read_bytes()).hexdigest(),'data_attribution':'© OpenStreetMap contributors','data_license':'https://www.openstreetmap.org/copyright','assets_revision':ASSET_REV},indent=2))
    verify()
    with tarfile.open(temp/ARCHIVE,'w:gz') as bundle:
        for p in sorted(DEST.iterdir()):bundle.add(p,arcname=p.name)
    # A dedicated release keeps map data available even after upstream daily builds expire.
    subprocess.run(['gh','release','create',RELEASE,str(temp/ARCHIVE),'--repo',REPO,'--title','Bali basemap · 2026-09-25','--notes','Public basemap extract for Bali and Nusa Penida, © OpenStreetMap contributors / Protomaps. Includes font and sprite licenses. No private itinerary data.'],check=True)
print('Detailed Bali basemap prepared and archived')
