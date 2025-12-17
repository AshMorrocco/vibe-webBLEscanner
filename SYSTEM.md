# Project Architecture
   - **Framework:** Vanilla JavaScript (ES Modules), no build tools.
   - **State:** `app.js` is the single source of truth (holds the `devices` Map).
   - **Logic vs View:** - `js/logic/*` files contain pure functions (processing data) and never touch the DOM.
     - `js/ui/*` files render HTML and never perform business logic (sorting/math).
   - **Communication:** Use CustomEvents or direct method calls. Avoid circular dependencies.