# Phase 7B: Desktop + DM Calls Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the DM call experience (audio cues, timeout, screen share, connection quality, PiP) and polish the desktop app (notification sounds, click-to-navigate, distribution).

**Architecture:** The call system uses LiveKit SFU for media, Socket.IO for signaling (CALL_INVITE/ACCEPT/DECLINE/CANCEL), and Zustand for client state. The desktop app is Electron with an IPC bridge to the web client. A new AudioManager singleton handles all sound effects. DND is schedule-based with timezone support, enforced server-side in the gateway before emitting CALL_INVITE.

**Tech Stack:** TypeScript, React 18, Zustand, LiveKit client SDK, Socket.IO, Electron, Express 5, Drizzle ORM, PostgreSQL, Redis

**Dependency order:** Tasks 1 & 2 are independent (parallel). Task 3 depends on 1. Task 4 depends on 3. Tasks 5 & 6 are independent (parallel, both depend on 4). Task 7 depends on 1. Task 8 is independent (anytime).

---

## Task 1: AudioManager Foundation + Audio Assets

**Files:**
- Create: `apps/web/src/lib/audio.ts`
- Create: `apps/web/public/sounds/` (directory with placeholder audio files)

**Context:** All call/notification sounds need a centralized manager. Uses HTMLAudioElement (not Web Audio API) for simplicity. CC0-licensed placeholder sounds will be generated as short silent/tone files for now — real sound design comes later.

### Step 1: Create placeholder audio files

Generate minimal valid WAV files for each sound effect. These are 0.5s sine wave tones at different frequencies so they're distinguishable during development.

Run:
```bash
cd "apps/web/public" && mkdir -p sounds

# Generate placeholder WAV files using Python (available on macOS)
python3 -c "
import struct, math, os
def make_wav(filename, freq, duration=0.5, volume=0.3):
    sample_rate = 44100
    num_samples = int(sample_rate * duration)
    data = b''
    for i in range(num_samples):
        t = i / sample_rate
        val = int(volume * 32767 * math.sin(2 * math.pi * freq * t))
        data += struct.pack('<h', val)
    header = struct.pack('<4sI4s', b'RIFF', 36 + len(data), b'WAVE')
    fmt = struct.pack('<4sIHHIIHH', b'fmt ', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
    data_header = struct.pack('<4sI', b'data', len(data))
    with open(filename, 'wb') as f:
        f.write(header + fmt + data_header + data)

os.chdir('sounds')
make_wav('ringtone.wav', 440, 2.0)       # A4 - incoming call
make_wav('outgoing-ring.wav', 523, 1.5)  # C5 - outgoing ring
make_wav('call-connect.wav', 660, 0.3)   # E5 - call connected
make_wav('call-end.wav', 330, 0.3)       # E4 - call ended
make_wav('message.wav', 880, 0.15)       # A5 - new message
make_wav('mention.wav', 988, 0.2)        # B5 - mentioned
make_wav('dm.wav', 784, 0.2)             # G5 - DM received
"
```

Expected: 7 `.wav` files in `apps/web/public/sounds/`

### Step 2: Create AudioManager singleton

Create `apps/web/src/lib/audio.ts`:

```typescript
const audioCache = new Map<string, HTMLAudioElement>();

type SoundName =
  | 'ringtone'
  | 'outgoing-ring'
  | 'call-connect'
  | 'call-end'
  | 'message'
  | 'mention'
  | 'dm';

function getAudio(name: SoundName): HTMLAudioElement {
  let el = audioCache.get(name);
  if (!el) {
    el = new Audio(`/sounds/${name}.wav`);
    audioCache.set(name, el);
  }
  return el;
}

/** Play a sound. Looping sounds (ringtone, outgoing-ring) repeat until stopped. */
export function playSound(name: SoundName): void {
  const el = getAudio(name);
  el.loop = name === 'ringtone' || name === 'outgoing-ring';
  el.currentTime = 0;
  el.play().catch(() => {});
}

/** Stop a specific sound. */
export function stopSound(name: SoundName): void {
  const el = audioCache.get(name);
  if (el) {
    el.pause();
    el.currentTime = 0;
    el.loop = false;
  }
}

/** Stop all currently playing sounds. */
export function stopAllSounds(): void {
  for (const el of audioCache.values()) {
    el.pause();
    el.currentTime = 0;
    el.loop = false;
  }
}
```

### Step 3: Verify AudioManager loads without errors

Run:
```bash
cd "apps/web" && npx tsc --noEmit src/lib/audio.ts 2>&1 | head -20
```

Expected: No type errors (or only unrelated errors from other files).

### Step 4: Commit

```bash
git add apps/web/public/sounds/ apps/web/src/lib/audio.ts
git commit -m "feat(call): add AudioManager singleton + placeholder sound assets"
```

---

## Task 2: Database Schema Changes + Migration

**Files:**
- Modify: `packages/db/src/schema/users.ts` (lines 118-139, userSettings table)
- Run: drizzle-kit generate + migrate

**Context:** Add `ringtone` (custom ringtone URL) and `callRingDuration` (timeout in seconds) to userSettings. Also add a `userDndSchedule` table for timezone-aware DND scheduling.

### Step 1: Add columns to userSettings table

In `packages/db/src/schema/users.ts`, add two columns to the `userSettings` table after the existing `allowFriendRequestsFrom` column (line 139):

```typescript
  // Call settings
  ringtone: varchar('ringtone', { length: 255 }),
  callRingDuration: integer('call_ring_duration').notNull().default(30),
```

### Step 2: Add userDndSchedule table

Add after the `userSettings` table definition (after line 140):

```typescript
export const userDndSchedule = pgTable('user_dnd_schedule', {
  userId: bigintString('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  enabled: boolean('enabled').notNull().default(false),
  startTime: varchar('start_time', { length: 5 }).notNull().default('22:00'),
  endTime: varchar('end_time', { length: 5 }).notNull().default('08:00'),
  timezone: varchar('timezone', { length: 64 }).notNull().default('UTC'),
  daysOfWeek: integer('days_of_week').notNull().default(127),
  allowExceptions: jsonb('allow_exceptions').$type<string[]>().default([]),
});
```

### Step 3: Add the new table to schema barrel export

In `packages/db/src/schema/index.ts`, verify that `users.ts` exports are re-exported. The barrel should already re-export everything from `./users`, but if `userDndSchedule` needs explicit export, add it.

### Step 4: Generate and run migration

Run:
```bash
cd "packages/db" && npx drizzle-kit generate && npx drizzle-kit migrate
```

Expected: New migration file created (e.g., `0007_*.sql`) with ALTER TABLE for userSettings + CREATE TABLE for user_dnd_schedule. Migration applies successfully.

### Step 5: Commit

```bash
git add packages/db/src/schema/users.ts packages/db/src/schema/index.ts packages/db/drizzle/ packages/db/src/migrations/
git commit -m "feat(db): add call settings + DND schedule tables (migration 0007)"
```

---

## Task 3: Call UX — Audio + Timeout + Permission Handling

**Files:**
- Modify: `apps/web/src/stores/call.store.ts` (54 lines — add timeout/cancelled states)
- Modify: `apps/web/src/lib/dmCall.ts` (175 lines — add audio, timeouts, error handling)
- Modify: `apps/web/src/providers/SocketProvider.tsx` (152 lines — add audio triggers)

**Depends on:** Task 1 (AudioManager)

### Step 1: Extend OutgoingCall type with timeout/cancelled states

In `apps/web/src/stores/call.store.ts`, update the `OutgoingCall` interface:

```typescript
interface OutgoingCall {
  channelId: string;
  type: CallType;
  status: 'ringing' | 'accepted' | 'declined' | 'timeout' | 'cancelled';
}
```

### Step 2: Wire audio into SocketProvider call event handlers

In `apps/web/src/providers/SocketProvider.tsx`, add import at top:

```typescript
import { playSound, stopSound, stopAllSounds } from '../lib/audio';
```

Then modify the call event handlers:

**CALL_INVITE handler** (around line 99): After setting incomingCall state, add:
```typescript
playSound('ringtone');
```

**CALL_ACCEPT handler** (around line 120): After updating outgoingCall status, add:
```typescript
stopSound('outgoing-ring');
playSound('call-connect');
```

**CALL_DECLINE handler** (around line 129): After updating outgoingCall status, add:
```typescript
stopSound('outgoing-ring');
playSound('call-end');
```

**CALL_CANCEL handler** (around line 138): After clearing incomingCall, add:
```typescript
stopSound('ringtone');
```

### Step 3: Wire audio into dmCall.ts

In `apps/web/src/lib/dmCall.ts`, add import:

```typescript
import { playSound, stopSound, stopAllSounds } from './audio';
```

**In `startOutgoingCall()`** (around line 89): After emitting CALL_INVITE, add:
```typescript
playSound('outgoing-ring');
```

**In `acceptIncomingCall()`** (around line 107): Before calling startDmCall, add:
```typescript
stopSound('ringtone');
playSound('call-connect');
```

**In `declineIncomingCall()`** (around line 114): After clearing incomingCall, add:
```typescript
stopSound('ringtone');
```

**In `endDmCall()`** (around line 120): At the start, add:
```typescript
stopAllSounds();
playSound('call-end');
```

**In `cleanup()`** (around line 160): At the start, add:
```typescript
stopAllSounds();
```

### Step 4: Add call timeout logic

In `apps/web/src/lib/dmCall.ts`, add a module-level timeout variable:

```typescript
let ringTimeout: ReturnType<typeof setTimeout> | null = null;

function clearRingTimeout() {
  if (ringTimeout) {
    clearTimeout(ringTimeout);
    ringTimeout = null;
  }
}
```

**In `startOutgoingCall()`**: After playing outgoing-ring, add timeout:
```typescript
clearRingTimeout();
ringTimeout = setTimeout(() => {
  const state = useCallStore.getState();
  if (state.outgoingCall?.status === 'ringing') {
    stopSound('outgoing-ring');
    playSound('call-end');
    state.setState({
      outgoingCall: { ...state.outgoingCall, status: 'timeout' },
    });
    // Auto-clear after 3s
    setTimeout(() => {
      useCallStore.getState().setState({ outgoingCall: null });
    }, 3000);
  }
}, 60000); // 60s for outgoing
```

**In SocketProvider CALL_INVITE handler**: Add incoming timeout (30s auto-decline):
```typescript
const incomingTimeout = setTimeout(() => {
  const st = useCallStore.getState();
  if (st.incomingCall?.channelId === channelId) {
    stopSound('ringtone');
    st.setState({ incomingCall: null });
    // Auto-decline
    socket.emit('CALL_DECLINE', { channelId, toUserId: fromUserId });
  }
}, 30000);
// Store timeout so we can clear it on manual accept/decline
(window as any).__incomingCallTimeout = incomingTimeout;
```

In CALL_ACCEPT, CALL_DECLINE handlers in SocketProvider: clear the outgoing timeout:
```typescript
clearRingTimeout(); // import from dmCall.ts — need to export it
```

Export `clearRingTimeout` from dmCall.ts.

### Step 5: Add camera/mic permission error handling

In `apps/web/src/lib/dmCall.ts`, in `startDmCall()`, wrap the getUserMedia / track creation in a try-catch with user-friendly error handling:

Find the section where tracks are created (around lines 45-65) and wrap:

```typescript
try {
  // existing track creation code...
} catch (err: any) {
  const msg = err?.name === 'NotAllowedError'
    ? 'Camera/microphone permission denied. Check your browser settings.'
    : err?.name === 'NotFoundError'
    ? 'No camera or microphone found.'
    : `Media error: ${err?.message ?? 'Unknown'}`;
  useCallStore.getState().setState({ status: 'error', error: msg });
  stopAllSounds();
  return;
}
```

### Step 6: Verify TypeScript compiles

Run:
```bash
cd "apps/web" && npx tsc --noEmit 2>&1 | head -30
```

Expected: No new type errors introduced.

### Step 7: Manual test

Start the dev server and test:
1. Open two browser tabs logged in as different users who are DM friends
2. User A calls User B — verify outgoing ring plays for A, ringtone plays for B
3. User B accepts — verify connect sound plays, ringtone/ring stops
4. Either user ends call — verify end sound plays
5. Test timeout: A calls B, B doesn't answer — verify auto-decline after 30s
6. Test permission denial: revoke mic permission in browser, attempt call — verify friendly error

### Step 8: Commit

```bash
git add apps/web/src/stores/call.store.ts apps/web/src/lib/dmCall.ts apps/web/src/providers/SocketProvider.tsx
git commit -m "feat(call): add audio cues, call timeout, and permission error handling"
```

---

## Task 4: Screen Share + Connection Quality + Nameplates

**Files:**
- Modify: `apps/web/src/stores/call.store.ts` (add screenShare and connectionQuality state)
- Modify: `apps/web/src/lib/dmCall.ts` (add toggleScreenShare)
- Modify: `apps/web/src/components/call/DmCallOverlay.tsx` (121 lines — add nameplates, quality dots, screen share button)

**Depends on:** Task 3

### Step 1: Extend call store with screen share and connection quality

In `apps/web/src/stores/call.store.ts`, add to CallState interface:

```typescript
screenShareEnabled: boolean;
localScreenTrack: LocalVideoTrack | null;
connectionQualities: Map<string, string>; // participantId → 'excellent' | 'good' | 'poor' | 'unknown'
```

Add to initial state:
```typescript
screenShareEnabled: false,
localScreenTrack: null,
connectionQualities: new Map(),
```

### Step 2: Add toggleScreenShare to dmCall.ts

In `apps/web/src/lib/dmCall.ts`, add a module-level variable:

```typescript
let localScreenTrack: LocalVideoTrack | null = null;
```

Add the exported function:

```typescript
export async function toggleScreenShare(): Promise<void> {
  const { room, screenShareEnabled } = useCallStore.getState();
  if (!room) return;

  if (screenShareEnabled) {
    if (localScreenTrack) {
      await room.localParticipant.unpublishTrack(localScreenTrack);
      localScreenTrack.stop();
      localScreenTrack = null;
    }
    useCallStore.getState().setState({ screenShareEnabled: false, localScreenTrack: null });
  } else {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      const track = stream.getVideoTracks()[0];
      const lvt = new LocalVideoTrack(track);
      await room.localParticipant.publishTrack(lvt, { source: Track.Source.ScreenShare });
      localScreenTrack = lvt;
      useCallStore.getState().setState({ screenShareEnabled: true, localScreenTrack: lvt });

      // Handle user stopping share via browser UI
      track.onended = () => {
        toggleScreenShare();
      };
    } catch {
      // User cancelled the screen share picker — do nothing
    }
  }
}
```

Update `cleanup()` to also clean up screen track:
```typescript
if (localScreenTrack) {
  localScreenTrack.stop();
  localScreenTrack = null;
}
```

### Step 3: Add connection quality tracking to DmCallOverlay

In `apps/web/src/components/call/DmCallOverlay.tsx`, subscribe to LiveKit's ConnectionQualityChanged event.

Inside the `useEffect` that sets up room event listeners (around line 20), add:

```typescript
import { ConnectionQuality, RoomEvent } from 'livekit-client';

// Inside the useEffect:
const onQuality = (quality: ConnectionQuality, participant: any) => {
  const label =
    quality === ConnectionQuality.Excellent ? 'excellent'
    : quality === ConnectionQuality.Good ? 'good'
    : quality === ConnectionQuality.Poor ? 'poor'
    : 'unknown';
  useCallStore.getState().setState((prev) => {
    const q = new Map(prev.connectionQualities);
    q.set(participant.identity, label);
    return { connectionQualities: q };
  });
};
room.on(RoomEvent.ConnectionQualityChanged, onQuality);
// In cleanup: room.off(RoomEvent.ConnectionQualityChanged, onQuality);
```

### Step 4: Add participant nameplates to video tiles

In `DmCallOverlay.tsx`, modify the `RemoteVideoTile` component (around line 92) to show a nameplate overlay:

```tsx
function RemoteVideoTile({ track, identity }: { track: any; identity: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  const quality = useCallStore((s) => s.connectionQualities.get(identity) ?? 'unknown');

  useEffect(() => {
    if (ref.current) track.attach(ref.current);
    return () => { track.detach(); };
  }, [track]);

  const qualityColor =
    quality === 'excellent' ? '#4ade80'
    : quality === 'good' ? '#facc15'
    : quality === 'poor' ? '#ef4444'
    : '#888';

  return (
    <div className="video-tile">
      <video ref={ref} autoPlay playsInline />
      <div className="video-nameplate">
        <span className="quality-dot" style={{ backgroundColor: qualityColor }} />
        <span>{identity}</span>
      </div>
    </div>
  );
}
```

### Step 5: Add screen share button to call controls

In `DmCallOverlay.tsx`, in the controls section (around line 78), add a screen share toggle button between video and end-call buttons:

```tsx
<button
  className={`call-control-btn ${screenShareEnabled ? 'active' : ''}`}
  onClick={toggleScreenShare}
  title={screenShareEnabled ? 'Stop sharing' : 'Share screen'}
>
  {/* Screen share icon SVG */}
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
</button>
```

Import `toggleScreenShare` from `../lib/dmCall`.

### Step 6: Add CSS for nameplates and quality dots

In `apps/web/src/styles.css`, add:

```css
.video-tile {
  position: relative;
  border-radius: 8px;
  overflow: hidden;
}

.video-nameplate {
  position: absolute;
  bottom: 8px;
  left: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 8px;
  background: rgba(0, 0, 0, 0.6);
  border-radius: 4px;
  font-size: 13px;
  color: #fff;
}

.quality-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
```

### Step 7: Verify TypeScript compiles

Run:
```bash
cd "apps/web" && npx tsc --noEmit 2>&1 | head -30
```

### Step 8: Manual test

1. Start a DM call between two users
2. Click screen share button — verify browser picker appears
3. Select a screen/window — verify it appears in the other user's view
4. Stop sharing via overlay button — verify share stops
5. Stop sharing via browser's "Stop sharing" banner — verify state syncs
6. Check connection quality dots appear on video tiles (green/yellow/red)

### Step 9: Commit

```bash
git add apps/web/src/stores/call.store.ts apps/web/src/lib/dmCall.ts apps/web/src/components/call/DmCallOverlay.tsx apps/web/src/styles.css
git commit -m "feat(call): add screen share, connection quality indicators, and participant nameplates"
```

---

## Task 5: DM Info Panel + Picture-in-Picture

**Files:**
- Create: `apps/web/src/components/messages/DmInfoPanel.tsx`
- Modify: `apps/web/src/stores/ui.store.ts` (39 lines — add dmInfoPanelOpen)
- Modify: `apps/web/src/components/layout/TopBar.tsx` (104 lines — wire info button)
- Modify: `apps/web/src/layouts/AppLayout.tsx` (render DmInfoPanel)
- Modify: `apps/web/src/components/call/DmCallOverlay.tsx` (add PiP button)
- Modify: `apps/web/src/styles.css`

**Depends on:** Task 4

### Step 1: Add dmInfoPanelOpen to UI store

In `apps/web/src/stores/ui.store.ts`, add to the UiState interface:

```typescript
dmInfoPanelOpen: boolean;
toggleDmInfoPanel: () => void;
```

Add to the store creation:
```typescript
dmInfoPanelOpen: false,
toggleDmInfoPanel: () => set((s) => ({ dmInfoPanelOpen: !s.dmInfoPanelOpen })),
```

### Step 2: Create DmInfoPanel component

Create `apps/web/src/components/messages/DmInfoPanel.tsx`:

```tsx
import { useParams } from 'react-router-dom';
import { Avatar } from '../ui/Avatar';
import { useUiStore } from '../../stores/ui.store';

interface DmRecipient {
  id: string;
  username: string;
  displayName: string;
  avatarHash: string | null;
  bio?: string | null;
}

export function DmInfoPanel({ recipient }: { recipient: DmRecipient | null }) {
  const open = useUiStore((s) => s.dmInfoPanelOpen);
  if (!open || !recipient) return null;

  return (
    <aside className="dm-info-panel">
      <div className="dm-info-header">
        <Avatar
          src={recipient.avatarHash ? `/api/v1/files/${recipient.avatarHash}` : null}
          fallback={recipient.displayName}
          size={80}
        />
        <h3>{recipient.displayName}</h3>
        <span className="dm-info-username">@{recipient.username}</span>
      </div>
      {recipient.bio && (
        <div className="dm-info-section">
          <h4>About Me</h4>
          <p>{recipient.bio}</p>
        </div>
      )}
      <div className="dm-info-section">
        <h4>Member Since</h4>
        <p>—</p>
      </div>
    </aside>
  );
}
```

### Step 3: Wire TopBar info button

In `apps/web/src/components/layout/TopBar.tsx`, find the disabled DM info button (around line 76-82). Enable it and wire to the ui store:

```tsx
import { useUiStore } from '../../stores/ui.store';

// Inside the component:
const toggleDmInfo = useUiStore((s) => s.toggleDmInfoPanel);

// Replace the disabled info button:
<button className="topbar-btn" onClick={toggleDmInfo} title="User Info">
  {/* existing info icon SVG */}
</button>
```

### Step 4: Render DmInfoPanel in AppLayout

In `apps/web/src/layouts/AppLayout.tsx`, import and render `DmInfoPanel` conditionally when on a DM route. Pass the recipient info (which should be available from the DM channel data or a separate query).

### Step 5: Add PiP button to DmCallOverlay

In `apps/web/src/components/call/DmCallOverlay.tsx`, add a PiP toggle button:

```tsx
async function togglePiP(videoEl: HTMLVideoElement | null) {
  if (!videoEl) return;
  try {
    if (document.pictureInPictureElement) {
      await document.exitPictureInPicture();
    } else {
      await videoEl.requestPictureInPicture();
    }
  } catch {
    // PiP not supported or denied
  }
}
```

Add a button in the controls bar:
```tsx
<button className="call-control-btn" onClick={() => togglePiP(remoteVideoRef.current)} title="Picture-in-Picture">
  <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <rect x="11" y="9" width="9" height="6" rx="1" fill="currentColor" opacity="0.3" />
  </svg>
</button>
```

### Step 6: Add CSS for DmInfoPanel

In `apps/web/src/styles.css`:

```css
.dm-info-panel {
  width: 340px;
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  padding: 24px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.dm-info-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border);
}

.dm-info-header h3 {
  font-size: 20px;
  font-weight: 600;
  margin: 0;
}

.dm-info-username {
  color: var(--text-muted);
  font-size: 14px;
}

.dm-info-section h4 {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--text-muted);
  margin: 0 0 8px;
}

.dm-info-section p {
  font-size: 14px;
  margin: 0;
  color: var(--text-primary);
}
```

### Step 7: Commit

```bash
git add apps/web/src/components/messages/DmInfoPanel.tsx apps/web/src/stores/ui.store.ts apps/web/src/components/layout/TopBar.tsx apps/web/src/layouts/AppLayout.tsx apps/web/src/components/call/DmCallOverlay.tsx apps/web/src/styles.css
git commit -m "feat(call): add DM info panel and Picture-in-Picture support"
```

---

## Task 6: Do Not Disturb System

**Files:**
- Create: `apps/api/src/modules/users/dnd.service.ts`
- Modify: `apps/api/src/modules/users/users.router.ts` (add DND endpoints)
- Modify: `apps/api/src/modules/gateway/gateway.ts` (451 lines — check DND before CALL_INVITE)
- Modify: `apps/web/src/lib/api.ts` (499 lines — add DND API methods)
- Modify: `apps/web/src/components/sidebar/UserBar.tsx` (124 lines — add DND toggle)
- Modify: `apps/web/src/styles.css`

**Depends on:** Task 2 (userDndSchedule table)

### Step 1: Create DND service

Create `apps/api/src/modules/users/dnd.service.ts`:

```typescript
import { eq } from 'drizzle-orm';
import type { AppContext } from '../../lib/context';
import { userDndSchedule } from '@gratonite/db';

export function createDndService(ctx: AppContext) {
  async function getSchedule(userId: string) {
    const [row] = await ctx.db
      .select()
      .from(userDndSchedule)
      .where(eq(userDndSchedule.userId, userId))
      .limit(1);
    return row ?? null;
  }

  async function updateSchedule(userId: string, data: {
    enabled?: boolean;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    daysOfWeek?: number;
    allowExceptions?: string[];
  }) {
    const existing = await getSchedule(userId);
    if (existing) {
      await ctx.db
        .update(userDndSchedule)
        .set(data)
        .where(eq(userDndSchedule.userId, userId));
    } else {
      await ctx.db.insert(userDndSchedule).values({ userId, ...data });
    }
    return getSchedule(userId);
  }

  function isDndActive(schedule: typeof userDndSchedule.$inferSelect | null): boolean {
    if (!schedule || !schedule.enabled) return false;

    const now = new Date();
    // Get current time in user's timezone
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: schedule.timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      weekday: 'short',
    });
    const parts = formatter.formatToParts(now);
    const hour = parts.find((p) => p.type === 'hour')?.value ?? '00';
    const minute = parts.find((p) => p.type === 'minute')?.value ?? '00';
    const currentTime = `${hour}:${minute}`;

    // Check day of week (bitmask: bit 0=Sun, bit 1=Mon, ..., bit 6=Sat)
    const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
    const weekday = parts.find((p) => p.type === 'weekday')?.value ?? 'Sun';
    const dayBit = 1 << (dayMap[weekday] ?? 0);
    if (!(schedule.daysOfWeek & dayBit)) return false;

    // Check time range (handles overnight ranges like 22:00-08:00)
    const start = schedule.startTime;
    const end = schedule.endTime;
    if (start <= end) {
      return currentTime >= start && currentTime < end;
    } else {
      return currentTime >= start || currentTime < end;
    }
  }

  return { getSchedule, updateSchedule, isDndActive };
}
```

### Step 2: Add DND endpoints to users router

In `apps/api/src/modules/users/users.router.ts`, add two endpoints:

```typescript
// GET /users/@me/dnd-schedule
router.get('/@me/dnd-schedule', requireAuth, async (req, res) => {
  const dndService = createDndService(ctx);
  const schedule = await dndService.getSchedule(req.user!.id);
  res.json(schedule ?? { enabled: false, startTime: '22:00', endTime: '08:00', timezone: 'UTC', daysOfWeek: 127, allowExceptions: [] });
});

// PATCH /users/@me/dnd-schedule
router.patch('/@me/dnd-schedule', requireAuth, async (req, res) => {
  const dndService = createDndService(ctx);
  const result = await dndService.updateSchedule(req.user!.id, req.body);
  res.json(result);
});
```

Import `createDndService` at the top. Add the necessary import for `userDndSchedule` from `@gratonite/db`.

### Step 3: Check DND in gateway before CALL_INVITE

In `apps/api/src/modules/gateway/gateway.ts`, in the CALL_INVITE handler (around line 288), before emitting to recipients, check if each recipient has DND active:

```typescript
import { createDndService } from '../users/dnd.service';

// Inside CALL_INVITE handler, before the emit loop:
const dndService = createDndService(ctx);

// For each recipient:
for (const recipientId of recipientIds) {
  const schedule = await dndService.getSchedule(recipientId);
  if (dndService.isDndActive(schedule)) {
    // Check if caller is in exceptions list
    const isException = schedule?.allowExceptions?.includes(socket.data.userId);
    if (!isException) {
      // Auto-decline silently
      socket.emit('CALL_DECLINE', { channelId, fromUserId: recipientId, reason: 'dnd' });
      continue;
    }
  }
  ctx.io.to(`user:${recipientId}`).emit('CALL_INVITE', payload);
}
```

### Step 4: Add DND API methods to web client

In `apps/web/src/lib/api.ts`, add to the users section (around line 265):

```typescript
getDndSchedule: () =>
  apiFetch<{
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
    daysOfWeek: number;
    allowExceptions: string[];
  }>('/users/@me/dnd-schedule'),

updateDndSchedule: (data: Record<string, unknown>) =>
  apiFetch<any>('/users/@me/dnd-schedule', {
    method: 'PATCH',
    body: JSON.stringify(data),
  }),
```

### Step 5: Add DND quick-toggle to UserBar

In `apps/web/src/components/sidebar/UserBar.tsx`, add a DND toggle button to the user menu (around line 81, in the menu items):

```tsx
import { api } from '../../lib/api';
import { useState, useEffect } from 'react';

// Inside the component:
const [dndEnabled, setDndEnabled] = useState(false);

useEffect(() => {
  api.users.getDndSchedule().then((s) => setDndEnabled(s.enabled)).catch(() => {});
}, []);

const toggleDnd = async () => {
  const next = !dndEnabled;
  setDndEnabled(next);
  await api.users.updateDndSchedule({ enabled: next });
};

// In the menu JSX, add before "Log Out":
<button className="user-menu-item" onClick={toggleDnd}>
  <span className={`dnd-dot ${dndEnabled ? 'active' : ''}`} />
  {dndEnabled ? 'Disable Do Not Disturb' : 'Enable Do Not Disturb'}
</button>
```

### Step 6: Add DND CSS

In `apps/web/src/styles.css`:

```css
.dnd-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-muted);
  display: inline-block;
}

.dnd-dot.active {
  background: #ef4444;
}
```

### Step 7: Suppress notification sounds when DND active

In `apps/web/src/providers/SocketProvider.tsx`, in the MESSAGE_CREATE handler, check DND state before playing sounds:

```typescript
// Only play message/mention/dm sounds if DND is not active
// (DND state can be read from a simple module-level flag set by UserBar)
```

This is best done by exporting a `isDndEnabled()` getter from a small module or checking the UserBar's state.

### Step 8: Commit

```bash
git add apps/api/src/modules/users/dnd.service.ts apps/api/src/modules/users/users.router.ts apps/api/src/modules/gateway/gateway.ts apps/web/src/lib/api.ts apps/web/src/components/sidebar/UserBar.tsx apps/web/src/providers/SocketProvider.tsx apps/web/src/styles.css
git commit -m "feat(dnd): add Do Not Disturb system with schedule, gateway enforcement, and quick-toggle"
```

---

## Task 7: Desktop Polish — Notification Sounds + Click-to-Navigate

**Files:**
- Modify: `apps/web/src/providers/SocketProvider.tsx` (add notification sounds for messages)
- Modify: `apps/desktop/src/main.js` (302 lines — add click-to-navigate route in notifications)
- Modify: `apps/desktop/src/preload.js` (17 lines — add onNavigate listener)
- Modify: `apps/web/src/App.tsx` (add desktop navigate listener)
- Modify: `apps/desktop/package.json` (49 lines — add GitHub Releases publish config)

**Depends on:** Task 1 (AudioManager)

### Step 1: Add message notification sounds in SocketProvider

In `apps/web/src/providers/SocketProvider.tsx`, in the MESSAGE_CREATE handler (around line 33), after adding the message to the store, play notification sounds:

```typescript
import { playSound } from '../lib/audio';

// Inside MESSAGE_CREATE handler, after addMessage:
if (msg.authorId !== authUser?.id) {
  const isDm = !msg.guildId; // DM messages don't have guildId
  const isMention = msg.mentions?.includes(authUser?.id ?? '');

  if (isMention) {
    playSound('mention');
  } else if (isDm) {
    playSound('dm');
  } else {
    playSound('message');
  }
}
```

### Step 2: Add route info to desktop notifications

In `apps/desktop/src/main.js`, modify the notification handler (around line 208) to accept a `route` field and navigate on click:

```javascript
ipcMain.handle('gratonite:notify', (_event, payload) => {
  if (!payload || !payload.title) return;
  try {
    const notification = new Notification({
      title: payload.title,
      body: payload.body ?? '',
    });
    notification.on('click', () => {
      if (payload.route && mainWindow) {
        mainWindow.webContents.send('gratonite:navigate', payload.route);
        mainWindow.show();
        mainWindow.focus();
      }
    });
    notification.show();
  } catch (err) {
    log.error('[Notify] failed', err);
  }
});
```

### Step 3: Add onNavigate to preload bridge

In `apps/desktop/src/preload.js`, add to the `window.gratonite` object:

```javascript
onNavigate: (callback) => {
  const handler = (_event, route) => callback(route);
  ipcRenderer.on('gratonite:navigate', handler);
  return () => ipcRenderer.removeListener('gratonite:navigate', handler);
},
```

### Step 4: Wire App.tsx to listen for desktop navigation

In `apps/web/src/App.tsx`, add a useEffect that listens for desktop navigation:

```tsx
import { useNavigate } from 'react-router-dom';

// Inside the App component:
const navigate = useNavigate();

useEffect(() => {
  const desktop = (window as any).gratonite;
  if (desktop?.onNavigate) {
    const cleanup = desktop.onNavigate((route: string) => {
      navigate(route);
    });
    return cleanup;
  }
}, [navigate]);
```

### Step 5: Add GitHub Releases publish config to desktop package.json

In `apps/desktop/package.json`, add to the `build` object:

```json
"publish": {
  "provider": "github",
  "owner": "gratonitechat",
  "repo": "for-desktop"
}
```

### Step 6: Update desktop notification calls to include route

In `apps/web/src/lib/desktop.ts` (or wherever `notifyDesktop` is defined), ensure the notification payload includes a `route` field:

```typescript
export function notifyDesktop(title: string, body: string, route?: string) {
  const desktop = (window as any).gratonite;
  if (desktop?.notify) {
    desktop.notify({ title, body, route });
  }
}
```

### Step 7: Commit

```bash
git add apps/web/src/providers/SocketProvider.tsx apps/desktop/src/main.js apps/desktop/src/preload.js apps/web/src/App.tsx apps/desktop/package.json apps/web/src/lib/desktop.ts
git commit -m "feat(desktop): add notification sounds, click-to-navigate, and GitHub Releases publish config"
```

---

## Task 8: Backend Permission Refactor

**Files:**
- Modify: `apps/api/src/modules/guilds/guilds.service.ts` (add getMemberPermissions helper)
- Modify: `apps/api/src/modules/voice/voice.router.ts` (528 lines — replace owner-only checks)

**Independent — can be done anytime**

### Step 1: Add getMemberPermissions helper

In `apps/api/src/modules/guilds/guilds.service.ts`, add a new method to the guild service:

```typescript
async function getMemberPermissions(guildId: string, userId: string): Promise<bigint> {
  // Check if user is owner
  const [guild] = await ctx.db
    .select({ ownerId: guilds.ownerId })
    .from(guilds)
    .where(eq(guilds.id, guildId))
    .limit(1);
  if (!guild) return 0n;
  if (guild.ownerId === userId) return ~0n; // Owner has all permissions

  // Get member's roles
  const memberRoles = await getMemberRoles(guildId, userId);
  if (!memberRoles.length) return 0n;

  // Combine all role permissions
  let perms = 0n;
  for (const role of memberRoles) {
    perms |= BigInt(role.permissions);
  }
  return perms;
}
```

Export it from the service factory return object.

### Step 2: Replace owner-only voice mod checks

In `apps/api/src/modules/voice/voice.router.ts`, find the mod action endpoint (PATCH `/guilds/:guildId/voice-states/:userId`, around line 186). Replace the owner-only check:

Before:
```typescript
if (guild.ownerId !== userId) return res.status(403).json({ code: 'FORBIDDEN' });
```

After:
```typescript
import { hasPermission, PermissionFlags } from '@gratonite/types';

const perms = await guildsService.getMemberPermissions(guildId, userId);
const canModVoice = hasPermission(perms, PermissionFlags.MUTE_MEMBERS)
  || hasPermission(perms, PermissionFlags.DEAFEN_MEMBERS)
  || hasPermission(perms, PermissionFlags.MOVE_MEMBERS);
if (!canModVoice) return res.status(403).json({ code: 'MISSING_PERMISSIONS' });
```

Do the same for any other owner-only checks in voice.router.ts related to moderation actions (stage speaker approve/revoke around lines 385, 415).

### Step 3: Verify the refactored endpoints work

Manual test:
1. Create a guild with User A (owner)
2. Create a role with MUTE_MEMBERS permission
3. Assign that role to User B
4. User B should now be able to server-mute User C in voice
5. User C (no special perms) should get 403 trying to mute others

### Step 4: Commit

```bash
git add apps/api/src/modules/guilds/guilds.service.ts apps/api/src/modules/voice/voice.router.ts
git commit -m "refactor(perms): replace owner-only voice mod checks with proper permission resolution"
```

---

## Summary

| Task | Description | Depends On | Est. Complexity |
|------|-------------|-----------|-----------------|
| 1 | AudioManager + sound assets | — | Small |
| 2 | DB schema (call settings + DND table) | — | Small |
| 3 | Call audio + timeout + permission errors | 1 | Medium |
| 4 | Screen share + quality + nameplates | 3 | Medium |
| 5 | DM info panel + PiP | 4 | Small |
| 6 | DND system (backend + frontend) | 2 | Medium |
| 7 | Desktop notification sounds + navigate | 1 | Small |
| 8 | Backend permission refactor | — | Small |

**Parallelization:** Tasks 1 & 2 in parallel. Then 3. Then 4. Then 5 & 6 in parallel. Task 7 anytime after 1. Task 8 anytime.

**Total commits:** 8 (one per task)
