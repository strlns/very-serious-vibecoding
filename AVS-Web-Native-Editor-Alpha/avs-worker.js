import createAVS from "./libavs.js?v=5";

let avs;
let width = 0;
let height = 0;
let framebuffer = 0;
let audioLeft = 0;
let audioRight = 0;
let audioCapacity = 0;
let audioEnd = 0;

const errorText = () => avs ? avs.UTF8ToString(avs._avs_wasm_error()) : "Renderer unavailable";

function loadPreset(bytes) {
  const pointer = avs._malloc(bytes.byteLength);
  avs.HEAPU8.set(bytes, pointer);
  const ok = avs._avs_wasm_load_preset(pointer, bytes.byteLength);
  avs._free(pointer);
  if (!ok) throw new Error(errorText() || "Preset could not be loaded");
}

function presetJson() {
  const pointer = avs._avs_wasm_preset_json();
  return pointer ? avs.UTF8ToString(pointer) : "";
}

function presetLegacy() {
  const pointer = avs._avs_wasm_preset_legacy();
  const length = avs._avs_wasm_preset_legacy_length();
  return pointer && length ? avs.HEAPU8.slice(pointer, pointer + length) : new Uint8Array();
}

function applyPreset(json) {
  const bytes = new TextEncoder().encode(json);
  const pointer = avs._malloc(bytes.byteLength);
  avs.HEAPU8.set(bytes, pointer);
  const ok = avs._avs_wasm_set_preset_json(pointer, bytes.byteLength);
  avs._free(pointer);
  if (!ok) throw new Error(errorText() || "Preset changes could not be applied");
}

function resize(nextWidth, nextHeight) {
  width = Math.max(4, nextWidth - nextWidth % 4);
  height = Math.max(2, nextHeight - nextHeight % 2);
  framebuffer = avs._avs_wasm_resize(width, height);
  if (!framebuffer) throw new Error(errorText());
}

function ensureAudio(samples) {
  if (samples <= audioCapacity) return;
  if (audioLeft) avs._free(audioLeft);
  if (audioRight) avs._free(audioRight);
  audioCapacity = samples;
  audioLeft = avs._malloc(samples * 4);
  audioRight = avs._malloc(samples * 4);
}

self.onmessage = async ({data}) => {
  try {
    if (data.type === "init") {
      avs = await createAVS({locateFile:file => {
        const url = new URL(file, import.meta.url);
        url.searchParams.set("v", "5");
        return url.href;
      }});
      if (!avs._avs_wasm_init()) throw new Error(errorText());
      resize(data.width, data.height);
      const schemaPointer = avs._avs_wasm_preset_schema();
      self.postMessage({type:"ready", schema:schemaPointer ? avs.UTF8ToString(schemaPointer) : ""});
    } else if (data.type === "resize") {
      resize(data.width, data.height);
    } else if (data.type === "preset") {
      loadPreset(new Uint8Array(data.bytes));
      self.postMessage({type:"presetLoaded", requestId:data.requestId, presetJson:presetJson()});
    } else if (data.type === "applyPreset") {
      applyPreset(data.json);
      const bytes = presetLegacy();
      self.postMessage({type:"presetApplied", revision:data.revision, presetJson:presetJson(), bytes:bytes.buffer}, [bytes.buffer]);
    } else if (data.type === "audio") {
      const left = new Float32Array(data.left);
      const right = new Float32Array(data.right);
      ensureAudio(left.length);
      avs.HEAPF32.set(left, audioLeft >> 2);
      avs.HEAPF32.set(right, audioRight >> 2);
      audioEnd += left.length;
      avs._avs_wasm_audio(audioLeft, audioRight, left.length, data.sampleRate, audioEnd);
    } else if (data.type === "render") {
      if (!avs._avs_wasm_render(data.time)) throw new Error(errorText());
      const source = new Uint8Array(avs.HEAPU8.buffer, framebuffer, width * height * 4);
      const rgba = new Uint8ClampedArray(source.length);
      for (let i = 0; i < source.length; i += 4) {
        rgba[i] = source[i + 2];
        rgba[i + 1] = source[i + 1];
        rgba[i + 2] = source[i];
        rgba[i + 3] = 255;
      }
      self.postMessage({type:"frame", pixels:rgba.buffer, width, height}, [rgba.buffer]);
    }
  } catch (error) {
    self.postMessage({type:"error", revision:data?.revision, message:error?.message || String(error), fatal:error instanceof WebAssembly.RuntimeError});
  }
};
