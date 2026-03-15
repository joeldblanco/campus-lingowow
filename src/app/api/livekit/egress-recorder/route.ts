import { NextRequest, NextResponse } from 'next/server'

// Route handler for egress v1.8.4 which navigates to customBaseUrl?token=...&url=...
// (without appending /{roomName} to the path). Extracts room name from the JWT token.
// The [roomName]/route.ts handler is kept for backward compatibility.

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url') || ''
  const token = request.nextUrl.searchParams.get('token') || ''

  // Extract room name from JWT token payload (no verification needed, just reading claims)
  let roomName = 'recording'
  try {
    const parts = token.split('.')
    if (parts.length >= 2) {
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString())
      roomName = payload.video?.room || payload.sub || 'recording'
    }
  } catch {
    // fallback
  }

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recording - ${roomName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #111827; color: white; font-family: sans-serif; overflow: hidden; }
    #container { width: 100vw; height: 100vh; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: 8px; padding: 8px; }
    .participant { position: relative; background: #1f2937; border-radius: 8px; overflow: hidden; display: flex; align-items: center; justify-content: center; }
    .participant video { width: 100%; height: 100%; object-fit: cover; }
    .participant .name { position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.6); padding: 2px 8px; border-radius: 4px; font-size: 12px; }
    .participant .muted-indicator { position: absolute; top: 8px; right: 8px; background: rgba(220,38,38,0.8); padding: 2px 6px; border-radius: 4px; font-size: 10px; }
    #screenshare { position: absolute; top: 0; left: 0; width: 100vw; height: 100vh; z-index: 10; background: #111827; }
    #screenshare video { width: 100%; height: 100%; object-fit: contain; }
    .hidden { display: none !important; }
    /* Layout: 1 participant = full screen, 2 = side by side, 3-4 = 2x2 grid, etc */
  </style>
</head>
<body>
  <!-- CRITICAL: Emit START_RECORDING repeatedly until the egress chromedp listener captures it -->
  <script>
    console.log('START_RECORDING');
    var _sr = setInterval(function(){ console.log('START_RECORDING'); }, 100);
    setTimeout(function(){ clearInterval(_sr); }, 15000);
  </script>

  <div id="screenshare" class="hidden">
    <video id="screenshare-video" autoplay playsinline></video>
  </div>
  <div id="container"></div>

  <script type="module">
    import {
      Room,
      RoomEvent,
      Track,
      RemoteParticipant,
      ConnectionState,
    } from 'https://cdn.jsdelivr.net/npm/livekit-client@2.16.1/dist/livekit-client.esm.mjs';

    const serverUrl = ${JSON.stringify(url)};
    const token = ${JSON.stringify(token)};
    const roomName = ${JSON.stringify(roomName)};
    const container = document.getElementById('container');
    const screenshareEl = document.getElementById('screenshare');
    const screenshareVideo = document.getElementById('screenshare-video');

    const participants = new Map();
    // Track currently attached elements to properly detach before re-render
    const attachedElements = new Map(); // identity -> { videoEl, audioEl }
    let currentScreenShareTrack = null;
    let currentScreenShareAudioTrack = null;

    function detachAll() {
      attachedElements.forEach((els) => {
        if (els.videoTrack) els.videoTrack.detach();
        if (els.audioTrack) els.audioTrack.detach();
      });
      attachedElements.clear();
    }

    function hideScreenShare() {
      if (currentScreenShareTrack) {
        currentScreenShareTrack.detach();
        currentScreenShareTrack = null;
      }
      if (currentScreenShareAudioTrack) {
        currentScreenShareAudioTrack.detach();
        currentScreenShareAudioTrack = null;
      }
      screenshareVideo.srcObject = null;
      const audioEl = screenshareEl.querySelector('audio');
      if (audioEl) audioEl.srcObject = null;
      screenshareEl.classList.add('hidden');
    }

    function updateLayout() {
      // Detach all tracks from old DOM elements before rebuilding
      detachAll();
      container.innerHTML = '';

      const count = participants.size;
      if (count === 0) return;

      // Calculate grid dimensions
      let cols, rows;
      if (count === 1) { cols = 1; rows = 1; }
      else if (count === 2) { cols = 2; rows = 1; }
      else if (count <= 4) { cols = 2; rows = 2; }
      else if (count <= 6) { cols = 3; rows = 2; }
      else { cols = 3; rows = 3; }

      const w = (100 / cols);
      const h = (100 / rows);

      participants.forEach((info, identity) => {
        const div = document.createElement('div');
        div.className = 'participant';
        div.style.width = 'calc(' + w + '% - 8px)';
        div.style.height = 'calc(' + h + '% - 8px)';

        const tracked = { videoTrack: null, audioTrack: null };

        if (info.videoTrack) {
          const video = document.createElement('video');
          video.autoplay = true;
          video.playsInline = true;
          video.muted = true;
          info.videoTrack.attach(video);
          tracked.videoTrack = info.videoTrack;
          div.appendChild(video);
        }

        if (info.audioTrack) {
          const audio = document.createElement('audio');
          audio.autoplay = true;
          info.audioTrack.attach(audio);
          tracked.audioTrack = info.audioTrack;
          div.appendChild(audio);
        }

        attachedElements.set(identity, tracked);

        const nameLabel = document.createElement('div');
        nameLabel.className = 'name';
        nameLabel.textContent = info.name || identity;
        div.appendChild(nameLabel);

        if (info.isMuted) {
          const mutedLabel = document.createElement('div');
          mutedLabel.className = 'muted-indicator';
          mutedLabel.textContent = 'MUTED';
          div.appendChild(mutedLabel);
        }

        container.appendChild(div);
      });
    }

    function updateParticipant(participant) {
      let videoTrack = null;
      let audioTrack = null;
      let screenShareTrack = null;
      let screenShareAudioTrack = null;
      let isMuted = true;

      participant.trackPublications.forEach((pub) => {
        if (!pub.track) return;
        if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.Camera) {
          videoTrack = pub.track;
        } else if (pub.track.kind === Track.Kind.Audio && pub.source === Track.Source.Microphone) {
          audioTrack = pub.track;
          isMuted = pub.isMuted;
        } else if (pub.track.kind === Track.Kind.Video && pub.source === Track.Source.ScreenShare) {
          screenShareTrack = pub.track;
        } else if (pub.track.kind === Track.Kind.Audio && pub.source === Track.Source.ScreenShareAudio) {
          screenShareAudioTrack = pub.track;
        }
      });

      // Handle screen share — show or hide
      if (screenShareTrack) {
        // Only re-attach if it's a new track
        if (currentScreenShareTrack !== screenShareTrack) {
          if (currentScreenShareTrack) currentScreenShareTrack.detach();
          currentScreenShareTrack = screenShareTrack;
          screenShareTrack.attach(screenshareVideo);
        }
        if (screenShareAudioTrack && currentScreenShareAudioTrack !== screenShareAudioTrack) {
          if (currentScreenShareAudioTrack) currentScreenShareAudioTrack.detach();
          currentScreenShareAudioTrack = screenShareAudioTrack;
          let audioEl = screenshareEl.querySelector('audio');
          if (!audioEl) {
            audioEl = document.createElement('audio');
            audioEl.autoplay = true;
            screenshareEl.appendChild(audioEl);
          }
          screenShareAudioTrack.attach(audioEl);
        }
        screenshareEl.classList.remove('hidden');
      } else if (currentScreenShareTrack) {
        // This participant no longer has screen share — hide if no one else is sharing
        hideScreenShare();
      }

      let name = participant.name || participant.identity;
      try {
        if (participant.metadata) {
          const meta = JSON.parse(participant.metadata);
          if (meta.isModerator) name = name + ' (Teacher)';
        }
      } catch {}

      participants.set(participant.identity, {
        name,
        videoTrack,
        audioTrack,
        isMuted,
      });

      updateLayout();
    }

    function removeParticipant(participant) {
      participants.delete(participant.identity);
      updateLayout();
    }

    async function main() {
      if (!serverUrl || !token) {
        console.error('[Recording] Missing url or token params');
        return;
      }

      try {
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        room.on(RoomEvent.TrackSubscribed, (track, publication, participant) => {
          updateParticipant(participant);
        });

        room.on(RoomEvent.TrackUnsubscribed, (track, publication, participant) => {
          if (publication.source === Track.Source.ScreenShare) {
            hideScreenShare();
          }
          updateParticipant(participant);
        });

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          updateParticipant(participant);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          removeParticipant(participant);
        });

        room.on(RoomEvent.TrackMuted, (pub, participant) => {
          if (participant instanceof RemoteParticipant) {
            updateParticipant(participant);
          }
        });

        room.on(RoomEvent.TrackUnmuted, (pub, participant) => {
          if (participant instanceof RemoteParticipant) {
            updateParticipant(participant);
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          console.log('END_RECORDING');
        });

        await room.connect(serverUrl, token);
        console.log('[Recording] Connected to room:', roomName);

        // Sync existing participants
        room.remoteParticipants.forEach(p => updateParticipant(p));

      } catch (e) {
        console.error('[Recording] Connect Exception:', e);
      }
    }

    main();
  </script>
</body>
</html>`

  return new NextResponse(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}
