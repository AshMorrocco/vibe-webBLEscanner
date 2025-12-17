# Project Architecture

## Tech Stack
- **Framework:** Vanilla JavaScript (ES Modules), no build tools.
- **State:** Centralized in `js/core/store.js`.
- **Communication:** Event-driven via `js/core/bus.js`.
- **Styling:** CSS Variables, no preprocessors.

## Architecture Invariants (Rules)
1. **Unidirectional Flow:** Data flows `Source -> Store -> EventBus -> UI`.
   - UI components NEVER write to the Store directly.
   - UI components NEVER call Logic functions directly.
2. **No Logic in UI:** `js/ui/*` files are for rendering only. They receive data objects and update the DOM. No math, filtering, or sorting happens here.
3. **No DOM in Logic:** `js/logic/*` and `js/core/*` files must be pure JS. They cannot access `document` or `window`.
4. **Serialization:** All data stored in `store.js` MUST be JSON-serializable. Complex objects (like DataViews) must be converted to Hex strings or Arrays before storage.
5. **Null Safety:** All UI DOM queries (getElementById) must be null-checked to prevent crashes when views are swapped.

## Component Locations
- `js/core/`: Application bootstrapping, State Store, Event Bus.
- `js/adapters/`: Data Sources (Live BLE, Replay File, WebSocket).
- `js/logic/`: Pure calculation functions (Filtering, Sorting, Metrics).
- `js/ui/`: View logic.
  - `js/ui/views/`: Full-page views (Grid, Graph).
  - `js/ui/components/`: Reusable widgets (Cards, Badges).