// Reconstructed browser ABI matching avs-worker.js; upstream AVS remains the renderer.
#include "../avs/vis_avs/avs.h"
#include <emscripten.h>
#include <algorithm>
#include <cstring>
#include <string>
#include <vector>

static AVS_Handle instance = 0;
static std::vector<uint32_t> pixels;
static size_t width = 0, height = 0;
static std::vector<uint8_t> legacy;
static std::string error;

extern "C" {
EMSCRIPTEN_KEEPALIVE int avs_wasm_init() {
    if (!instance) instance = avs_init("", AVS_AUDIO_EXTERNAL, AVS_BEAT_INTERNAL);
    return instance != 0;
}
EMSCRIPTEN_KEEPALIVE void avs_wasm_shutdown() {
    avs_free(instance); instance = 0;
}
EMSCRIPTEN_KEEPALIVE const char* avs_wasm_error() {
    return error.empty() ? avs_error_str(instance) : error.c_str();
}
EMSCRIPTEN_KEEPALIVE void* avs_wasm_resize(size_t w, size_t h) {
    if (!w || !h || w % 4 || h % 2 || w > 8192 || h > 8192) {
        error = "Invalid renderer dimensions"; return nullptr;
    }
    width = w; height = h; pixels.assign(w*h, 0); return pixels.data();
}
EMSCRIPTEN_KEEPALIVE void* avs_wasm_framebuffer() { return pixels.data(); }
EMSCRIPTEN_KEEPALIVE int avs_wasm_render(double time) {
    return avs_render_frame(instance, pixels.data(), width, height, time, false, AVS_PIXEL_RGB0_8);
}
EMSCRIPTEN_KEEPALIVE void avs_wasm_audio(const float* left, const float* right,
    size_t count, size_t rate, double end_sample) {
    avs_audio_set(instance, left, right, count, rate, int64_t(end_sample));
}
// Load into an isolated instance, committing only on success. This also clears EEL
// globals and AVS shared framebuffers when switching presets.
static int replace_preset(const uint8_t* bytes, size_t length, bool is_json) {
    error.clear();
    AVS_Handle next = avs_init("", AVS_AUDIO_EXTERNAL, AVS_BEAT_INTERNAL);
    if (!next) { error = avs_error_str(0); return 0; }
    std::string text;
    bool ok;
    if (is_json) { text.assign((const char*)bytes, length); ok = avs_preset_set(next, text.c_str()); }
    else ok = avs_preset_set_legacy(next, bytes, length);
    if (!ok) { const char* e = avs_error_str(next); error = e ? e : "Invalid preset"; avs_free(next); return 0; }
    avs_free(instance); instance = next;
    std::fill(pixels.begin(), pixels.end(), 0);
    return 1;
}
EMSCRIPTEN_KEEPALIVE int avs_wasm_load_preset(const uint8_t* bytes, size_t length) {
    return replace_preset(bytes, length, false);
}
EMSCRIPTEN_KEEPALIVE int avs_wasm_set_preset_json(const uint8_t* bytes, size_t length) {
    return replace_preset(bytes, length, true);
}
EMSCRIPTEN_KEEPALIVE const char* avs_wasm_preset_json() { return avs_preset_get(instance, false, false); }
EMSCRIPTEN_KEEPALIVE const char* avs_wasm_preset_schema() { return avs_preset_format_schema(); }
EMSCRIPTEN_KEEPALIVE const uint8_t* avs_wasm_preset_legacy() {
    size_t size = 0;
    const uint8_t* bytes = avs_preset_get_legacy(instance, &size);
    legacy.clear();
    if (bytes) legacy.assign(bytes, bytes + size);
    return legacy.empty() ? nullptr : legacy.data();
}
EMSCRIPTEN_KEEPALIVE size_t avs_wasm_preset_legacy_length() { return legacy.size(); }
}
