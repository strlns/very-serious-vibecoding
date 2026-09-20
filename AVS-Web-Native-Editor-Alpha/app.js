const $ = selector => document.querySelector(selector);
const screen = $("#screen");
const context = screen.getContext("2d", {alpha:false});
const stage = $("#stage");
const list = $("#presetList");
const status = $("#status");
const player = $("#player");
let OFFICIAL_PRESETS = [];
let worker;
let ready = false;
let renderPending = false;
let selected = -1;
let newPresetSelected = false;
let lastPreset = null;
let pendingPreset = null;
let presetSchema = null;
let effectSchemas = new Map();
let effectNames = [];
let currentPreset = null;
let originalPresetBytes = null;
let currentPresetBytes = null;
let currentPresetName = "preset.avs";
let editorDirty = false;
let creatingPreset = false;
let requestId = 0;
let audioContext;
let audioProcessor;
let fileSource;
let liveSource;
let sourceRequest = 0;
let objectUrl;
let normalizationGain = 1;
let editRevision = 0;
let applyInFlight = false;
let autoApplyTimer;
let statusTimer;
let sourceStateTimer;
let favoritesOnly = false;
let favoritePresets = loadFavoritePresets();

function setStatus(text, mode="") {
  clearTimeout(statusTimer);
  status.className = `status ${mode}`;
  status.lastElementChild.textContent = text;
  status.hidden = false;
  statusTimer = setTimeout(() => { status.hidden = true; }, mode === "error" ? 8000 : 3500);
}

function showActiveSources() {
  const sources = [];
  if (player.currentSrc && !player.paused && !player.ended) sources.push("Media file");
  if (liveSource?.kind === "microphone") sources.push("Microphone");
  if (liveSource?.kind === "system") sources.push("System audio");
  const widget = $("#sourceState");
  widget.lastElementChild.textContent = sources.length
    ? `Active: ${sources.join(" + ")}`
    : "No audio sources active";
  widget.hidden = false;
  widget.parentElement.classList.add("sources-visible");
  clearTimeout(sourceStateTimer);
  sourceStateTimer = setTimeout(() => {
    widget.hidden = true;
    widget.parentElement.classList.remove("sources-visible");
  }, 4500);
}

function renderSize() {
  const fixed = $("#resolution")?.value;
  if (fixed && fixed !== "auto") {
    const [width, height] = fixed.split("x").map(Number);
    return {width, height};
  }
  const box = stage.getBoundingClientRect();
  const scale = Math.min(1, 640 / Math.max(1, box.width));
  return {width:Math.max(4, Math.round(box.width * scale / 4) * 4), height:Math.max(2, Math.round(box.height * scale / 2) * 2)};
}

function startWorker() {
  worker?.terminate();
  ready = false;
  renderPending = false;
  worker = new Worker("avs-worker.js?v=5", {type:"module"});
  worker.onmessage = ({data}) => {
    if (data.type === "ready") {
      ready = true;
      indexSchema(data.schema);
      if (lastPreset) sendPreset(lastPreset.bytes, lastPreset.name);
      else createNewPreset();
    } else if (data.type === "presetLoaded") {
      lastPreset = pendingPreset;
      originalPresetBytes = pendingPreset.bytes.slice();
      currentPresetBytes = pendingPreset.bytes.slice();
      currentPresetName = pendingPreset.name;
      pendingPreset = null;
      loadEditorJson(data.presetJson, false);
    } else if (data.type === "presetApplied") {
      currentPresetBytes = new Uint8Array(data.bytes);
      lastPreset = {bytes:currentPresetBytes.slice(), name:currentPresetName};
      if (creatingPreset) originalPresetBytes = currentPresetBytes.slice();
      creatingPreset = false;
      applyInFlight = false;
      if (data.revision == null || data.revision === editRevision) {
        loadEditorJson(data.presetJson, false);
        $("#editorState").textContent = selected >= 0
          ? "Built-in preset — edits are temporary; save a copy."
          : "Changes applied; ready to save.";
      } else {
        editorDirty = true;
        $("#editorState").textContent = "Unapplied changes";
        refreshApplyButton();
        scheduleAutoApply();
      }
    } else if (data.type === "frame") {
      screen.width = data.width;
      screen.height = data.height;
      context.putImageData(new ImageData(new Uint8ClampedArray(data.pixels), data.width, data.height), 0, 0);
      renderPending = false;
    } else if (data.type === "error") {
      setStatus(`Preset error: ${data.message}`, "error");
      pendingPreset = null;
      renderPending = false;
      applyInFlight = false;
      if (editorDirty) {
        refreshApplyButton();
        $("#editorState").textContent = "Changes were not applied";
      }
      if (data.fatal) setTimeout(startWorker, 100);
    }
  };
  worker.onerror = event => {
    event.preventDefault();
    setStatus("Renderer restarted after an unrecoverable error", "error");
    setTimeout(startWorker, 100);
  };
  worker.postMessage({type:"init", ...renderSize()});
}

function createNewPreset() {
  if (!ready) return;
  selected = -1;
  newPresetSelected = true;
  populate($("#search").value);
  currentPresetName = "Untitled Waveform.avs";
  originalPresetBytes = null;
  currentPresetBytes = null;
  creatingPreset = true;
  const preset = {
    "preset format version":"0",
    "avs version":"2.81.4",
    config:{"Clear":true, "Name":"Untitled Waveform"},
    components:[{
      effect:"Simple", enabled:true, comment:"Default audio input waveform",
      config:{
        "Audio Source":"Waveform", "Draw Mode":"Lines", "Audio Channel":"Center",
        "Position":"Center", "Colors":[{"Color":"rgb0_8(163, 127, 255)"}]
      }
    }]
  };
  $("#editorState").textContent = "Creating preset…";
  worker.postMessage({type:"applyPreset", json:JSON.stringify(preset)});
}

function decode(base64) {
  const raw = atob(base64);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function sendPreset(bytes, name=currentPresetName) {
  creatingPreset = false;
  pendingPreset = {bytes:bytes.slice(), name};
  const copy = bytes.slice();
  worker.postMessage({type:"preset", bytes:copy.buffer, requestId:++requestId}, [copy.buffer]);
}

function choosePreset(index) {
  selected = index;
  newPresetSelected = false;
  document.querySelectorAll(".preset").forEach(button => button.classList.toggle("active", button.dataset.index === String(index)));
  $("#surprisePreset").disabled = ![...list.querySelectorAll(".preset[data-index]")]
    .some(button => button.dataset.index !== String(index));
  const item = OFFICIAL_PRESETS[index];
  if (item && ready) {
    sendPreset(decode(item.data), item.name);
  }
}

function populate(filter="") {
  const query = filter.trim().toLowerCase();
  list.replaceChildren();
  const createButton = document.createElement("button");
  createButton.className = `preset newPreset${newPresetSelected ? " active" : ""}`;
  createButton.textContent = "+ New preset (waveform)";
  createButton.title = "Start with a simple audio-reactive waveform";
  createButton.onclick = createNewPreset;
  list.append(createButton);
  let visible = 0;
  let alternatives = 0;
  OFFICIAL_PRESETS.forEach((preset, index) => {
    if (query && !preset.name.toLowerCase().includes(query)) return;
    if (favoritesOnly && !favoritePresets.has(preset.name)) return;
    const row = document.createElement("div");
    row.className = "presetRow";
    const button = document.createElement("button");
    button.className = `preset${index === selected ? " active" : ""}`;
    button.dataset.index = index;
    button.textContent = preset.name.replace(/\.avs$/i, "");
    button.title = preset.name;
    button.onclick = () => choosePreset(index);
    const favorite = document.createElement("button");
    const isFavorite = favoritePresets.has(preset.name);
    favorite.className = "favoritePreset";
    favorite.textContent = isFavorite ? "★" : "☆";
    favorite.title = isFavorite ? "Remove from favorites" : "Add to favorites";
    favorite.setAttribute("aria-label", `${isFavorite ? "Remove" : "Add"} ${preset.name} ${isFavorite ? "from" : "to"} favorites`);
    favorite.setAttribute("aria-pressed", String(isFavorite));
    favorite.onclick = () => {
      if (favoritePresets.has(preset.name)) favoritePresets.delete(preset.name);
      else favoritePresets.add(preset.name);
      saveFavoritePresets();
      populate($("#search").value);
    };
    row.append(button, favorite);
    list.append(row);
    visible += 1;
    if (index !== selected) alternatives += 1;
  });
  $("#presetCount").textContent = `${visible} of ${OFFICIAL_PRESETS.length}`;
  $("#surprisePreset").disabled = alternatives < 1;
}

function loadFavoritePresets() {
  try { return new Set(JSON.parse(localStorage.getItem("avs-favorite-presets-v1") || "[]")); }
  catch { return new Set(); }
}

function saveFavoritePresets() {
  try { localStorage.setItem("avs-favorite-presets-v1", JSON.stringify([...favoritePresets])); }
  catch { /* Favorites remain available for this session. */ }
}

async function loadBundledPresets() {
  try {
    const module = await import("./presets/bundled-presets.js?v=1");
    OFFICIAL_PRESETS = Array.isArray(module.BUNDLED_PRESETS) ? module.BUNDLED_PRESETS : [];
  } catch {
    OFFICIAL_PRESETS = [];
  }
  populate($("#search").value);
}

function surprisePreset() {
  const query = $("#search").value.trim().toLowerCase();
  const choices = OFFICIAL_PRESETS
    .map((preset, index) => ({preset, index}))
    .filter(({preset, index}) => index !== selected
      && (!query || preset.name.toLowerCase().includes(query))
      && (!favoritesOnly || favoritePresets.has(preset.name)))
    .map(({index}) => index);
  if (!choices.length) return;
  const next = choices[Math.floor(Math.random() * choices.length)];
  choosePreset(next);
  list.querySelector(`[data-index="${next}"]`)?.scrollIntoView({block:"nearest"});
}

async function ensureAudio() {
  if (audioContext) {
    await audioContext.resume();
    return;
  }
  audioContext = new AudioContext();
  audioProcessor = audioContext.createScriptProcessor(1024, 2, 2);
  const silent = audioContext.createGain();
  silent.gain.value = 0;
  audioProcessor.connect(silent).connect(audioContext.destination);
  audioProcessor.onaudioprocess = event => {
    if (!ready) return;
    const input = event.inputBuffer;
    const left = input.getChannelData(0).slice();
    const right = (input.numberOfChannels > 1 ? input.getChannelData(1) : input.getChannelData(0)).slice();
    let energy = 0;
    for (let i = 0; i < left.length; i += 1) energy += (left[i] * left[i] + right[i] * right[i]) * 0.5;
    const rms = Math.sqrt(energy / left.length);
    const wanted = rms > 0.0001 ? Math.min(16, Math.max(0.35, 0.18 / rms)) : normalizationGain;
    normalizationGain += (wanted - normalizationGain) * (wanted < normalizationGain ? 0.3 : 0.04);
    for (let i = 0; i < left.length; i += 1) {
      left[i] = Math.max(-1, Math.min(1, left[i] * normalizationGain));
      right[i] = Math.max(-1, Math.min(1, right[i] * normalizationGain));
    }
    worker.postMessage({type:"audio", left:left.buffer, right:right.buffer, sampleRate:audioContext.sampleRate}, [left.buffer, right.buffer]);
  };
}

function indexSchema(json) {
  try {
    presetSchema = JSON.parse(json);
    const effects = presetSchema.$defs.effects.items;
    effectNames = effects.properties.effect.enum || [];
    effectSchemas = new Map();
    for (const rule of effects.allOf || []) {
      const name = rule.if?.properties?.effect?.const;
      if (name) effectSchemas.set(name, {
        config:rule.then?.properties?.config?.properties || {},
        children:Boolean(rule.then?.properties?.components)
      });
    }
  } catch {
    presetSchema = null;
  }
}

function markEditorDirty() {
  editorDirty = true;
  editRevision += 1;
  refreshApplyButton();
  $("#editorRevert").disabled = false;
  $("#editorState").textContent = "Unapplied changes";
  scheduleAutoApply();
}

function autoApplyEnabled() {
  return $("#editorAutoApply").checked;
}

function refreshApplyButton() {
  $("#editorApply").disabled = autoApplyEnabled() || !editorDirty || applyInFlight;
}

function scheduleAutoApply() {
  clearTimeout(autoApplyTimer);
  if (autoApplyEnabled() && editorDirty && !applyInFlight) {
    autoApplyTimer = setTimeout(requestApply, 300);
  }
}

function requestApply() {
  if (!ready || !currentPreset || !editorDirty || applyInFlight) return;
  applyInFlight = true;
  const revision = editRevision;
  refreshApplyButton();
  $("#editorState").textContent = "Applying changes…";
  worker.postMessage({type:"applyPreset", json:JSON.stringify(currentPreset), revision});
}

function setValue(target, key, value) {
  target[key] = value;
  markEditorDirty();
}

function valueControl(target, key, schema={}) {
  const label = document.createElement("label");
  label.className = "field";
  const displayName = key === "Clear" && target === currentPreset?.config
    ? "Clear every frame" : (schema.title || key);
  const caption = document.createElement("span");
  caption.textContent = displayName;
  label.append(caption);
  const value = target[key];
  if (schema.readOnly) {
    const output = document.createElement("span");
    output.className = "readonlyValue";
    output.textContent = value == null ? "" : String(value);
    label.append(output);
    return label;
  }
  let input;
  if (schema.enum) {
    input = document.createElement("select");
    for (const optionValue of schema.enum) {
      const option = document.createElement("option");
      option.value = JSON.stringify(optionValue);
      option.textContent = String(optionValue);
      option.selected = optionValue === value;
      input.append(option);
    }
    input.onchange = () => setValue(target, key, JSON.parse(input.value));
  } else if (schema.type === "boolean" || typeof value === "boolean") {
    input = document.createElement("input");
    input.type = "checkbox";
    input.checked = Boolean(value);
    input.onchange = () => setValue(target, key, input.checked);
  } else if (["integer", "number"].includes(schema.type) || typeof value === "number") {
    input = document.createElement("input");
    input.type = "number";
    input.step = schema.type === "integer" ? "1" : (schema.multipleOf || "any");
    if (schema.minimum != null) input.min = schema.minimum;
    if (schema.maximum != null) input.max = schema.maximum;
    input.value = value ?? schema.default ?? "";
    input.onchange = () => setValue(target, key, schema.type === "integer" ? Math.trunc(input.valueAsNumber) : input.valueAsNumber);
  } else if (schema.pattern?.includes("[0-9a-fA-F]") && /^#[0-9a-f]{6}$/i.test(value || "")) {
    input = document.createElement("input");
    input.type = "color";
    input.value = value;
    input.oninput = () => setValue(target, key, input.value);
  } else if (schema.type === "string" || typeof value === "string" || value == null) {
    input = /code|init|frame|beat|point/i.test(key) || String(value || "").includes("\n")
      ? document.createElement("textarea") : document.createElement("input");
    input.value = value ?? schema.default ?? "";
    input.oninput = () => setValue(target, key, input.value);
  } else {
    input = document.createElement("textarea");
    input.value = JSON.stringify(value, null, 2);
    input.onchange = () => {
      try { setValue(target, key, JSON.parse(input.value)); input.setCustomValidity(""); }
      catch { input.setCustomValidity("Invalid JSON"); }
    };
  }
  if (schema.description) input.title = schema.description;
  label.append(input);
  return label;
}

function addComponentControl(components) {
  const row = document.createElement("div");
  row.className = "componentActions";
  const select = document.createElement("select");
  for (const name of effectNames) {
    if (selected >= 0 && name === "Comment") continue;
    select.add(new Option(name, name));
  }
  const add = document.createElement("button");
  add.type = "button";
  add.textContent = "Add component";
  add.onclick = () => {
    const component = {effect:select.value, enabled:true, comment:"", config:{}};
    if (effectSchemas.get(select.value)?.children) component.components = [];
    components.push(component);
    markEditorDirty();
    renderEditor();
  };
  row.append(select, add);
  return row;
}

function orderedComponentEntries(components) {
  const entries = components.map((component, index) => ({component, index}));
  if (selected < 0) return entries;
  return [
    ...entries.filter(({component}) => component.effect === "Comment"),
    ...entries.filter(({component}) => component.effect !== "Comment")
  ];
}

function componentEditor(component, parent, index, depth=0, open=false) {
  const locked = selected >= 0 && component.effect === "Comment";
  const details = document.createElement("details");
  details.className = "component";
  details.open = open;
  const summary = document.createElement("summary");
  const childCount = Array.isArray(component.components) ? component.components.length : 0;
  summary.textContent = `${component.effect || `Component ${index + 1}`}${component.enabled === false ? " — disabled" : ""}${childCount ? ` (${childCount})` : ""}${locked ? " — read-only" : ""}`;
  details.append(summary);
  details.append(valueControl(component, "enabled", {type:"boolean", readOnly:locked}));
  details.append(valueControl(component, "comment", {type:"string", readOnly:selected >= 0}));
  component.config ||= {};
  const known = effectSchemas.get(component.effect)?.config || {};
  for (const key of new Set([...Object.keys(known), ...Object.keys(component.config)])) {
    const schema = locked ? {...(known[key] || {}), readOnly:true} : (known[key] || {});
    details.append(valueControl(component.config, key, schema));
  }
  if (Array.isArray(component.components)) {
    orderedComponentEntries(component.components).forEach(({component:child, index:childIndex}) => {
      details.append(componentEditor(child, component.components, childIndex, depth + 1));
    });
    if (!locked) details.append(addComponentControl(component.components));
  }
  if (!locked) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "Remove component";
    remove.onclick = () => { parent.splice(index, 1); markEditorDirty(); renderEditor(); };
    details.append(remove);
  }
  return details;
}

function renderEditor() {
  const wrapper = $("#structure");
  wrapper.replaceChildren();
  if (!currentPreset) return;
  const rootConfig = currentPreset.config ||= {};
  const rootSchema = presetSchema?.properties?.config?.properties || {};
  const rootDetails = document.createElement("details");
  rootDetails.className = "rootSettings";
  rootDetails.open = true;
  const rootSummary = document.createElement("summary");
  rootSummary.textContent = "Preset settings";
  rootDetails.append(rootSummary);
  for (const key of new Set([...Object.keys(rootSchema), ...Object.keys(rootConfig)])) {
    const schema = key === "Date Initial" || key === "Date Last"
      ? {...(rootSchema[key] || {}), readOnly:true}
      : (rootSchema[key] || {});
    rootDetails.append(valueControl(rootConfig, key, schema));
  }
  const components = currentPreset.components ||= [];
  const entries = orderedComponentEntries(components);
  const leadingComments = selected >= 0 ? entries.filter(({component}) => component.effect === "Comment") : [];
  const remaining = selected >= 0 ? entries.filter(({component}) => component.effect !== "Comment") : entries;
  leadingComments.forEach(({component, index}, displayIndex) => {
    wrapper.append(componentEditor(component, components, index, 0, displayIndex === 0));
  });
  wrapper.append(rootDetails);
  remaining.forEach(({component, index}, displayIndex) => {
    wrapper.append(componentEditor(component, components, index, 0, leadingComments.length === 0 && displayIndex === 0));
  });
  wrapper.append(addComponentControl(components));
}

function loadEditorJson(json, dirty) {
  try {
    currentPreset = JSON.parse(json);
    editorDirty = dirty;
    editRevision += 1;
    refreshApplyButton();
    $("#editorRevert").disabled = !originalPresetBytes;
    $("#editorSave").disabled = !currentPresetBytes;
    $("#editorSave").textContent = selected >= 0 ? "Save copy" : "Save .avs";
    $("#editorState").textContent = dirty ? "Unapplied changes" : selected >= 0
      ? "Built-in preset — edits are temporary; save a copy."
      : "Preset loaded";
    renderEditor();
  } catch {
    currentPreset = null;
    $("#structure").textContent = "The preset structure could not be displayed.";
  }
}

async function connectPlayer() {
  await ensureAudio();
  if (!fileSource) {
    fileSource = audioContext.createMediaElementSource(player);
    fileSource.connect(audioContext.destination);
    fileSource.connect(audioProcessor);
  }
}

async function useAudioFile(file) {
  if (!file || !/^(audio|video)\//.test(file.type)) return;
  sourceRequest += 1;
  const trackTitle = $("#trackTitle");
  trackTitle.textContent = file.name;
  trackTitle.title = file.name;
  trackTitle.hidden = false;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  player.src = objectUrl;
  await connectPlayer();
  player.play().catch(() => {});
}

function stopLiveSource() {
  liveSource?.node.disconnect();
  liveSource?.stream.getTracks().forEach(track => track.stop());
  liveSource = null;
  $("#shareAudio").setAttribute("aria-pressed", "false");
  $("#micAudio").setAttribute("aria-pressed", "false");
  showActiveSources();
}

function activateLiveSource(kind, node, stream) {
  stopLiveSource();
  liveSource = {kind, node, stream};
  node.connect(audioProcessor);
  $(kind === "microphone" ? "#micAudio" : "#shareAudio").setAttribute("aria-pressed", "true");
  showActiveSources();
  for (const track of stream.getAudioTracks()) {
    track.addEventListener("ended", () => {
      if (liveSource?.stream !== stream) return;
      stopLiveSource();
    }, {once:true});
  }
}

async function shareSystemAudio() {
  const request = ++sourceRequest;
  stopLiveSource();
  let stream;
  let candidateSource;
  try {
    if (!navigator.mediaDevices?.getDisplayMedia) throw new DOMException("Unsupported", "NotSupportedError");
    stream = await navigator.mediaDevices.getDisplayMedia({video:true, audio:true});
    if (!stream.getAudioTracks().length) throw new DOMException("No shared audio track", "NotSupportedError");
    await ensureAudio();
    candidateSource = audioContext.createMediaStreamSource(stream);
    if (request !== sourceRequest) {
      candidateSource.disconnect();
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    activateLiveSource("system", candidateSource, stream);
  } catch (error) {
    candidateSource?.disconnect();
    stream?.getTracks().forEach(track => track.stop());
    if (request !== sourceRequest) return;
    const cancelled = error?.name === "NotAllowedError" || error?.name === "AbortError";
    setStatus(cancelled
      ? "Audio sharing was cancelled"
      : "Your browser doesn't support using system audio. Try a media file or your microphone. System audio currently works only in Chromium-based desktop browsers.", "error");
  }
}

async function useMicrophone() {
  if (liveSource?.kind === "microphone") {
    sourceRequest += 1;
    stopLiveSource();
    return;
  }
  const request = ++sourceRequest;
  stopLiveSource();
  let stream;
  let candidateSource;
  try {
    if (!navigator.mediaDevices?.getUserMedia) throw new DOMException("Unsupported", "NotSupportedError");
    stream = await navigator.mediaDevices.getUserMedia({audio:{
      autoGainControl:false,
      echoCancellation:false,
      noiseSuppression:false
    }});
    await ensureAudio();
    candidateSource = audioContext.createMediaStreamSource(stream);
    if (request !== sourceRequest) {
      candidateSource.disconnect();
      stream.getTracks().forEach(track => track.stop());
      return;
    }
    activateLiveSource("microphone", candidateSource, stream);
  } catch (error) {
    candidateSource?.disconnect();
    stream?.getTracks().forEach(track => track.stop());
    if (request !== sourceRequest) return;
    setStatus(error?.name === "NotAllowedError"
      ? "Microphone access was denied"
      : "Your browser doesn't support microphone input.", "error");
  }
}

function openPreset(file) {
  if (!file || !/\.avs$/i.test(file.name)) return;
  file.arrayBuffer().then(buffer => {
    selected = -1;
    newPresetSelected = false;
    populate($("#search").value);
    sendPreset(new Uint8Array(buffer), file.name);
  });
}

function animation(time) {
  if (ready && !renderPending) {
    renderPending = true;
    worker.postMessage({type:"render", time});
  }
  requestAnimationFrame(animation);
}

$("#audioPick").onclick = () => {
  $("#audioInput").value = "";
  $("#audioInput").click();
};
$("#audioInput").onchange = event => useAudioFile(event.target.files[0]);
$("#presetPick").onclick = () => $("#presetInput").click();
$("#presetInput").onchange = event => openPreset(event.target.files[0]);
$("#shareAudio").onclick = shareSystemAudio;
$("#micAudio").onclick = useMicrophone;
$("#resolution").onchange = () => {
  if (ready) worker.postMessage({type:"resize", ...renderSize()});
};
$("#search").oninput = event => populate(event.target.value);
$("#surprisePreset").onclick = surprisePreset;
$("#favoriteFilter").onclick = () => {
  favoritesOnly = !favoritesOnly;
  $("#favoriteFilter").setAttribute("aria-pressed", String(favoritesOnly));
  populate($("#search").value);
};
$("#fullscreen").onclick = () => stage.requestFullscreen?.();
function openAbout(section) {
  const dialog = $("#about");
  dialog.showModal();
  requestAnimationFrame(() => {
    dialog.scrollTop = section ? Math.max(0, section.offsetTop - 16) : 0;
    section?.focus({preventScroll:true});
  });
}

$("#aboutOpen").onclick = () => openAbout();
$("#copyrightOpen").onclick = () => openAbout($("#presetRights"));
$("#presetCopyright").onclick = () => openAbout($("#presetRights"));
$("#editorNew").onclick = createNewPreset;
$("#editorApply").onclick = requestApply;
$("#editorAutoApply").onchange = () => {
  clearTimeout(autoApplyTimer);
  refreshApplyButton();
  scheduleAutoApply();
};
$("#editorRevert").onclick = () => {
  if (originalPresetBytes) sendPreset(originalPresetBytes, currentPresetName);
};
$("#editorSave").onclick = () => {
  if (!currentPresetBytes) return;
  const link = document.createElement("a");
  link.href = URL.createObjectURL(new Blob([currentPresetBytes], {type:"application/octet-stream"}));
  const filename = /\.avs$/i.test(currentPresetName) ? currentPresetName : `${currentPresetName}.avs`;
  link.download = selected >= 0 ? filename.replace(/\.avs$/i, " - edited.avs") : filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
};
document.querySelectorAll("[data-page]").forEach(button => button.onclick = () => {
  document.querySelectorAll("[data-page]").forEach(item => item.disabled = false);
  button.disabled = true;
  $("#presetsPage").classList.toggle("active", button.dataset.page === "presets");
  $("#structurePage").classList.toggle("active", button.dataset.page === "structure");
});
player.addEventListener("play", () => {
  sourceRequest += 1;
  connectPlayer();
  showActiveSources();
});
player.addEventListener("pause", showActiveSources);
player.addEventListener("ended", showActiveSources);

let dragDepth = 0;
addEventListener("dragenter", event => { event.preventDefault(); dragDepth += 1; document.body.classList.add("drag"); });
addEventListener("dragleave", () => { if (--dragDepth <= 0) document.body.classList.remove("drag"); });
addEventListener("dragover", event => event.preventDefault());
addEventListener("drop", event => {
  event.preventDefault(); dragDepth = 0; document.body.classList.remove("drag");
  const file = event.dataTransfer.files[0];
  if (/\.avs$/i.test(file?.name || "")) openPreset(file); else useAudioFile(file);
});

new ResizeObserver(() => {
  if (ready) worker.postMessage({type:"resize", ...renderSize()});
}).observe(stage);

let booted = false;

function bootApp() {
  if (booted) return;
  booted = true;
  document.querySelectorAll("header, main, footer, dialog").forEach(element => { element.inert = false; });
  $("#motionGate").hidden = true;
  loadBundledPresets();
  startWorker();
  requestAnimationFrame(animation);
}

const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
const warningStorageKey = "avs-flashing-warning-acknowledged-until-v1";
const warningRememberMs = 24 * 60 * 60 * 1000;

function warningWasAcknowledged() {
  try { return Date.now() < Number(localStorage.getItem(warningStorageKey)); }
  catch { return false; }
}

function rememberWarning() {
  try { localStorage.setItem(warningStorageKey, String(Date.now() + warningRememberMs)); }
  catch { /* Storage can be unavailable for local files or in private modes. */ }
}

function showMotionGate(withCountdown) {
  const gate = $("#motionGate");
  const start = $("#motionGateStart");
  const countdown = $("#motionGateCountdown");
  $("#motionGatePreference").hidden = !withCountdown;
  countdown.hidden = !withCountdown;
  start.textContent = withCountdown ? "I understand — start anyway" : "I understand — start visualizer";
  document.querySelectorAll("header, main, footer, dialog").forEach(element => { element.inert = true; });
  gate.hidden = false;
  start.focus();
  start.onclick = () => {
    if (!withCountdown) {
      rememberWarning();
      bootApp();
      return;
    }
    start.disabled = true;
    let remaining = 5;
    countdown.textContent = `Starting in ${remaining} seconds…`;
    const timer = setInterval(() => {
      remaining -= 1;
      if (remaining > 0) {
        countdown.textContent = `Starting in ${remaining} seconds…`;
      } else {
        clearInterval(timer);
        countdown.textContent = "Starting…";
        bootApp();
      }
    }, 1000);
  };
}

if (reducedMotion.matches) showMotionGate(true);
else if (!warningWasAcknowledged()) showMotionGate(false);
else bootApp();
