import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

try {
  const directory = resolve(process.argv[2] || 'build/native');
  const {default: createAVS} = await import(pathToFileURL(`${directory}/libavs.js`));
  const avs = await createAVS({wasmBinary: readFileSync(`${directory}/libavs.wasm`), print: () => {}});
  assert.equal(avs._avs_wasm_init(), 1);
  const framebuffer = avs._avs_wasm_resize(64, 48);
  assert.ok(framebuffer);
  assert.ok(JSON.parse(avs.UTF8ToString(avs._avs_wasm_preset_schema())));
  function apply(preset) {
    const bytes = new TextEncoder().encode(JSON.stringify(preset));
    const pointer = avs._malloc(bytes.length);
    avs.HEAPU8.set(bytes, pointer);
    const result = avs._avs_wasm_set_preset_json(pointer, bytes.length);
    avs._free(pointer);
    assert.equal(result, 1, avs.UTF8ToString(avs._avs_wasm_error()));
  }
  const config = {Clear: true, Name: 'Native smoke check'};
  apply({config, components: [{effect: 'Simple', enabled: true, config: {
    'Audio Source': 'Waveform', 'Draw Mode': 'Lines', 'Audio Channel': 'Center',
    Position: 'Center', Colors: [{Color: '#a37fff'}],
  }}]});
  assert.equal(avs._avs_wasm_render(1), 1);
  assert.ok(avs.HEAPU8.slice(framebuffer, framebuffer + 64 * 48 * 4).some(x => x));
  assert.equal(JSON.parse(avs.UTF8ToString(avs._avs_wasm_preset_json())).config.Name, config.Name);
  const legacyPointer = avs._avs_wasm_preset_legacy();
  const legacy = avs.HEAPU8.slice(legacyPointer, legacyPointer + avs._avs_wasm_preset_legacy_length());
  assert.ok(legacy.length > 24);
  const pointer = avs._malloc(legacy.length);
  avs.HEAPU8.set(legacy, pointer);
  assert.equal(avs._avs_wasm_load_preset(pointer, legacy.length), 1);
  avs._free(pointer);
  assert.equal(JSON.parse(avs.UTF8ToString(avs._avs_wasm_preset_json())).config['Date Initial'], '');

  // A beat-only effect must remain dark on silence and react to externally fed PCM.
  apply({config: {Clear: true}, components: [{effect: 'On Beat Clear', enabled: true,
    config: {Color: '#ffffff', 'Blend Mode': 'Replace', 'Every N Beats': 1}}]});
  assert.equal(avs._avs_wasm_render(2), 1);
  assert.ok(avs.HEAPU8.slice(framebuffer, framebuffer + 64 * 48 * 4).every(x => x === 0));
  const audio = avs._malloc(1024 * 4);
  avs.HEAPF32.fill(0.9, audio >> 2, (audio >> 2) + 1024);
  avs._avs_wasm_audio(audio, audio, 1024, 48000, 1024);
  assert.equal(avs._avs_wasm_render(3), 1);
  assert.ok(avs.HEAPU8.slice(framebuffer, framebuffer + 64 * 48 * 4).some(x => x === 255));
  avs._free(audio);

  // Applying a different root configuration must swap settings, not only children.
  apply({config: {Clear: false, Name: 'Changed'}, components: []});
  assert.equal(JSON.parse(avs.UTF8ToString(avs._avs_wasm_preset_json())).config.Clear, false);
  // Execute real EEL bytecode, including per-instance global RAM.
  apply({config: {Clear: true}, components: [{effect: 'SuperScope', enabled: true,
    config: {Init: 'n=64;gmegabuf(0)=0.5;', Frame: '', Beat: '',
      Point: 'x=i*2-1;y=gmegabuf(0);red=1;green=1;blue=1;'}}]});
  assert.equal(avs._avs_wasm_render(4), 1);
  assert.ok(avs.HEAPU8.slice(framebuffer, framebuffer + 64 * 48 * 4).some(x => x));
  avs._avs_wasm_shutdown();
  console.log('Renderer checks passed: schema, waveform, colors, legacy roundtrip, metadata, Web Audio beat, root settings, EEL.');
} catch (error) {
  console.error(error.stack);
  process.exitCode = 1;
}
