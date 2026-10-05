import { db } from '@/lib/db'

interface BuildEgressRecorderHtmlParams {
  roomName: string
  url: string
  token: string
}

function escapeForInlineScript(value: unknown) {
  return JSON.stringify(value)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029')
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

async function resolveBookingId(roomName: string) {
  if (roomName.startsWith('class-') && roomName.length > 'class-'.length) {
    return roomName.slice('class-'.length)
  }

  const recording = await db.classRecording.findFirst({
    where: { roomName },
    orderBy: { createdAt: 'desc' },
    select: { bookingId: true },
  })

  if (recording?.bookingId) {
    return recording.bookingId
  }

  const videoCall = await db.videoCall.findFirst({
    where: { roomId: roomName },
    select: { bookingId: true },
  })

  return videoCall?.bookingId ?? null
}

async function getInitialWhiteboardElements(roomName: string) {
  const bookingId = await resolveBookingId(roomName)
  if (!bookingId) {
    return []
  }

  const booking = await db.classBooking.findUnique({
    where: { id: bookingId },
    select: {
      whiteboardData: {
        select: {
          data: true,
        },
      },
    },
  })

  return Array.isArray(booking?.whiteboardData?.data) ? booking.whiteboardData.data : []
}

export async function buildEgressRecorderHtml({
  roomName,
  url,
  token,
}: BuildEgressRecorderHtmlParams) {
  const initialWhiteboardElements = await getInitialWhiteboardElements(roomName)

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Recording - ${escapeHtml(roomName)}</title>
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
    #whiteboard { position: absolute; inset: 0; z-index: 9; background: #dbeafe; padding: 12px; }
    #whiteboard-stage { width: 100%; height: 100%; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 12px 40px rgba(15,23,42,0.18); }
    #whiteboard-canvas { width: 100%; height: 100%; }
    #whiteboard-canvas svg { width: 100%; height: 100%; display: block; }
    .whiteboard-empty { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #94a3b8; font-size: 24px; font-weight: 600; }
    .whiteboard-error { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #b91c1c; font-size: 20px; font-weight: 600; background: #fee2e2; }
    #lesson { position: absolute; inset: 0; z-index: 8; background: #f8fafc; color: #0f172a; padding: 18px; overflow: hidden; }
    #lesson-stage { width: 100%; height: 100%; margin: 0 auto; overflow: hidden; background: #ffffff; border-radius: 12px; box-shadow: 0 12px 40px rgba(15,23,42,0.12); }
    #lesson-frame { width: 100%; height: 100%; border: 0; display: block; background: #ffffff; }
    .hidden { display: none !important; }
  </style>
</head>
<body>
  <script>
    // The LiveKit egress headless browser begins encoding when it sees the
    // START_RECORDING line. Emit it a handful of times spaced out enough to be
    // seen on first paint without flooding the egress log.
    console.log('START_RECORDING');
    setTimeout(function(){ console.log('START_RECORDING'); }, 250);
    setTimeout(function(){ console.log('START_RECORDING'); }, 750);
    setTimeout(function(){ console.log('START_RECORDING'); }, 1500);
    setTimeout(function(){ console.log('START_RECORDING'); }, 3000);
  </script>

  <div id="lesson" class="hidden">
    <div id="lesson-stage">
      <iframe id="lesson-frame" title="Contenido de la lección" src="/record/${encodeURIComponent(roomName)}/lesson"></iframe>
    </div>
  </div>

  <div id="whiteboard" class="hidden">
    <div id="whiteboard-stage">
      <div id="whiteboard-canvas"></div>
    </div>
  </div>

  <div id="screenshare" class="hidden">
    <video id="screenshare-video" autoplay playsinline></video>
  </div>

  <div id="container"></div>

  <script type="module">
    import {
      Room,
      RoomEvent,
      Track,
      RemoteParticipant
    } from 'https://cdn.jsdelivr.net/npm/livekit-client@2.16.1/dist/livekit-client.esm.mjs';

    const serverUrl = ${escapeForInlineScript(url)};
    const token = ${escapeForInlineScript(token)};
    const roomName = ${escapeForInlineScript(roomName)};
    const initialWhiteboardElements = ${escapeForInlineScript(initialWhiteboardElements)};

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const container = document.getElementById('container');
    const screenshareEl = document.getElementById('screenshare');
    const screenshareVideo = document.getElementById('screenshare-video');
    const lessonEl = document.getElementById('lesson');
    const lessonFrame = document.getElementById('lesson-frame');
    const whiteboardEl = document.getElementById('whiteboard');
    const whiteboardCanvas = document.getElementById('whiteboard-canvas');

    const participants = new Map();
    const attachedElements = new Map();
    let currentScreenShareTrack = null;
    let currentScreenShareAudioTrack = null;
    let currentWhiteboardElements = Array.isArray(initialWhiteboardElements) ? initialWhiteboardElements : [];
    let activeTab = 'lesson';
    let lastNonScreenTab = 'lesson';
    let whiteboardRenderTimeout = null;
    let whiteboardRenderVersion = 0;
    let exportToSvgFn = null;
    let activeLesson = null;
    let lessonRequested = false;
    let lessonFrameReady = false;
    let lessonMessageVersion = 0;
    let lessonScrollProgress = null;
    const lessonBlockNavigation = new Map();
    const lessonMediaState = new Map();

    function sendCommand(room, name, values) {
      const data = encoder.encode(JSON.stringify({ command: name, values }));
      room.localParticipant.publishData(data, { reliable: true });
    }

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

    function syncContentVisibility() {
      sendLessonFrameMessage({ type: 'set-visible', visible: activeTab === 'lesson' });
      if (activeTab === 'whiteboard') {
        whiteboardEl.classList.remove('hidden');
      } else {
        whiteboardEl.classList.add('hidden');
      }

      if (activeTab === 'lesson' && (lessonRequested || activeLesson)) {
        lessonEl.classList.remove('hidden');
      } else {
        lessonEl.classList.add('hidden');
      }

      if (activeTab === 'screenshare' && currentScreenShareTrack) {
        screenshareEl.classList.remove('hidden');
      } else {
        screenshareEl.classList.add('hidden');
      }
    }

    function sendLessonFrameMessage(message) {
      if (!lessonFrame || !lessonFrame.contentWindow) return;
      lessonFrame.contentWindow.postMessage({
        source: 'lingowow-recorder',
        ...message,
      }, window.location.origin);
    }

    function replayLessonState() {
      if (!lessonFrameReady) return;

      if (activeLesson) {
        sendLessonFrameMessage({
          type: 'set-lesson',
          token,
          contentId: activeLesson.contentId,
          contentType: activeLesson.contentType,
          version: lessonMessageVersion,
        });
      } else {
        sendLessonFrameMessage({ type: 'clear-lesson', version: lessonMessageVersion });
      }

      if (typeof lessonScrollProgress === 'number') {
        sendLessonFrameMessage({ type: 'scroll-progress', progress: lessonScrollProgress });
      }

      lessonBlockNavigation.forEach((navigation) => {
        sendLessonFrameMessage({ type: 'block-navigation', ...navigation });
      });
      lessonMediaState.forEach(sendLessonFrameMessage);
      sendLessonFrameMessage({ type: 'set-visible', visible: activeTab === 'lesson' });
    }

    function clearLesson() {
      lessonMessageVersion += 1;
      activeLesson = null;
      lessonRequested = false;
      lessonScrollProgress = null;
      lessonBlockNavigation.clear();
      lessonMediaState.clear();
      syncContentVisibility();
      if (lessonFrameReady) sendLessonFrameMessage({ type: 'clear-lesson', version: lessonMessageVersion });
    }

    function loadLesson(contentId, contentType) {
      lessonMessageVersion += 1;
      activeLesson = { contentId, contentType };
      lessonRequested = true;
      lessonScrollProgress = null;
      lessonBlockNavigation.clear();
      lessonMediaState.clear();
      replayLessonState();
      syncContentVisibility();
    }

    lessonFrame.addEventListener('load', () => {
      lessonFrameReady = true;
      replayLessonState();
    });

    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin || event.source !== lessonFrame.contentWindow) return;
      if (event.data?.source !== 'lingowow-recorder' || event.data?.type !== 'lesson-frame-ready') return;
      lessonFrameReady = true;
      replayLessonState();
    });

    function updateLayout() {
      detachAll();
      container.innerHTML = '';

      const count = participants.size;
      if (count === 0) return;

      let cols;
      let rows;
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

    async function getExportToSvg() {
      if (!exportToSvgFn) {
        const mod = await import('https://esm.sh/@excalidraw/excalidraw@0.18.0?bundle');
        exportToSvgFn = mod.exportToSvg;
      }
      return exportToSvgFn;
    }

    async function renderWhiteboard(version) {
      if (version !== whiteboardRenderVersion) {
        return;
      }

      if (!Array.isArray(currentWhiteboardElements) || currentWhiteboardElements.length === 0) {
        whiteboardCanvas.innerHTML = '<div class="whiteboard-empty">Pizarra vacía</div>';
        return;
      }

      try {
        const exportToSvg = await getExportToSvg();
        const svg = await exportToSvg({
          elements: currentWhiteboardElements,
          appState: {
            exportBackground: true,
            viewBackgroundColor: '#ffffff',
          },
          files: null,
          renderEmbeddables: false,
          skipInliningFonts: true,
        });

        if (version !== whiteboardRenderVersion) {
          return;
        }

        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.style.width = '100%';
        svg.style.height = '100%';

        whiteboardCanvas.innerHTML = '';
        whiteboardCanvas.appendChild(svg);
      } catch (error) {
        console.error('[Recording] Failed to render whiteboard:', error);
        whiteboardCanvas.innerHTML = '<div class="whiteboard-error">No se pudo renderizar la pizarra</div>';
      }
    }

    function scheduleWhiteboardRender() {
      if (whiteboardRenderTimeout) {
        clearTimeout(whiteboardRenderTimeout);
      }

      whiteboardRenderVersion += 1;
      const nextVersion = whiteboardRenderVersion;
      whiteboardRenderTimeout = setTimeout(() => {
        renderWhiteboard(nextVersion);
      }, 120);
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

      if (screenShareTrack) {
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

        activeTab = 'screenshare';
        syncContentVisibility();
      }

      let name = participant.name || participant.identity;
      try {
        if (participant.metadata) {
          const meta = JSON.parse(participant.metadata);
          if (meta.isModerator) name = name + ' (Teacher)';
        }
      } catch {
        // Ignore malformed metadata
      }

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

      if (currentWhiteboardElements.length > 0) {
        scheduleWhiteboardRender();
      }

      try {
        const room = new Room({
          adaptiveStream: true,
          dynacast: true,
        });

        room.on(RoomEvent.TrackSubscribed, (_track, publication, participant) => {
          if (publication.source === Track.Source.ScreenShare) {
            activeTab = 'screenshare';
            syncContentVisibility();
          }
          updateParticipant(participant);
        });

        room.on(RoomEvent.TrackUnsubscribed, (_track, publication, participant) => {
          if (publication.source === Track.Source.ScreenShare) {
            hideScreenShare();
            if (activeTab === 'screenshare') {
              activeTab = lastNonScreenTab;
              syncContentVisibility();
            }
          }
          updateParticipant(participant);
        });

        room.on(RoomEvent.ParticipantConnected, (participant) => {
          updateParticipant(participant);
        });

        room.on(RoomEvent.ParticipantDisconnected, (participant) => {
          removeParticipant(participant);
        });

        room.on(RoomEvent.TrackMuted, (_pub, participant) => {
          if (participant instanceof RemoteParticipant) {
            updateParticipant(participant);
          }
        });

        room.on(RoomEvent.TrackUnmuted, (_pub, participant) => {
          if (participant instanceof RemoteParticipant) {
            updateParticipant(participant);
          }
        });

        room.on(RoomEvent.ActiveSpeakersChanged, () => {
          room.remoteParticipants.forEach((participant) => updateParticipant(participant));
        });

        room.on(RoomEvent.DataReceived, async (payload) => {
          try {
            const data = JSON.parse(decoder.decode(payload));

            if (data.command === 'set-tab' && data.values?.type === 'SET_TAB') {
              const nextTab = data.values.tab;
              if (nextTab && ['lesson', 'whiteboard', 'screenshare'].includes(nextTab)) {
                activeTab = nextTab;
                if (nextTab !== 'screenshare') {
                  lastNonScreenTab = nextTab;
                }
                if (nextTab === 'whiteboard') {
                  scheduleWhiteboardRender();
                }
                syncContentVisibility();
              }
            }

            if (data.command === 'set-lesson' && data.values?.type === 'SET_LESSON') {
              const lessonId = data.values.lessonId;
              if (!lessonId) {
                clearLesson();
              } else {
                const contentType = typeof data.values.contentType === 'string'
                  ? data.values.contentType
                  : 'lesson';
                if (['lesson', 'student_lesson', 'library_resource'].includes(contentType)) {
                  loadLesson(String(lessonId), contentType);
                }
              }
            }

            if (data.command === 'block-navigation' && data.values?.type === 'BLOCK_NAVIGATION') {
              if (typeof data.values.blockId === 'string') {
                const currentStep = Number(data.values.currentStep);
                const totalSteps = Number(data.values.totalSteps);
                if (!Number.isFinite(currentStep) || !Number.isFinite(totalSteps)) return;
                const navigation = {
                  type: 'block-navigation',
                  blockId: data.values.blockId,
                  currentStep,
                  totalSteps,
                  hasStarted: data.values.hasStarted === true,
                  isCompleted: data.values.isCompleted === true,
                  currentAnswers: data.values.currentAnswers && typeof data.values.currentAnswers === 'object'
                    ? data.values.currentAnswers
                    : undefined,
                  participantName: typeof data.values.participantName === 'string'
                    ? data.values.participantName
                    : 'Student',
                };
                lessonBlockNavigation.set(data.values.blockId, navigation);
                sendLessonFrameMessage(navigation);
              }
            }

            if (data.command === 'lesson-scroll' && data.values?.type === 'LESSON_SCROLL') {
              const progress = Number(data.values.progress);
              if (Number.isFinite(progress)) {
                lessonScrollProgress = Math.max(0, Math.min(1, progress));
                sendLessonFrameMessage({
                  type: 'scroll-progress',
                  progress: lessonScrollProgress,
                });
              }
            }

            if (data.command === 'audio-sync' && ['AUDIO_PLAY', 'AUDIO_PAUSE', 'AUDIO_SEEK'].includes(data.values?.type)) {
              const media = {
                type: 'audio-sync',
                blockId: data.values.blockId,
                isPlaying: data.values.type === 'AUDIO_PLAY',
                currentTime: Number(data.values.currentTime) || 0,
                mediaType: data.values.mediaType === 'video' ? 'video' : 'audio',
                mediaIndex: Number.isInteger(data.values.mediaIndex) ? Math.max(0, data.values.mediaIndex) : 0,
                playbackRate: Number(data.values.playbackRate) || 1,
              };
              lessonMediaState.set(media.blockId + ':' + media.mediaType + ':' + media.mediaIndex, media);
              sendLessonFrameMessage(media);
            }

            if (data.command === 'whiteboard-sync' && data.values?.type === 'WHITEBOARD_UPDATE') {
              currentWhiteboardElements = Array.isArray(data.values.elements)
                ? data.values.elements
                : [];
              lastNonScreenTab = 'whiteboard';
              if (activeTab !== 'screenshare') {
                activeTab = 'whiteboard';
              }
              scheduleWhiteboardRender();
              syncContentVisibility();
            }
          } catch (error) {
            console.error('[Recording] Failed to process data packet:', error);
          }
        });

        room.on(RoomEvent.Disconnected, () => {
          console.log('END_RECORDING');
        });

        await room.connect(serverUrl, token);
        console.log('[Recording] Connected to room:', roomName);

        room.on(RoomEvent.Reconnected, () => {
          sendCommand(room, 'sync-request', { type: 'REQUEST_SYNC' });
        });

        room.remoteParticipants.forEach((participant) => updateParticipant(participant));
        sendCommand(room, 'sync-request', { type: 'REQUEST_SYNC' });
      } catch (error) {
        console.error('[Recording] Connect Exception:', error);
      }
    }

    main();
  </script>
</body>
</html>`
}
