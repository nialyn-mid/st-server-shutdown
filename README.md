# SillyTavern Server Shutdown

A SillyTavern extension that adds a button to the settings menu to shut down the server process.

## Architecture
This extension consists of two parts:
1. **Frontend Extension**: Adds the "Shutdown Server" button to the SillyTavern settings.
2. **Backend Plugin**: A server-side plugin that handles the shutdown request and terminates the Node.js process.

## Installation

1. Copy the `st-server-shutdown` folder to your SillyTavern's `public/scripts/extensions/third-party/` directory.
2. Open a terminal in that directory and run:
   ```bash
   node install/install-plugin.cjs
   ```
3. Restart your SillyTavern server.

## Usage
1. Open SillyTavern.
2. Go to **Extensions Settings** (the puzzle icon).
3. Find **Server Shutdown**.
4. Click **Shutdown Server**.
5. Confirm the action in the browser dialog.

## How it works
The backend plugin listens for a `/shutdown` request. When received, it sends a success response back to the client and then calls `process.exit(0)` after a 500ms delay. 

### External Script Integration
If you run SillyTavern via a script like `start.sh`, the process exit will cause `start.sh` to finish. If `start.sh` was called by another script, that parent script will detect the termination and can continue execution (e.g., to perform cleanup or log the event).
