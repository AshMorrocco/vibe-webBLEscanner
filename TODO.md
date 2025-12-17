- [ ] Add meta data total Ads/s and over time, maybe a graph
- [ ] update RSSI bar to reflect min and max values
- [ ] Custom hex color input

- [ ] Add Data Export (Download CSV/JSON of scan session)

## Probably wont do
- [ ] Add "Clear List" / "Forget Devices" button
Just refresh the page mate

## Done
- [x] add average ads/s or even ads/min to the card view next to Rx in the format Rx: ## | ##/s
- [x] add filtering (by Name, RSSI, Manufacturer)
- [x] add sorting (name, last recieved, rssi)
- [x] Add RSSI Threshold Slider (Hide devices weaker than X dBm)
- [x] add dark/light mode and/or a color selector primary color 
- [x] Add Detail View (Click card to see Raw Hex Data/Service UUIDs)
- [x] Add testing /?test=true

/js
├── core/
│   ├── app.js       # Bootstrapper (wires Store -> EventBus -> View)
│   ├── bus.js       # Simple EventTarget wrapper
│   ├── store.js     # Holds the 'devices' Map and handles updates
│   └── types.js     # JSDoc Typedefs
├── logic/
│   ├── filter.js    # Existing filter logic
│   └── metrics.js   # Rate calculations (move out of app.js)
├── adapters/
│   ├── ble.js       # Live Bluetooth wrapper
│   └── replay.js    # (Future) Replay log reader
├── ui/
│   ├── main.js      # Layout manager (manages header, sidebar, view container)
│   ├── components/  # Reusable bits (Card, Modal, Badge)
│   └── views/       # Distinct screens
│       ├── grid.js  # Your current grid view
│       └── graph.js # (Future)
└── utils/
    └── helpers.js


Phase 4: The Great Refactor (Wiring app.js)

Goal: This is the big step. We replace the old "Controller" logic with the new "Event" logic.


Phase 5: UI Resilience & Cleanup

Goal: Ensure the UI doesn't crash when elements are missing (crucial for adding new views later).

Prompt:
Markdown

Finally, we need to make the UI robust and compliant with the "Null Safety" rule in `SYSTEM.md`.

Please review `js/ui/main.js`, `js/ui/modules/card.js`, and `js/ui/modules/modal.js`.

1. **Strict Null Checks:** Wrap every `document.getElementById` or `querySelector` in a check. If the element is missing, return gracefully instead of throwing an error.
   - Example: `const el = document.getElementById('foo'); if (!el) return;`
2. **Decoupling:** Ensure `js/ui/main.js` subscribes to the `EventBus` to trigger full grid refreshes (like re-sorting) rather than relying on `app.js` to call it manually.

This allows us to swap the "Grid View" for a "Graph View" later without crashing the