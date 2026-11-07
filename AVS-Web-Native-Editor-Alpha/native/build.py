"""Build the editable AVS sources with the project-local Emscripten SDK."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import os
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
SDK = ROOT / '.cache/emsdk'
OUT = ROOT / 'build/native'
OUT.mkdir(parents=True, exist_ok=True)
env = dict(os.environ, EM_CONFIG=str(SDK / '.emscripten'))
emcc = SDK / 'upstream/emscripten/emcc.py'
if not emcc.is_file():
    sys.exit('Run npm run setup:wasm first.')
version = subprocess.check_output([sys.executable, str(emcc), '--version'], env=env, text=True)
if '4.0.15' not in version:
    sys.exit('Expected Emscripten 4.0.15, got: ' + version)

avs = ROOT / 'native/avs'
excluded = {
    'e_channelshift.cpp', 'e_colorreduction.cpp', 'e_multiplier.cpp', 'e_videodelay.cpp',
    'e_multidelay.cpp', 'e_convolution.cpp', 'e_texer2.cpp', 'e_normalise.cpp',
    'e_colormap.cpp', 'e_addborders.cpp', 'e_triangle.cpp', 'e_eeltrans.cpp',
    'e_globalvariables.cpp', 'e_multifilter.cpp', 'e_picture2.cpp', 'e_framelimiter.cpp',
    'e_texer.cpp', 'e_example.cpp',
}
sources = []
for pattern in ['avs*.cpp', 'effect*.cpp', 'e_*.cpp', '*.c']:
    sources += [p for p in (avs/'vis_avs').glob(pattern) if p.name not in excluded]
sources += [avs/'vis_avs'/name for name in [
    'audio.cpp', 'blend.cpp', 'handles.cpp', 'image.cpp', 'instance.cpp', 'linedraw.cpp',
    'matrix.cpp', 'preset_json_schema.cpp', 'render_context.cpp', 'r_transition.cpp',
    'video.cpp', 'video_libav.cpp',
]]
sources += list((avs/'3rdparty/WDL-EEL2/eel2').glob('nseel-*.c'))
sources += [avs/'platform.c', avs/'3rdparty/md_fft.cpp']
sources += list((ROOT/'native/web').glob('*.cpp'))
sources = sorted(set(sources))
common = ['-O2', '-DNO_MMX', '-DNO_FFMPEG', '-DEEL_TARGET_PORTABLE',
          '-include', 'stdint.h', '-include', 'stddef.h', '-fexceptions',
          '-Wno-deprecated-declarations', '-Wno-writable-strings', '-Wno-format']
# Content-based invalidation includes headers and compile options.
digest = hashlib.sha256(json.dumps(common).encode())
for p in sorted((ROOT/'native').rglob('*.h')):
    digest.update(p.read_bytes())
fingerprint = digest.hexdigest()

def compile_source(source):
    obj = OUT / (str(source.relative_to(ROOT)).replace('/', '_') + '.o')
    key = hashlib.sha256(fingerprint.encode() + source.read_bytes()).hexdigest()
    key_file = obj.with_suffix('.key')
    if not obj.exists() or not key_file.exists() or key_file.read_text() != key:
        tool = emcc if source.suffix == '.c' else emcc.with_name('em++.py')
        flags = [] if source.suffix == '.c' else ['-std=c++17']
        subprocess.run([sys.executable, str(tool), *common, *flags, '-c', str(source), '-o', str(obj)],
                       env=env, check=True)
        key_file.write_text(key)
    return obj

with ThreadPoolExecutor(max_workers=min(6, os.cpu_count() or 1)) as pool:
    objects = list(pool.map(compile_source, sources))
subprocess.run([sys.executable, str(emcc.with_name('em++.py')), *map(str, objects), '-O2',
    '-fexceptions', '--no-entry', '-sMODULARIZE=1', '-sEXPORT_ES6=1',
    '-sALLOW_MEMORY_GROWTH=1', '-sSTACK_SIZE=8388608', '-sASSERTIONS=1',
    '-sEXPORTED_FUNCTIONS=["_malloc","_free"]', '-sEXPORTED_RUNTIME_METHODS=["UTF8ToString","HEAPU8","HEAPF32"]',
    '-o', str(OUT/'libavs.js')], env=env, check=True)
source_hash = hashlib.sha256()
for path in sorted((ROOT/'native').rglob('*')):
    if path.is_file() and '__pycache__' not in path.parts:
        source_hash.update(str(path.relative_to(ROOT)).encode() + b'\0' + path.read_bytes())
provenance = {
    'type': 'native-source-build',
    'upstream': 'https://github.com/grandchild/vis_avs', 'revision': '1cee1f3',
    'emscriptenVersion': '4.0.15', 'sourceTreeSha256': source_hash.hexdigest(),
    'note': 'AVS//Web browser adaptations to the recorded upstream revision',
    'sha256': {name: hashlib.sha256((OUT/name).read_bytes()).hexdigest()
               for name in ['libavs.js', 'libavs.wasm']},
}
(OUT/'provenance.json').write_text(json.dumps(provenance, indent=2)+'\n')
print('Built editable renderer:', OUT/'libavs.wasm')
