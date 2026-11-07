// Browser platform layer: rendering runs synchronously in one dedicated worker.
#include "../avs/platform.h"
#include "../avs/uuid.h"
#include "../avs/vis_avs/audio_in.h"
#include "../avs/vis_avs/files.h"
#include <emscripten.h>
#include <cstdlib>
#include <ctime>
#include <sys/stat.h>

uint64_t timer_ms() { return emscripten_get_now(); }
uint64_t timer_us() { return emscripten_get_now() * 1000; }
double timer_us_precision() { return 1; }
const char* current_date_str() {
    static char date[11];
    time_t now = time(nullptr);
    strftime(date, sizeof(date), "%Y-%m-%d", gmtime(&now));
    return date;
}
lock_t* lock_init() { return malloc(1); }
void lock_lock(lock_t*) {}
bool lock_try(lock_t*) { return true; }
void lock_unlock(lock_t*) {}
void lock_destroy(lock_t* lock) { free(lock); }
dlib_t* library_load(const char*) { return nullptr; }
func_t library_get(dlib_t*, const char*) { return nullptr; }
void library_unload(dlib_t*) {}
const char* library_error() { return "Native plugins are unavailable in the browser"; }
signal_t* signal_create_single() { return nullptr; }
signal_t* signal_create_broadcast() { return nullptr; }
void signal_set(signal_t*) {}
void signal_unset(signal_t*) {}
signal_t* signal_wait(signal_t*, int32_t) { return nullptr; }
signal_t* signal_wait_any(signal_t**, uint32_t, int32_t) { return nullptr; }
signal_t* signal_wait_all(signal_t**, uint32_t, int32_t) { return nullptr; }
void signal_destroy(signal_t*) {}
thread_t* thread_create(uint32_t (*)(void*), void*) { return nullptr; }
thread_t* thread_current() { return nullptr; }
bool thread_join(thread_t*, int32_t) { return false; }
bool thread_join_all(thread_t**, uint32_t, int32_t) { return false; }
bool thread_decrease_priority(thread_t*) { return false; }
void thread_destroy(thread_t*) {}
int create_directory(const char* path) { return mkdir(path, 0755); }
void mem_mark_rwx(void*, size_t) {} // EEL portable interpreter, no executable memory.
void print_last_system_error() {}

std::string uuid4() {
    std::string uuid;
    for (int i = 0; i < 36; ++i) {
        if (i == 8 || i == 13 || i == 18 || i == 23) uuid += '-';
        else if (i == 14) uuid += '4';
        else uuid += "0123456789abcdef"[i == 19 ? (int(emscripten_random()*4)+8) : int(emscripten_random()*16)];
    }
    return uuid;
}
AVS_Audio_Input* audio_in_start(avs_audio_input_handler, void*) { return nullptr; }
void audio_in_stop(AVS_Audio_Input*) {}
std::vector<std::string> audio_in_devices() { return {}; }
bool audio_in_select_device(uint32_t) { return false; }
void find_files_by_extensions(const char*, const char* const*, int,
    void (*)(const char*, void*), void*, size_t, bool, bool) {}
