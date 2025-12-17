
### Browser losing focus will disable scanning - assume that we retain primary window focus while the application is in-use
Chrome has a hardcoded security feature in its C++ engine (specifically BluetoothScanningPrompt::CheckVisibility). If the Operating System reports that the browser window is "Occluded" (covered by another window or minimized), Chrome cuts the connection to the Bluetooth radio immediately.

No amount of JavaScript, audio hacks, or screen sharing can bypass this because the check happens at the browser engine level, not the page level.