# BLE Monitor Dashboard

A lightweight, dependency-free web application for scanning, analyzing, and visualizing Bluetooth Low Energy (BLE) advertisements directly in the browser. 

Built with Vanilla JavaScript (ES Modules), HTML5, and CSS3. No build tools or external libraries required.

## ✨ Features

* **Live Scanning:** Visualizes BLE devices in real-time as they broadcast.
* **Data Metrics:** Displays RSSI signal strength, advertisement packets received, and real-time packet rate (Ads/s).
* **Filtering & Sorting:**
    * Filter by Name, UUID, or Minimum Signal Strength (RSSI Slider).
    * Sort by Signal, Last Seen, Name, or Packet Rate.
* **Beacon Analytics:** Click any device card to view detailed analytics including battery voltage, signal trends, and motion state for supported beacon types (U1 Real-Time and compatible formats).
* **Theming:** Built-in Dark/Light mode and dynamic color accent picker.
* **Zero Dependencies:** Runs entirely on standard browser APIs.
* **Smart Compatibility Check:** Proactively detects if your browser supports Web Bluetooth and if the required flags are enabled, offering instant fix instructions.
* **Replay Playback:** Load a saved replay (.json) from Settings → Load Replay, then Start Replay to play back packets. During replay, live scanning and recording controls are automatically disabled to prevent interference.
* **Recording & Save:** Start recording from the header control to capture advertisements and Stop & Save to download a replay file. The Recorder enforces a safety cap (default 10k packets). Recordings auto-save if the scan stops due to tab visibility changes.
* **Modular Architecture:** Built on an Event-Driven (Pub/Sub) architecture with strict separation of Logic, State, and UI for high reliability and easy extensibility.

## 🚀 Getting Started

### Prerequisites

1.  **Browser:** Google Chrome, Microsoft Edge, or Opera (Web Bluetooth is not supported in Firefox or Safari).
2.  **Hardware:** A computer or Android device with Bluetooth support.
3.  **Browser Flags:**
    * Navigate to `chrome://flags/#enable-experimental-web-platform-features`.
    * Set it to **Enabled**.
    * Relaunch your browser.
    * *Note: This is required for the `requestLEScan` (passive scanning) API.*
    > Note: The application includes a built-in compatibility checker that will warn you on launch if these flags are missing or if your browser is unsupported.

### Installation & Running

Since this project uses **ES Modules** (`import`/`export`), it cannot be run by dragging `index.html` into the browser (file:// protocol). It must be served via a local web server.

1.  **Clone or Download** this repository.
2.  **Open a terminal** in the project folder.
3.  **Start a local server:**

    * **Python 3:**
        ```bash
        python3 -m http.server
        ```
    * **Node.js:**
        ```bash
        npx http-server .
        ```
    * **VS Code:**
        Install the "Live Server" extension and click "Go Live".

4.  **Open Browser:**
    Navigate to `http://localhost:8000` (or the port shown in your terminal).

## 📂 Project Structure

```text
## 📂 Project Structure

```text
text
/ble-monitor
├── index.html           # Main entry point and layout
├── css/
│   └── style.css        # All styling, themes, and responsive design
└── js/
    ├── core/            # Application Kernel
    │   ├── app.js       # Bootstrapper (Wiring Store -> Bus -> UI)
    │   ├── bus.js       # Event Bus (Pub/Sub)
    │   └── store.js     # Centralized State Management
    ├── adapters/        # Data Sources
    │   ├── ble.js       # Web Bluetooth Adapter (LiveProvider)
    │   └── replay.js    # Scanning Session Replay (Skeleton)
    ├── logic/           # Pure Business Logic (Filtering, Sorting)
    ├── ui/              # View Layer
    │   ├── main.js      # Grid Controller & Event Subscriptions
    │   └── modules/     # Reusable Components (Card, Modal, Controls)
    ├── utils/           # Helpers (Hex conversion, etc.)
    ├── theme.js         # Dark/Light mode and color persistence
    └── test.js          # Automated Test Suite
```
## 🛠️ Usage Guide
### Starting a Scan

    Click Start Scanner.

    A browser permission popup will appear.

    Note: You may see a "Pair" popup first. This is a "Wake Up" trick to initialize the Bluetooth radio. You can cancel the pair request; the passive scan will start immediately after.

### Filtering & Sorting

    RSSI Slider: Drag the slider on the left to hide devices with weak signals (e.g., neighbors' devices).

    Filter Input: Type to filter devices by Name or UUID.

    Sorting: Use the dropdown on the right to sort by "Signal (RSSI)" to see the closest devices, or "Ads/sec" to find the most active devices.

### Troubleshooting

    "Scan failed: SecurityError...": Ensure you have enabled the Experimental Web Platform Features flag in chrome://flags.

    "Bluetooth adapter not available": Ensure Bluetooth is turned on in your OS settings and no other application has exclusive control of the radio.

    Scan stops when I switch tabs: This is expected behavior. Chrome security policies pause Bluetooth scanning when the tab is hidden to prevent background tracking.

## 🧪 Test Mode

The application includes an internal automated test suite to verify UI logic and math without needing real Bluetooth hardware.

    Click the Gear Icon (Bottom Right).

    Click Run Test Suite.

    (Or append ?test=true to the URL).

This will inject a Mock Bluetooth Adapter into the browser and run a sequence of assertions to verify button states, card rendering, and rate calculations.

## 📄 License

This project is open source and available under the MIT License.