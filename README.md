# Eqivo Electron Telephony Client

A secure, cross-platform Electron desktop application for initiating and tracking outbound calls using the Eqivo Telephony API via RapidAPI.

## Table of Contents

- [Features](#features)
- [Architecture Overview](#architecture-overview)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Security Decisions](#security-decisions)
- [Desktop Integration](#desktop-integration)
- [Packaging & Distribution](#packaging--distribution)
- [Development](#development)
- [Trade-offs & Production Improvements](#trade-offs--production-improvements)

## Features

✅ **Call Management**

- Initiate outbound calls via Eqivo Telephony API
- Real-time call status tracking (initiated, ringing, answered, ended)
- Automatic status polling with 4-second intervals

✅ **Call History**

- Persistent local SQLite database
- Call history survives app restarts
- View all past calls with timestamps and status

✅ **Desktop Integration**

- System tray icon with Open/Quit actions
- Native desktop notifications for call events
- Global keyboard shortcut (`Ctrl/⌘ + Shift + C`) to focus the app

✅ **Cross-Platform**

- macOS (Universal binary)
- Windows (x64 and x86/ia32)

## Architecture Overview

This project is structured as a **monorepo** using Yarn workspaces, implementing a secure Electron application with strict process isolation.

### Project Structure

```
eqivo-desktop-client/
├── apps/
│   ├── desktop/                    # Electron Main Process (Node.js)
│   │   ├── src/
│   │   │   ├── main.ts             # Application entry point, window management
│   │   │   ├── preload.ts          # Preload script (contextBridge API exposure)
│   │   │   ├── ipc/                # IPC handlers
│   │   │   │   └── call.ipc.ts     # Call-related IPC handlers
│   │   │   ├── services/            # API integration layer
│   │   │   │   └── eqivo.service.ts # Eqivo API client (real + mock modes)
│   │   │   ├── db/                 # SQLite database layer
│   │   │   │   └── db.ts           # Database operations
│   │   │   ├── state/              # Application state management
│   │   │   │   └── callTracker.ts  # Call status polling and tracking
│   │   │   ├── assets/             # Application assets
│   │   │   │   ├── tray.png        # System tray icon (macOS)
│   │   │   │   └── tray.ico        # System tray icon (Windows)
│   │   │   └── tray.ts             # System tray menu setup
│   │   ├── entitlements.mac.plist  # macOS entitlements
│   │   └── electron-builder.yml    # Build configuration
│   └── frontend/                   # React UI (Browser environment)
│       ├── src/
│       │   ├── pages/              # React pages
│       │   │   └── Home.tsx        # Main application page
│       │   ├── api/                # Electron API wrapper
│       │   │   └── electron.ts     # Type-safe Electron API interface
│       │   └── main.tsx            # React entry point
│       └── vite.config.ts          # Vite configuration
```

### Process Separation & Communication

#### Main Process (`apps/desktop`)

- **Environment**: Full Node.js environment with system access
- **Responsibilities**:
  - API communication (Eqivo Telephony via RapidAPI)
  - SQLite database management
  - System integration (tray, notifications, global shortcuts)
  - IPC handlers for renderer communication
  - Environment variable management (`.env` file loading)
  - Mock mode state management

#### Renderer Process (`apps/frontend`)

- **Environment**: Sandboxed browser environment (Chromium)
- **Restrictions**:
  - ❌ No Node.js APIs (`require`, `process`, `fs`, etc.)
  - ❌ No direct network access
  - ❌ No filesystem access
  - ✅ Only exposed APIs via `contextBridge`
- **Communication**: IPC channels only

### Data Flow

```
┌─────────────────┐
│  React UI       │
│  (Renderer)     │
└────────┬────────┘
         │ IPC (contextBridge)
         │
┌────────▼────────┐
│  Preload Script │  ← Security boundary
│  (contextBridge)│
└────────┬────────┘
         │ IPC Messages
         │
┌────────▼────────┐
│  Main Process   │
│  (Node.js)      │
└────────┬────────┘
         │
    ┌────┴────┐
    │         │
┌───▼───┐ ┌──▼────┐
│  API  │ │  DB   │
│  Call │ │ SQLite│
└───────┘ └───────┘
```

### Key Components

**IPC Communication** (`apps/desktop/src/preload.ts`)

- Uses `contextBridge.exposeInMainWorld()` to create secure API surface
- All IPC channels defined as constants for type safety
- Methods exposed: `startCall`, `getCallHistory`, `getMockMode`, `setMockMode`, etc.

**API Service** (`apps/desktop/src/services/eqivo.service.ts`)

- Dual-mode operation: Real API calls or Mock mode
- Environment variable configuration (RAPIDAPI_KEY, EQIVO_FROM, etc.)
- Comprehensive error handling with user-friendly messages
- Status normalization and mapping

**Mock Mode** (`apps/desktop/src/services/eqivo.service.ts`)

- Allows full application testing without API calls
- Simulates realistic call status progression
- No environment variables required when enabled
- Toggleable from UI and system tray menu

## Project Structure

### Monorepo Workspaces

- `apps/desktop` - Electron main process application
- `apps/frontend` - React renderer application
- `packages/shared` - Shared TypeScript types and IPC channel constants

### Key Components

**IPC Communication (`packages/shared/src/ipc.ts`)**

- Centralized IPC channel definitions
- Type-safe channel names
- Shared between Main and Renderer processes

**Database Layer (`apps/desktop/src/db/db.ts`)**

- SQLite database stored in user data directory
- Automatic schema initialization
- Call persistence and retrieval

**Call Tracking (`apps/desktop/src/state/callTracker.ts`)**

- Polls call status every 4 seconds
- Updates database on status changes
- Sends notifications for status transitions
- Cleans up on call completion

**API Service (`apps/desktop/src/services/eqivo.service.ts`)**

- Axios-based HTTP client
- Error handling and validation
- Status mapping from API to internal format

## Getting Started

### Prerequisites

- Node.js 18+ and Yarn
- RapidAPI account with Eqivo Telephony API access
- (For packaging) Platform-specific build tools

### Installation

1. **Clone the repository**

   ```bash
   git clone https://github.com/Shuaibu78/eqivo-desktop-client.git or git clone git@github.com:Shuaibu78/eqivo-desktop-client.git
   cd eqivo-desktop-client
   ```

2. **Install dependencies**

   ```bash
   yarn install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env
   # Edit .env and add your RapidAPI key
   ```

   Get your RapidAPI key from: <https://rapidapi.com/rtckit/api/eqivo-telephony/>

4. **Build the frontend**

   ```bash
   yarn workspace @eqivo/frontend build
   ```

5. **Compile TypeScript (desktop app)**

   ```bash
   yarn workspace @eqivo/desktop dev
   ```

6. **Run the application**

   ```bash
   yarn dev
   # Or directly: yarn workspace @eqivo/desktop start
   ```

### Development Workflow

**Run frontend dev server (for UI development)**

```bash
yarn dev:frontend
# Frontend will be available at http://localhost:5173
```

**Run desktop app (production build)**

```bash
# First build frontend
yarn workspace @eqivo/frontend build

# Then compile and run desktop
yarn workspace @eqivo/desktop dev
yarn workspace @eqivo/desktop start
```

**For development with hot reload**, you can:

1. Run frontend dev server: `yarn dev:frontend`
2. Set `VITE_DEV_SERVER_URL=http://localhost:5173` in your environment
3. Run desktop app: `yarn dev`

## Security Decisions

This application implements multiple layers of security following Electron security best practices.

### 1. Context Isolation & Preload Script

**Decision**: Use `contextBridge` in preload script to expose a controlled, minimal API surface.

**Rationale**:

- Prevents XSS → RCE (Remote Code Execution) attacks
- Renderer process cannot access Node.js APIs directly
- Only explicitly whitelisted functions are available to the renderer
- Creates a security boundary between untrusted web content and Node.js

**Implementation**:

```typescript
// apps/desktop/src/preload.ts
import { contextBridge, ipcRenderer } from "electron";

export const IPC_CHANNELS = {
  CALL_START: "call:start",
  CALL_STATUS: "call:status",
  CALL_HISTORY: "call:history",
  ON_ERROR: "call:error",
  MOCK_MODE_GET: "mock:mode:get",
  MOCK_MODE_SET: "mock:mode:set",
} as const;

contextBridge.exposeInMainWorld("electronApi", {
  startCall: (number: string) => {
    ipcRenderer.send(IPC_CHANNELS.CALL_START, number);
  },
  getCallHistory: () => {
    return ipcRenderer.invoke(IPC_CHANNELS.CALL_HISTORY);
  },
  // ... other safe, controlled methods
});
```

**Security Benefits**:

- Renderer can only call exposed methods, not arbitrary Node.js functions
- No direct access to `ipcRenderer` from renderer code
- Type-safe API surface prevents accidental exposure

### 2. Node Integration Disabled

**Decision**: `nodeIntegration: false` in `webPreferences`.

**Rationale**:

- Renderer runs in a completely sandboxed browser environment
- No access to `require()`, `process`, `fs`, or any Node.js modules
- Forces all system access through controlled IPC channels
- Prevents malicious code injection from compromising the system

**Configuration**:

```typescript
// apps/desktop/src/main.ts
mainWindow = new BrowserWindow({
  webPreferences: {
    preload: path.join(__dirname, "preload.js"),
    nodeIntegration: false, // ✅ Security: No Node.js in renderer
    contextIsolation: true, // ✅ Security: Isolated contexts
  },
});
```

### 3. IPC Channel Security

**Decision**: Centralized IPC channel definitions with type-safe constants.

**Rationale**:

- Type-safe channel names prevent typos and channel name conflicts
- Single source of truth for IPC communication
- Makes it easier to audit all IPC channels
- Prevents accidental channel name collisions

**Implementation**:

- All IPC channels defined in `preload.ts` as constants
- Main process handlers use the same constants
- TypeScript ensures compile-time safety

### 4. API Key Protection

**Decision**: API keys stored as environment variables, only accessible in Main process.

**Rationale**:

- Never bundled into frontend code (not in renderer bundle)
- Not accessible from renderer process (cannot be extracted via DevTools)
- Can be managed via `.env` files (gitignored, not committed)
- Main process is the only process with network access

**Implementation**:

```typescript
// apps/desktop/src/main.ts
// Load .env file BEFORE any other imports
import dotenv from "dotenv";
dotenv.config({ path: path.join(__dirname, "..", ".env") });

// apps/desktop/src/services/eqivo.service.ts
const getApiKey = (): string => {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY environment variable is not set");
  }
  return apiKey; // Only accessible in Main process
};
```

**Security Benefits**:

- Frontend bundle contains zero API keys
- Even if renderer is compromised, API keys remain secure
- Environment variables can be managed per-environment

### 5. Database Security

**Decision**: Store SQLite database in `app.getPath("userData")` with proper permissions.

**Rationale**:

- Platform-appropriate user data directory (OS-managed permissions)
- Survives app updates
- Proper permissions and sandboxing on macOS
- Isolated from other applications

**Implementation**:

```typescript
// apps/desktop/src/db/db.ts
const dbPath = path.join(app.getPath("userData"), "calls.db");
// macOS: ~/Library/Application Support/Eqivo Telephony Client/
// Windows: %APPDATA%/Eqivo Telephony Client/
// Linux: ~/.config/Eqivo Telephony Client/
```

### 6. Content Security

**Decision**: Renderer loads from localhost in development, bundled files in production.

**Rationale**:

- Development: Controlled localhost connection
- Production: All assets bundled, no external resources
- Prevents loading malicious external scripts

### 7. Input Validation

**Decision**: Validate all inputs in Main process before processing.

**Rationale**:

- Renderer input cannot be trusted
- All validation happens in secure Main process
- Prevents injection attacks and malformed requests

**Implementation**:

- Phone number validation in IPC handler
- Environment variable validation before API calls
- Error handling with user-friendly messages

## Desktop Integration

### System Tray

**Icon**: Custom icons in `apps/desktop/src/assets/`

- `tray.png` / `trayIcon.png` - macOS icon
- `tray.ico` - Windows icon

**Menu Actions**:

- **App Name** (header) - Shows application name
- **Show/Hide Window** - Toggles window visibility (updates dynamically)
- **Open** - Shows and focuses the main window
  - Keyboard shortcut: `Ctrl+Shift+C` (Windows/Linux) or `⌘+Shift+C` (macOS)
- **Toggle Mock Mode** - Enable/disable mock API mode (checkbox, syncs with UI)
- **About** - Shows application version and information dialog
- **Quit** - Exits the application
  - Keyboard shortcut: `Ctrl+Q` (Windows/Linux) or `⌘+Q` (macOS)

**Interaction**:

- **Double-click tray icon**: Opens/shows the window
- **Single-click** (Windows/Linux): Toggles window visibility
- **Right-click** (all platforms): Shows context menu
- **Menu auto-updates**: Reflects current window state and mock mode

### Desktop Notifications

Native platform notifications are shown for:

- **Call Started**: When a call is successfully initiated
- **Call Ringing**: When call status changes to ringing
- **Call Answered**: When call is answered
- **Call Ended**: When call completes

Notifications use the platform's native notification system and respect user's Do Not Disturb settings.

### Global Shortcut

- **Shortcut**: `Ctrl+Shift+C` (Windows/Linux) or `⌘+Shift+C` (macOS)
- **Action**: Shows and focuses the main window
- **Use Case**: Quick access when app is minimized to tray
- **Registration**: Automatically registered on app start, unregistered on quit

### OS-Level Capabilities Demonstrated

1. **System Tray Integration**: Persistent background presence with rich context menu
2. **Global Keyboard Shortcuts**: System-wide hotkey registration
3. **Native Notifications**: Platform notification APIs with proper permissions
4. **User Data Directory**: Proper file system integration with OS-managed paths
5. **Window Lifecycle**: Platform-appropriate window behavior (hide vs close on macOS)
6. **Environment Variables**: Secure `.env` file loading with dotenv

## Packaging & Distribution

### Build Configuration

The project uses `electron-builder` (v26.0.12) with configuration in `apps/desktop/electron-builder.yml`.

**Key Configuration**:

- **App ID**: `com.eqivo.desktop`
- **Product Name**: `Eqivo Telephony Client`
- **Electron Version**: `39.2.7` (explicitly specified)
- **Output Directory**: `apps/desktop/release/`

### Environment Setup

**Required Environment Variables** (in `apps/desktop/.env`):

```env
RAPIDAPI_KEY=your_rapidapi_key_here
EQIVO_FROM=15551234567
EQIVO_GATEWAYS=user/
EQIVO_ANSWER_URL=https://demo.eqivo.org/answer.xml
```

**Optional Environment Variables**:

```env
EQIVO_HANGUP_URL=
EQIVO_RING_URL=
EQIVO_TIME_LIMIT=90
EQIVO_HANGUP_ON_RING=90
```

### Building for Production

#### Quick Build (Current Platform)

```bash
# From project root
yarn dist

# This will:
# 1. Build frontend (React app)
# 2. Compile desktop TypeScript
# 3. Package with electron-builder
```

#### Platform-Specific Builds

**Build for macOS**:

```bash
# From root
yarn dist:mac

# Or from apps/desktop
cd apps/desktop
yarn build:all  # Builds frontend + desktop + creates Mac installer
```

**Build for Windows**:

```bash
# From root
yarn dist:win

# Note: Windows builds should be done on Windows or via CI/CD
```

**Build for All Platforms**:

```bash
# From root
yarn dist:all

# Note: Cross-platform building requires CI/CD or VMs
```

#### Step-by-Step Build Process

1. **Build Frontend**:

   ```bash
   yarn workspace @eqivo/frontend build
   ```

   Output: `apps/frontend/dist/`

2. **Compile Desktop TypeScript**:

   ```bash
   yarn workspace @eqivo/desktop build
   ```

   Output: `apps/desktop/dist/`

3. **Package Application**:

   ```bash
   yarn workspace @eqivo/desktop dist
   # Or use platform-specific commands:
   # yarn workspace @eqivo/desktop dist:mac
   # yarn workspace @eqivo/desktop dist:win
   ```

   Output: `apps/desktop/release/`

### Build Output

Builds are created in `apps/desktop/release/`:

**macOS**:

- `Eqivo Telephony Client-x64.dmg` - Intel Mac installer
- `Eqivo Telephony Client-arm64.dmg` - Apple Silicon installer
- Universal builds combine both architectures

**Windows**:

- `Eqivo Telephony Client Setup x64.exe` - NSIS installer (x64)
- `Eqivo Telephony Client x64.exe` - Portable executable (x64)

**Linux** (if configured):

- `Eqivo Telephony Client-x.x.x.AppImage` - AppImage format
- `eqivo-telephony-client_x.x.x_amd64.deb` - Debian package

### Platform-Specific Configuration

#### macOS

**Features**:

- Universal binary support (x64 + arm64)
- Hardened Runtime enabled
- Gatekeeper assessment disabled (for development)
- Entitlements file for required permissions

**Requirements**:

- macOS build machine (or CI/CD)
- For production: Apple Developer certificate for code signing
- For distribution: Notarization via Apple

**Entitlements** (`entitlements.mac.plist`):

- Network client/server access
- JIT compilation (for V8)
- Library validation disabled (for native modules)

#### Windows

**Features**:

- NSIS installer with custom installation directory
- Desktop and Start Menu shortcuts
- Portable executable option
- x64 architecture support

**Requirements**:

- Windows build machine (or CI/CD)
- For production: Code signing certificate

**Installer Options**:

- Custom installation directory
- Desktop shortcut creation
- Start Menu integration

### Icons

**Current Setup**:

- macOS: `src/assets/trayIcon.png` (auto-converted to .icns)
- Windows: `src/assets/tray.ico`

**For Production**:

- Create proper `.icns` file for macOS (512x512 or larger)
- Ensure `.ico` file has multiple sizes (16x16, 32x32, 48x48, 256x256)
- Use `iconutil` on macOS: `iconutil -c icns icon.iconset`

### Code Signing & Notarization

⚠️ **Not implemented in this version**

**For Production Distribution**:

1. **macOS Code Signing**:

   ```bash
   # Requires Apple Developer account
   # Add to electron-builder.yml:
   mac:
     identity: "Developer ID Application: Your Name"
   ```

2. **macOS Notarization**:

   ```bash
   # Requires Apple Developer account
   # Configure in electron-builder.yml:
   mac:
     hardenedRuntime: true
     gatekeeperAssess: true
     entitlementsInherit: entitlements.mac.plist
   ```

3. **Windows Code Signing**:

   ```bash
   # Requires code signing certificate
   # Add to electron-builder.yml:
   win:
     certificateFile: "path/to/certificate.pfx"
     certificatePassword: "password"
   ```

4. **Auto-Updates**:
   - Integrate `electron-updater` for automatic updates
   - Requires update server (GitHub Releases, S3, etc.)
   - Configure update channels (stable, beta)

### Build Troubleshooting

**Common Issues**:

1. **"Cannot compute electron version"**:

   - Solution: Added `electronVersion: 39.2.7` to `electron-builder.yml`
   - Ensure `electron` is installed: `yarn workspace @eqivo/desktop add -D electron@39.2.7`

2. **"dist/main.js not found"**:

   - Solution: Ensure TypeScript compilation completes before packaging
   - Run `yarn workspace @eqivo/desktop build` first

3. **Icon not found**:

   - Solution: Verify icon paths in `electron-builder.yml` are relative to `apps/desktop/`
   - Icons should be in `src/assets/` directory

4. **Cross-platform building**:
   - macOS builds: Must run on macOS
   - Windows builds: Must run on Windows (or use CI/CD)
   - Use GitHub Actions, CircleCI, or similar for automated builds

## Development

### TypeScript Configuration

- **Desktop**: CommonJS modules, ES2020 target
- **Frontend**: ESNext modules, React JSX transform
- **Shared**: Type definitions and constants

### IPC Communication Flow

```
Renderer (Frontend)          Main Process (Desktop)
     |                              |
     |-- startCall(number) -------->|
     |                              |-- API Call to Eqivo
     |                              |-- Save to DB
     |                              |-- Track call status
     |<-- CALL_STATUS update -------|
     |                              |
     |-- getCallHistory() --------->|
     |<-- call history array -------|
```

### Adding New IPC Channels

1. Add channel constant to `packages/shared/src/ipc.ts`
2. Add handler in `apps/desktop/src/ipc/`
3. Expose method in `apps/desktop/src/preload.ts`
4. Add TypeScript types in `apps/frontend/src/api/electron.ts`
5. Use in React components

## Trade-offs & Production Improvements

### Current Trade-offs

#### 1. Status Polling vs WebSockets/Server-Sent Events

**Current Implementation**:

- 4-second polling interval for call status
- Simple `setInterval`-based polling
- Status checked via `getCallStatus()` API call

**Trade-offs**:

- ✅ **Pros**: Simple implementation, works with any API, no server infrastructure needed
- ❌ **Cons**: Less efficient (unnecessary API calls), slight delay in status updates, higher API usage

**Production Solution**:

- WebSocket connection for real-time updates
- Server-sent events (SSE) as fallback
- Event-driven status updates instead of polling
- Reduces API calls by ~95%

#### 2. Error Handling & Resilience

**Current Implementation**:

- Basic error messages via IPC
- User-friendly error messages
- No retry logic for failed API calls
- No offline detection

**Trade-offs**:

- ✅ **Pros**: Simple, clear error messages
- ❌ **Cons**: No automatic recovery, network failures cause immediate errors, no retry mechanism

**Production Solution**:

- Exponential backoff retry logic
- Offline detection and queue
- Error recovery strategies
- Detailed error logging with context
- User-friendly error messages with actionable steps

#### 3. Database Schema & Performance

**Current Implementation**:

- Simple flat structure: `id`, `to_number`, `status`, `timestamp`
- No indexes
- No migrations system
- Direct SQL queries

**Trade-offs**:

- ✅ **Pros**: Easy to implement, fast for small datasets
- ❌ **Cons**: Limited querying capabilities, no relationships, performance degrades with large datasets

**Production Solution**:

- Normalized schema with relationships
- Database migrations (e.g., using `knex` or `typeorm`)
- Indexes on frequently queried fields (`timestamp`, `status`)
- Query optimization
- Pagination for large call histories

#### 4. Code Signing & Distribution

**Current Implementation**:

- Unsigned builds
- No notarization (macOS)
- No auto-updater

**Trade-offs**:

- ✅ **Pros**: Faster development, no certificate costs
- ❌ **Cons**: Users see security warnings, cannot distribute via app stores, no automatic updates

**Production Solution**:

- Code signing certificates (Apple Developer, Windows certificate)
- macOS notarization
- Auto-updater integration (`electron-updater`)
- App store distribution (Mac App Store, Microsoft Store)

#### 5. Environment Variable Management

**Current Implementation**:

- `.env` file in `apps/desktop/` directory
- Loaded at startup via `dotenv`
- No validation or defaults for optional variables

**Trade-offs**:

- ✅ **Pros**: Simple, works for development
- ❌ **Cons**: Must manually create `.env` file, no UI for configuration, no validation

**Production Solution**:

- Settings UI for configuration
- Encrypted storage for sensitive values
- Environment variable validation
- Default values with clear documentation
- Configuration migration between versions

#### 6. Mock Mode Implementation

**Current Implementation**:

- Simple time-based status progression
- No configurable scenarios
- Fixed timing intervals

**Trade-offs**:

- ✅ **Pros**: Works for basic testing, no external dependencies
- ❌ **Cons**: Limited test scenarios, cannot simulate edge cases

**Production Solution**:

- Configurable mock scenarios (success, failure, timeout, etc.)
- Record/replay functionality
- Mock API response customization
- Integration test suite using mocks

### Debugging Steps & API Behavior

This section documents the debugging process and specific API behaviors encountered during development.

#### API Endpoint Discovery

**Initial Challenge**: The API endpoint format was not immediately clear from the documentation.

**Debugging Process**:

1. **Initial Attempt**: `/call` endpoint

   - **Error**: `404 Not Found`
   - **Finding**: Endpoint path was incorrect

2. **Second Attempt**: `/v0.1/Call/` (with trailing slash)

   - **Error**: `405 Method Not Allowed`
   - **Finding**: HTTP method or endpoint format issue

3. **Third Attempt**: `/v0.1/Call` (without trailing slash)

   - **Error**: `405 Method Not Allowed`
   - **Finding**: Case sensitivity or endpoint structure issue

4. **Final Solution**: `/v0.1/Call/` with proper form-encoded data
   - **Status**: Working
   - **Key Learning**: RapidAPI endpoints can be case-sensitive and require exact path matching

#### API Request Format

**Correct Request Format**:

```http
POST https://eqivo-telephony.p.rapidapi.com/v0.1/Call/
Content-Type: application/x-www-form-urlencoded
x-rapidapi-key: YOUR_API_KEY
x-rapidapi-host: eqivo-telephony.p.rapidapi.com

To=15557654321&From=15551234567&Gateways=user/&AnswerUrl=https://demo.eqivo.org/answer.xml
```

**Key Requirements**:

1. **Content-Type**: Must be `application/x-www-form-urlencoded` (not `application/json`)
2. **Data Format**: URL-encoded form data (use `URLSearchParams`)
3. **Required Parameters**:
   - `To` - Destination phone number
   - `From` - Caller ID number
   - `Gateways` - FreeSWITCH gateway strings (comma-separated)
   - `AnswerUrl` - Webhook URL for call status notifications
4. **Optional Parameters**:
   - `TimeLimit` - Call duration limit in seconds
   - `HangupOnRing` - Hangup timeout after ringing
   - `HangupUrl` - Webhook for hangup events
   - `RingUrl` - Webhook for ring events

#### API Response Format

**Successful Response**:

```json
{
  "RequestUUID": "550e8400-e29b-41d4-a716-446655440000",
  "Message": "Call queued successfully",
  "Success": true
}
```

**Error Responses**:

- **400 Bad Request**: Invalid parameters
  ```json
  {
    "message": "Invalid phone number format"
  }
  ```
- **401 Unauthorized**: Invalid API key
- **404 Not Found**: Endpoint doesn't exist
- **405 Method Not Allowed**: Wrong HTTP method or endpoint path

#### Common Issues & Solutions

**Issue 1: 405 Method Not Allowed**

**Symptoms**:

- Request fails with `405 Not Allowed` status
- Error message: "Method not allowed"

**Root Causes**:

- Incorrect endpoint path (case sensitivity, trailing slash)
- Wrong HTTP method
- API version mismatch

**Solutions**:

- Verify exact endpoint path from RapidAPI documentation
- Ensure POST method is used
- Check API version (`v0.1` vs other versions)
- Verify endpoint case sensitivity (`Call` vs `call`)

**Issue 2: Environment Variables Not Loading**

**Symptoms**:

- `RAPIDAPI_KEY environment variable is not set`
- `EQIVO_FROM or CALLER_ID environment variable is not set`

**Root Causes**:

- `.env` file not in correct location
- `.env` file not loaded before service initialization
- Environment variables not set in system

**Solutions**:

- Ensure `.env` file is in `apps/desktop/` directory
- Load `.env` file at the very beginning of `main.ts` (before other imports)
- Use `dotenv.config()` with explicit path
- Verify file path resolution in compiled code (`__dirname` vs `app.getAppPath()`)

**Issue 3: SQL Syntax Errors**

**Symptoms**:

- `SQLITE_ERROR: near "to": syntax error`

**Root Causes**:

- Using SQL reserved keywords as column aliases
- `to` is a reserved keyword in SQLite

**Solutions**:

- Use non-reserved keywords for aliases (`toNumber` instead of `to`)
- Map aliases back to expected field names in application code
- Quote identifiers if necessary (though not recommended)

#### Debugging Tools & Techniques

**1. Console Logging**:

```typescript
// In service layer
console.error("Call Initiation Failed:", {
  url: `${BASE_URL}/Call`,
  method: "POST",
  error: error.response?.data || error.message,
  status: error.response?.status,
  headers: error.config?.headers,
});
```

**2. Network Inspection**:

- Use Electron DevTools to inspect network requests
- Check request headers, body, and response
- Verify API key is being sent correctly

**3. Environment Variable Debugging**:

```typescript
// Verify .env loading
console.log(`Loaded environment variables from ${envPath}`);
console.log("RAPIDAPI_KEY exists:", !!process.env.RAPIDAPI_KEY);
```

**4. IPC Communication Debugging**:

- Add logging in IPC handlers
- Verify data flow between renderer and main process
- Check IPC channel names match

**5. Mock Mode for Testing**:

- Enable mock mode to test UI flow without API calls
- Verify status progression works correctly
- Test error handling without real API failures

#### API Behavior Observations

**1. Endpoint Path Sensitivity**:

- Endpoint is case-sensitive: `/Call/` works, `/call/` may not
- Trailing slash may or may not be required (test both)
- API version must match exactly (`v0.1`)

**2. Request Format**:

- Must use `application/x-www-form-urlencoded`
- JSON format is not accepted
- Parameter names are case-sensitive (`To`, `From`, not `to`, `from`)

**3. Response Handling**:

- Response may contain `RequestUUID`, `CallUUID`, or both
- Success field may be boolean or string
- Error messages vary in format

**4. Status Polling**:

- Call status endpoint: `GET /v0.1/Call/{callUuid}/`
- Status values may vary (uppercase, lowercase, mixed case)
- 404 response means call not found (likely ended)

**5. Rate Limiting**:

- RapidAPI has rate limits based on subscription tier
- Free tier: 500,000 requests/month
- Monitor `x-ratelimit-*` headers in responses

#### Best Practices for API Integration

1. **Always validate environment variables** before making API calls
2. **Handle all HTTP status codes** (400, 401, 404, 405, 500, etc.)
3. **Use proper error messages** that help users understand issues
4. **Log request/response details** for debugging (without sensitive data)
5. **Implement retry logic** for transient failures
6. **Test with mock mode** before using real API
7. **Verify API key** is set before attempting calls
8. **Check API documentation** for latest endpoint formats

### Production Improvements

#### 1. Security Enhancements

**High Priority**:

- ✅ **Code Signing & Notarization**: Required for distribution
- ✅ **Certificate Pinning**: Prevent MITM attacks on API calls
- ✅ **Encrypted Local Storage**: Encrypt sensitive data (API keys, call logs)
- ✅ **Content Security Policy (CSP)**: Restrict resource loading in renderer
- ✅ **Auto-updater with Signature Verification**: Secure update mechanism

**Medium Priority**:

- ✅ **Secure Credential Storage**: Use OS keychain (macOS Keychain, Windows Credential Manager)
- ✅ **Input Sanitization**: Enhanced validation and sanitization
- ✅ **Rate Limiting**: Prevent API abuse
- ✅ **Audit Logging**: Track security-relevant events

#### 2. User Experience

**High Priority**:

- ✅ **Auto-updates**: Seamless application updates
- ✅ **Offline Mode**: Queue calls when offline, sync when online
- ✅ **Call Recording**: If API supports it
- ✅ **Contact Integration**: Import from address book
- ✅ **Call Quality Metrics**: Display connection quality

**Medium Priority**:

- ✅ **Dark/Light Theme**: User preference
- ✅ **Call History Search & Filter**: Advanced filtering
- ✅ **Export Call History**: CSV/JSON export
- ✅ **Keyboard Shortcuts**: More shortcuts for power users
- ✅ **Multi-language Support**: i18n implementation

#### 3. Performance Optimizations

**High Priority**:

- ✅ **WebSocket-based Status Updates**: Replace polling
- ✅ **Database Indexing**: Improve query performance
- ✅ **Lazy Loading**: Load call history on demand
- ✅ **Virtual Scrolling**: For large call history lists

**Medium Priority**:

- ✅ **Background Processing**: Move heavy operations to worker threads
- ✅ **Caching**: Cache API responses where appropriate
- ✅ **Bundle Optimization**: Code splitting, tree shaking
- ✅ **Image Optimization**: Optimize assets

#### 4. Developer Experience

**High Priority**:

- ✅ **Hot Reload**: For both Main and Renderer processes
- ✅ **E2E Testing**: Playwright or Spectron integration
- ✅ **CI/CD Pipeline**: Automated builds and tests
- ✅ **Error Reporting**: Sentry or similar integration

**Medium Priority**:

- ✅ **Type Safety**: Stricter TypeScript configuration
- ✅ **Linting & Formatting**: ESLint, Prettier with strict rules
- ✅ **Documentation**: API documentation, architecture diagrams
- ✅ **Development Tools**: DevTools integration, debugging helpers

#### 5. Architecture Improvements

**High Priority**:

- ✅ **State Management**: Redux or Zustand for complex state
- ✅ **Dependency Injection**: For better testability
- ✅ **Service Layer Abstraction**: Easier to swap implementations
- ✅ **Error Boundary**: React error boundaries for UI resilience

**Medium Priority**:

- ✅ **Plugin System**: Extensibility for custom integrations
- ✅ **Multi-window Support**: Multiple call windows
- ✅ **Event Bus**: Decoupled communication between components
- ✅ **Configuration Management**: Centralized config with validation

#### 6. Testing & Quality Assurance

**High Priority**:

- ✅ **Unit Tests**: Jest for services and utilities
- ✅ **Integration Tests**: Test IPC communication
- ✅ **E2E Tests**: Full user flow testing
- ✅ **Mock API Server**: For consistent testing

**Medium Priority**:

- ✅ **Visual Regression Testing**: Ensure UI consistency
- ✅ **Performance Testing**: Load testing, memory profiling
- ✅ **Security Audits**: Regular dependency audits
- ✅ **Accessibility Testing**: WCAG compliance

#### 7. Monitoring & Analytics

**High Priority**:

- ✅ **Error Tracking**: Sentry or similar
- ✅ **Usage Analytics**: Privacy-respecting analytics
- ✅ **Performance Monitoring**: Track app performance metrics
- ✅ **Crash Reporting**: Automatic crash reports

**Medium Priority**:

- ✅ **User Feedback**: In-app feedback mechanism
- ✅ **Feature Flags**: Gradual feature rollouts
- ✅ **A/B Testing**: Test UI/UX improvements

### Migration Path to Production

1. **Phase 1: Security & Distribution**

   - Implement code signing
   - Set up auto-updater
   - Add error tracking

2. **Phase 2: Performance**

   - Replace polling with WebSockets
   - Add database indexes
   - Implement lazy loading

3. **Phase 3: User Experience**

   - Add offline mode
   - Implement settings UI
   - Add call recording (if supported)

4. **Phase 4: Advanced Features**
   - Contact integration
   - Advanced filtering
   - Multi-window support

### Estimated Effort

- **Security & Distribution**: 2-3 weeks
- **Performance Optimizations**: 1-2 weeks
- **User Experience Enhancements**: 2-3 weeks
- **Testing & QA**: 2-3 weeks
- **Advanced Features**: 3-4 weeks

**Total Production-Ready Timeline**: ~10-15 weeks

## License

MIT

## Author

Shuaib
