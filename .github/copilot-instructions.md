# Copilot / AI Agent Instructions for vibe-webBLEscanner

## Quick context (2 sentences)
- This is a small, dependency-free **Vanilla JS** app that scans and visualizes BLE advertisements in the browser.
- Key design: **unidirectional data flow** (Provider -> Store -> EventBus -> UI) and strict separation of concerns (no DOM in logic/core; UI is render-only).

## What you must know first ✅
- Entry point: `index.html` loads `js/core/app.js` (wires everything).
- API Quick Reference (TL;DR):
  - `Store.upsertDevice(packet)` — packet shape: `{ device: { id, name }, rssi, txPower, uuids, manufacturerData, serviceData }` where `manufacturerData` and `serviceData` may be Maps of DataView or serialized `{ key: 'HEX ...' }` objects.
  - `EventBus` events: `ADVERTISEMENT` (raw or normalized packet), `DEVICE_UPDATED` (Store-emitted device object), `SCAN_STATUS` (playback/scan running state), `RESET` (clear data).
  - `utils/raw.js` exports helpers: `bufferToHex`, `hexToDataView`, `serializeRawMap`, `parseRawObject`, `toSafeId` — use these to convert formats and sanitize DOM ids.
- State lives in `js/core/store.js` (single source of truth). Use `Store.getDevices()` or `Store.upsertDevice(packet)` when interacting with app data.
- Communication uses an Event Bus: `js/core/bus.js` (constants in `EVENTS`). Typical events: `ADVERTISEMENT`, `DEVICE_UPDATED`, `SCAN_STATUS`, `RESET`.
- UI updates are handled in `js/ui/*` and the small components under `js/ui/modules/` (card, modal, controls).

## Concrete coding patterns to follow 🔧
- Always follow the unidirectional flow: Provider -> Store -> EventBus -> UI. Do not call `Store` from inside UI modules or call DOM from logic files.
- Keep logic pure: functions in `js/logic/*` must not access `document` or `window` (see `getSortedAndFilteredList` in `logic/filter.js`).
- Null-safety is required in UI modules: check `getElementById(...)` results before mutating DOM (pattern used throughout `js/ui/*`).
- Persistable state: anything put into `store.js` must be JSON-serializable. **Important:** `Store.getDevices()` now returns a shallow snapshot (new Map) to avoid accidental external mutation. Use `Store.getDeviceById(id)` to retrieve a defensive copy when you need to inspect or present device data. Use `utils/raw.js` helpers (`serializeRawMap`, `parseRawObject`, `bufferToHex`, `hexToDataView`, `toSafeId`) to convert between `Map<DataView>` and serializable `{ key: hexString }` forms. When writing adapters or tests prefer the serialized form for replay files and the Map/DataView form when emulating the real Web Bluetooth API.

## Adding a new data source (adapter) — exact expectations 📡
- Place new adapters in `js/adapters/`. Follow the `LiveProvider` shape:
  - Expose `start(callback = null)` and `stop()`.
  - `start()` should either: dispatch `EventBus.dispatchEvent(new CustomEvent(EVENTS.ADVERTISEMENT, { detail: packet }))` or call the `callback(packet)` passed by `app.js`.
  - Packet shape expected by `Store.upsertDevice(packet)`: { device, rssi, txPower, uuids, manufacturerData, serviceData } where `device.id` and `device.name` are present.
    - Example serialized packet (replay-friendly):
      ```json
      {
        "t": 0,
        "device": { "id": "AA:BB:CC", "name": "Beacon" },
        "rssi": -60,
        "txPower": null,
        "uuids": [],
        "manufacturerData": { "0x004C": "02 15 00 01" },
        "serviceData": { "0000feaa-0000-1000-8000-00805f9b34fb": "01 02" }
      }
      ```
  - When emitting real runtime events (from `LiveProvider`), use actual Web Bluetooth `Map<DataView>` formats; convert to serialized form for saving/loading replays using the `utils/raw.js` helpers.
- Example from `js/adapters/ble.js` shows how to check browser support (`checkSupport()`) and how to add `advertisementreceived` listeners.

## Tests & QA 🧪
- Built-in test mode: append `?test=true` to URL or click the gear & "Run Test Suite". Tests are implemented in `js/test.js`.
- `runTests` injects a mock `navigator.bluetooth` and simulates packets; use it to validate UI logic, filtering, sorting, and rate calculations.
- Tests are now more resilient: they avoid uncaught exceptions when UI elements are missing and assert on `data-device-id` values rather than sanitized DOM ids.
- New tests were added to validate **Replay playback** and **Recorder** behavior (empty replay handling, stop-on-save, recorder truncation) and a unit test for **ReplayProvider pause/resume**. When changing adapter or replay behavior, add corresponding tests to `js/test.js` and validate pause/resume timing and loop behavior (file input -> load -> Start Replay).

## Recordings & Replays
- **Saving:** Use the header **Start recording** toggle (or the Settings panel) to **Start Recording** and **Stop & Save**; the app will download a JSON replay file (`replay-<timestamp>.json`). Empty recordings are rejected and will display a warning.
- **Stop-on-save:** The recording UI supports an optional **Stop scan when saving** checkbox — when enabled, saving a recording will stop the active scan.
- **Format:** Replays are JSON with a `meta` object and `packets` array of { t (ms), device, rssi, txPower, uuids, manufacturerData, serviceData } where raw data fields are hex strings. The app normalizes these into Maps/DataViews when replaying.
- **Playback:** Replays are loaded via the Settings → **Load Replay** file picker. After a file is loaded the **Start Replay** button becomes active and will clear current devices before playback.
- **Performance & Safety:** The Recorder caps saved packets at 10,000 by default to avoid excessive memory usage during large captures. The file loader now yields to the event loop before parsing large files to avoid blocking the UI; empty or malformed replay files are rejected.
- **Note for reviewers:** When adding or modifying replay/recorder behavior, include tests that exercise the UI flow (file input → load → Start Replay) rather than testing only the provider internals.
## How to run / debug locally 🛠️
- Because the project uses ES Modules, serve via a local web server. Options:
  - Windows (provided): run `run.bat` (uses `python -m http.server 8000`).
  - Python: `python3 -m http.server`.
  - Node: `npx http-server .` or VS Code Live Server.
- Important compatibility: passive scanning requires Chrome/Edge/Opera AND `chrome://flags/#enable-experimental-web-platform-features` enabled. The project already performs this check (`LiveProvider.checkSupport()`).
- Debugging tips: the app calls `navigator.bluetooth.requestDevice(...)` as a wake-up; reads `advertisementreceived` events; inspect these in DevTools when testing.

## Important implementation details & gotchas ⚠️
- Device DOM IDs are derived from `device.id` (used directly as element IDs and `badge-<id>` for counters). Be aware of characters that may affect HTML IDs when adding features (current code uses raw IDs).
- Rate calculation uses a per-device `stats.bucket` that is reset every second (see `refreshRates` in `js/core/app.js`). Tests in `js/test.js` rely on this behavior.
- The modal supports pause/resume semantics (see `js/ui/modules/modal.js`) — when paused, updates for the open device must be suppressed.
- Avoid introducing DOM work into `js/logic/*` or `js/core/*`. Keep DOM and rendering in `js/ui/*` only.

## Files to inspect when making changes 🔍
- Boot / wiring: `js/core/app.js`
- State: `js/core/store.js`
- Events: `js/core/bus.js`
- Live adapter: `js/adapters/ble.js`
- Replay adapter (skeleton): `js/adapters/replay.js`
- Filtering/sorting: `js/logic/filter.js`
- UI entry: `js/ui/main.js` and components under `js/ui/modules/`
- Tests: `js/test.js`
- Helpers: `js/utils/helpers.js`

## PR Review Checklist ✅
- Ensure the PR description clearly explains the behavior change and lists files touched.
- Verify the **Unidirectional Flow** is preserved: UI modules (`js/ui/*`) must not call `Store`, and `js/logic/*` / `js/core/*` must not access DOM.
- Search diffs for DOM usage (`document.`, `window.`, `getElementById`) and flag instances found in `js/logic/*` or `js/core/*`.
- Confirm state stored in `js/core/store.js` remains JSON-serializable (no raw DataView/Map left); prefer `serializeRawMap` / `bufferToHex` for serialization.
- Adapter checklist: new adapters must live in `js/adapters/`, expose `start(callback)` and `stop()`, and either dispatch `EVENTS.ADVERTISEMENT` or call the provided callback with the expected packet shape.
- Validate UI null-safety: guard all `getElementById` calls and avoid assuming elements exist before updating.
- Add or update automated tests in `js/test.js` for behavioral changes; verify `?test=true` still passes locally.
- Update `README.md` or `SYSTEM.md` when public behavior, compatibility flags, or run/debug instructions change.
- Manual QA: run the server (`run.bat` / `python -m http.server`), start a scan, inject sample adverts (test mode), and verify filtering, sorting, rate calculation, and modal pause work as expected.

**Splitting large changes (suggested)**
- Break changes into logical commits: docs, tests, new adapters (Replay), recorder + UI wiring, then small refactors/compatibility fixes. This keeps reviews focused and PR diffs small.
- Use `git add -p` to stage hunks interactively or create feature branches per area (e.g., `feature/replay`, `feature/recorder`, `docs/update`).
- If you've already made one big commit, use `git reset HEAD~` to uncommit and re-stage in smaller chunks, or use `git rebase -i` to split/reword the large commit.
- Keep generated or large binary/fixture files out of core changes (move them to `replays/` or `tests/fixtures/` and keep samples minimal).

> If anything in this file is unclear or if you want additional examples (e.g., a sample adapter implementation or a packet sample), tell me which part you'd like expanded and I will update this document. ✅

---

*Short actionable summary:* follow the unidirectional flow, keep logic/UI separation, use `Store.upsertDevice` or `EventBus` for new data, and run tests with `?test=true` or `run.bat`.