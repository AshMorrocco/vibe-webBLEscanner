# BLE Monitor Dashboard

A lightweight, dependency-free web application for scanning, analyzing, and visualizing Bluetooth Low Energy (BLE) advertisements directly in the browser. 

Built with Vanilla JavaScript (ES Modules), HTML5, and CSS3. No build tools or external libraries required.

## ✨ Features

* **Live Scanning:** Visualizes BLE devices in real-time as they broadcast.
* **Data Metrics:** Displays RSSI signal strength, advertisement packets received, and real-time packet rate (Ads/s).
* **Filtering & Sorting:**
    * Filter by Name, UUID, or Minimum Signal Strength (RSSI Slider).
    * Sort by Signal, Last Seen, Name, or Packet Rate.
* **Theming:** Built-in Dark/Light mode and dynamic color accent picker.
* **Focus Guard:** Automatically handles browser security restrictions by pausing scans when the window loses focus.
* **Zero Dependencies:** Runs entirely on standard browser APIs.

## 🚀 Getting Started

### Prerequisites

1.  **Browser:** Google Chrome, Microsoft Edge, or Opera (Web Bluetooth is not supported in Firefox or Safari).
2.  **Hardware:** A computer or Android device with Bluetooth support.
3.  **Browser Flags:**
    * Navigate to `chrome://flags/#enable-experimental-web-platform-features`.
    * Set it to **Enabled**.
    * Relaunch your browser.
    * *Note: This is required for the `requestLEScan` (passive scanning) API.*

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
/ble-monitor
├── index.html       # Main entry point and layout
├── css/
│   └── style.css    # All styling, themes, and responsive design
└── js/
    ├── app.js       # Main controller, event loop, and initialization
    ├── ble.js       # Bluetooth API interaction and connection logic
    ├── ui.js        # DOM manipulation, card rendering, and sorting logic
    ├── theme.js     # Dark/Light mode and color persistence handling
    └── test.js      # Self-contained automated test suite
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