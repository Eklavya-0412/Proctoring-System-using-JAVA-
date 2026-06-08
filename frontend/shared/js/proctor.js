// frontend/shared/js/proctor.js
// Proctoring Engine v2 — robust, production-grade

// ─────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────
const PROCTOR_CONFIG = Object.freeze({
    AUDIO_THRESHOLD:      0.2,   // Normalized volume (0.0–1.0)
    AUDIO_CHECK_INTERVAL: 2000,  // ms between audio polls
    CAM_CHECK_INTERVAL:   5000,  // ms between webcam liveness checks
    VIOLATION_COOLDOWN:   4000,  // ms to suppress duplicate violations of same type
    LOG_RETRY_LIMIT:      3,     // max backend log attempts
    LOG_RETRY_DELAY:      1500,  // ms between retries
    SESSION_KEY:          'proctor_violations', // sessionStorage key
    VIOLATION_ENDPOINT:   '/api/exams/violation',
});

// ─────────────────────────────────────────────
// State
// ─────────────────────────────────────────────
let state = {
    violationCount:    0,
    audioContext:      null,
    analyser:          null,
    dataArray:         null,
    stream:            null,
    isExamTerminated:  false,
    isSuspended:       false,
    examId:            null,    // Set via init options
    _intervalIds:      [],      // Tracked for cleanup
    _lastViolationAt:  {},      // { [type]: timestamp } — cooldown tracking
    _audioRunning:     false,
    _violationLog:     [],      // { type, reason, timestamp } for the overlay
    _suspensionTimer:  null,
};

// ─────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────

/**
 * Start the proctoring engine.
 * @param {{ examId: string }} options
 */
async function startProctoring(options = {}) {
    if (state.stream) {
        console.warn('Proctoring Engine: already running.');
        return;
    }

    state.examId = options.examId ?? null;
    _restoreViolationCount(); // Persist violations across accidental refreshes

    try {
        state.stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    } catch (error) {
        console.error('Proctoring Engine: media access denied.', error);
        _showFatalBanner('Camera and microphone access is required. The exam cannot proceed.');
        return;
    }

    _ensureSuspensionOverlay(); // Inject overlay DOM if not already present
    _setupVideoPreview();
    _setupAudioMonitoring();
    _monitorEnvironment();
    _requestFullScreen();

    console.info('Proctoring Engine: Active', { examId: state.examId });
}

/**
 * Gracefully stop all proctoring (call on legitimate exam end).
 */
function stopProctoring() {
    state.isExamTerminated = true;
    state._intervalIds.forEach(clearInterval);
    state._intervalIds = [];

    if (state._suspensionTimer) {
        clearInterval(state._suspensionTimer);
        state._suspensionTimer = null;
    }

    state.stream?.getTracks().forEach(t => t.stop());
    state.audioContext?.close();

    sessionStorage.removeItem(PROCTOR_CONFIG.SESSION_KEY);
    console.info('Proctoring Engine: Stopped.');
}

// ─────────────────────────────────────────────
// Setup Helpers
// ─────────────────────────────────────────────

function _setupVideoPreview() {
    const video = document.getElementById('proctor-video');
    if (!video) return;
    video.srcObject = state.stream;
    video.muted = true; // Prevent audio feedback loop
    video.play().catch(() => {}); // Autoplay may be blocked; silent fail is fine
}

function _setupAudioMonitoring() {
    try {
        state.audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const source = state.audioContext.createMediaStreamSource(state.stream);
        state.analyser = state.audioContext.createAnalyser();
        state.analyser.fftSize = 256;
        source.connect(state.analyser);

        const bufferLength = state.analyser.frequencyBinCount;
        state.dataArray = new Uint8Array(bufferLength);
        state._audioRunning = true;
    } catch (e) {
        console.error('Proctoring Engine: audio monitoring setup failed.', e);
        return;
    }

    const id = setInterval(() => {
        // Skip processing when tab is hidden or exam is suspended
        if (state.isExamTerminated || state.isSuspended || document.visibilityState === 'hidden') return;

        state.analyser.getByteFrequencyData(state.dataArray);
        const sum = state.dataArray.reduce((a, b) => a + b, 0);
        const average = sum / state.dataArray.length / 255;

        if (average > PROCTOR_CONFIG.AUDIO_THRESHOLD) {
            _handleViolation('audio', 'Excessive noise detected. Please remain quiet.');
        }
    }, PROCTOR_CONFIG.AUDIO_CHECK_INTERVAL);

    state._intervalIds.push(id);
}

function _monitorEnvironment() {
    // Tab visibility — fires reliably across browsers
    document.addEventListener('visibilitychange', _onVisibilityChange);

    // Window blur — catches alt-tab, other app focus, etc.
    window.addEventListener('blur', _onWindowBlur);

    // Fullscreen exit
    document.addEventListener('fullscreenchange', _onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', _onFullscreenChange);

    // Webcam liveness check
    const id = setInterval(() => {
        if (state.isExamTerminated || state.isSuspended) return;
        const track = state.stream?.getVideoTracks()[0];
        if (!track || track.readyState !== 'live' || !track.enabled) {
            _handleViolation('camera', 'Camera feed interrupted!');
        }
    }, PROCTOR_CONFIG.CAM_CHECK_INTERVAL);

    state._intervalIds.push(id);
}

function _requestFullScreen() {
    const el = document.documentElement;
    const request = el.requestFullscreen
        ?? el.webkitRequestFullscreen
        ?? el.mozRequestFullScreen
        ?? el.msRequestFullscreen;

    if (request) {
        request.call(el).catch(err => {
            console.warn('Proctoring Engine: fullscreen request failed.', err);
        });
    }
}

// ─────────────────────────────────────────────
// Event Handlers
// ─────────────────────────────────────────────

function _onVisibilityChange() {
    if (document.visibilityState === 'hidden') {
        _handleViolation('focus', 'Tab switched or window hidden. This has been logged.');
    }
}

function _onWindowBlur() {
    // Only flag blur if the tab is still visible (avoids double-counting with visibilitychange)
    if (document.visibilityState === 'visible') {
        _handleViolation('focus', 'Exam window lost focus!');
    }
}

function _onFullscreenChange() {
    const isFullscreen = !!(
        document.fullscreenElement || document.webkitFullscreenElement
    );
    if (!isFullscreen && !state.isExamTerminated) {
        _handleViolation('fullscreen', 'Exited full-screen mode. Re-enter immediately.');
        _showFullscreenPrompt();
    } else {
        _hideFullscreenPrompt();
    }
}

function _showFullscreenPrompt() {
    if (document.getElementById('proctor-fs-prompt')) return; // already shown

    const prompt = document.createElement('div');
    prompt.id = 'proctor-fs-prompt';
    prompt.setAttribute('role', 'alertdialog');
    prompt.setAttribute('aria-label', 'Return to full screen');
    prompt.innerHTML = `
        <div class="proctor-fs-prompt__card">
            <span class="proctor-fs-prompt__icon">⛶</span>
            <p class="proctor-fs-prompt__title">Full-screen exited</p>
            <p class="proctor-fs-prompt__sub">You must remain in full-screen mode during the exam. This has been logged as a violation.</p>
            <button class="proctor-fs-prompt__btn" id="proctor-fs-return-btn">Return to Full Screen</button>
        </div>
    `;
    document.body.appendChild(prompt);

    document.getElementById('proctor-fs-return-btn').addEventListener('click', () => {
        _requestFullScreen();
        _hideFullscreenPrompt();
    });
}

function _hideFullscreenPrompt() {
    document.getElementById('proctor-fs-prompt')?.remove();
}

// ─────────────────────────────────────────────
// Violation Handling
// ─────────────────────────────────────────────

/**
 * Core violation handler with per-type cooldown to prevent spam.
 * @param {string} type   - Violation category ('audio' | 'focus' | 'camera' | 'fullscreen')
 * @param {string} reason - Human-readable description
 */
async function _handleViolation(type, reason) {
    if (state.isExamTerminated || state.isSuspended) return;

    // Cooldown: ignore duplicate violation types within the cooldown window
    const now = Date.now();
    const lastAt = state._lastViolationAt[type] ?? 0;
    if (now - lastAt < PROCTOR_CONFIG.VIOLATION_COOLDOWN) return;
    state._lastViolationAt[type] = now;

    state.violationCount++;
    _persistViolationCount();

    // Log to violation history for the overlay
    state._violationLog.push({ type, reason, timestamp: new Date().toISOString() });

    _showViolationToast(type, reason);
    _logViolationToBackend({ type, reason, count: state.violationCount });

    if (state.violationCount === 9) {
        _terminateExam('Exam permanently suspended due to repeated violations.');
    } else if (state.violationCount === 6) {
        _suspendExam(reason, 15 * 60);
    } else if (state.violationCount === 3) {
        _suspendExam(reason, 5 * 60);
    }
}

function _terminateExam(reason) {
    state.isExamTerminated = true;
    document.querySelectorAll('input, textarea, button, select').forEach(el => {
        el.disabled = true;
    });
    _showFatalBanner(reason);
}

// ─────────────────────────────────────────────
// Violation Toast (enhanced)
// ─────────────────────────────────────────────

const VIOLATION_LABELS = {
    audio:      'Noise violation',
    focus:      'Focus violation',
    camera:     'Camera violation',
    fullscreen: 'Fullscreen violation',
};

function _showViolationToast(type, reason) {
    document.querySelector('.proctor-toast')?.remove();

    let nextSuspension = 3;
    if (state.violationCount >= 3 && state.violationCount < 6) nextSuspension = 6;
    if (state.violationCount >= 6 && state.violationCount < 9) nextSuspension = 9;
    
    const remaining = nextSuspension - state.violationCount;
    const label = VIOLATION_LABELS[type] ?? 'Violation';

    const toast = document.createElement('div');
    toast.className = 'proctor-toast';
    toast.setAttribute('role', 'alert');
    toast.innerHTML = `
        <span class="proctor-toast__icon">⚠️</span>
        <span class="proctor-toast__msg">
            <span class="proctor-toast__type">${label} · #${state.violationCount}</span>
            <span class="proctor-toast__detail">${reason}</span>
            <span class="proctor-toast__counter">${
                remaining > 0
                    ? `${remaining} warning${remaining !== 1 ? 's' : ''} remaining before suspension`
                    : 'Exam is being suspended now'
            }</span>
        </span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 5000);
}

function _showFatalBanner(message) {
    const banner = document.createElement('div');
    banner.className = 'proctor-fatal-banner';
    banner.setAttribute('role', 'alert');
    banner.textContent = message;
    document.body.prepend(banner);
}

// ─────────────────────────────────────────────
// Suspension Overlay (replaces _terminateExam)
// ─────────────────────────────────────────────

/**
 * Inject the suspension overlay HTML into the page once.
 */
function _ensureSuspensionOverlay() {
    if (document.getElementById('proctor-suspension-overlay')) return;

    const overlay = document.createElement('div');
    overlay.id = 'proctor-suspension-overlay';
    overlay.setAttribute('role', 'alertdialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', 'Exam suspended');
    overlay.innerHTML = `
        <div class="proctor-suspension-card">
            <span class="proctor-suspension-card__icon">🚫</span>
            <h2 class="proctor-suspension-card__title">Exam Suspended</h2>
            <p class="proctor-suspension-card__subtitle">Potential Unfair Means Detected</p>

            <div class="proctor-suspension-card__reason-box">
                <span class="proctor-suspension-card__reason-label">Final violation</span>
                <span id="suspension-reason" class="proctor-suspension-card__reason-text"></span>
            </div>

            <div id="suspension-violations" class="proctor-suspension-card__violations"></div>

            <p class="proctor-suspension-card__timer-label">Your exam will resume in</p>
            <div id="suspension-timer" class="proctor-suspension-card__timer">5:00</div>
            <p class="proctor-suspension-card__timer-sublabel">Do not close or refresh this window</p>

            <div class="proctor-suspension-card__progress-track">
                <div id="suspension-progress" class="proctor-suspension-card__progress-fill"></div>
            </div>

            <p class="proctor-suspension-card__note">
                <strong>This suspension has been logged.</strong> Your invigilator has been notified.
                Repeated violations may result in permanent disqualification.
            </p>
        </div>
    `;
    document.body.appendChild(overlay);
}

/**
 * Freeze the exam for given seconds, then resume.
 * @param {string} triggerReason - The reason that triggered suspension
 * @param {number} duration - Suspension duration in seconds
 */
function _suspendExam(triggerReason, duration) {
    if (state.isSuspended || state.isExamTerminated) return;
    state.isSuspended = true;

    // Freeze exam UI (disable all inputs/buttons except the overlay)
    document.querySelectorAll('input, textarea, button, select').forEach(el => {
        el.disabled = true;
    });

    // Populate overlay content
    const overlay = document.getElementById('proctor-suspension-overlay');
    if (!overlay) return;

    document.getElementById('suspension-reason').textContent = triggerReason;

    // Show all violations as chips
    const chipsContainer = document.getElementById('suspension-violations');
    chipsContainer.innerHTML = state._violationLog.map(v =>
        `<span class="proctor-suspension-card__violation-chip">${VIOLATION_LABELS[v.type] ?? v.type}: ${v.reason}</span>`
    ).join('');

    overlay.classList.add('active');

    // Countdown timer
    let remaining = duration;
    const timerEl  = document.getElementById('suspension-timer');
    const progressEl = document.getElementById('suspension-progress');

    const _fmt = secs => {
        const m = Math.floor(secs / 60);
        const s = secs % 60;
        return `${m}:${String(s).padStart(2, '0')}`;
    };

    timerEl.textContent = _fmt(remaining);
    progressEl.style.width = '100%';

    state._suspensionTimer = setInterval(() => {
        remaining--;

        timerEl.textContent = _fmt(remaining);
        progressEl.style.width = `${(remaining / duration) * 100}%`;

        if (remaining <= 60) {
            timerEl.classList.add('urgent');
        }

        if (remaining <= 0) {
            _resumeExam();
        }
    }, 1000);
}

/**
 * Lift the suspension and restore exam interaction.
 */
function _resumeExam() {
    clearInterval(state._suspensionTimer);
    state._suspensionTimer = null;

    // Do NOT reset violation count to keep track of total violations
    // Clear log for the next suspension cycle
    state._violationLog  = [];
    state._lastViolationAt = {};
    _persistViolationCount();

    // Re-enable exam UI
    document.querySelectorAll('input, textarea, button, select').forEach(el => {
        el.disabled = false;
    });

    // Hide overlay
    const overlay = document.getElementById('proctor-suspension-overlay');
    if (overlay) overlay.classList.remove('active');

    state.isSuspended = false;

    _showViolationToast('focus', 'Suspension lifted. You may continue. Any further violations will be logged.');
    document.getElementById('suspension-timer')?.classList.remove('urgent');

    console.info('Proctoring Engine: Suspension lifted. Exam resumed.');
}

// ─────────────────────────────────────────────
// Backend Logging (with retry)
// ─────────────────────────────────────────────

async function _logViolationToBackend(payload, attempt = 1) {
    // Determine studentId. Real system would extract from session.
    const studentId = 101; 

    const body = JSON.stringify({
        examId:    state.examId,
        studentId: studentId,
        type:      payload.type,
        reason:    payload.reason,
        count:     payload.count,
        timestamp: new Date().toISOString(),
    });

    try {
        const res = await fetch(PROCTOR_CONFIG.VIOLATION_ENDPOINT, {
            method:  'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
    } catch (err) {
        if (attempt < PROCTOR_CONFIG.LOG_RETRY_LIMIT) {
            console.warn(`Proctoring Engine: log attempt ${attempt} failed, retrying…`, err);
            setTimeout(
                () => _logViolationToBackend(payload, attempt + 1),
                PROCTOR_CONFIG.LOG_RETRY_DELAY
            );
        } else {
            console.error('Proctoring Engine: violation logging failed after retries.', err);
        }
    }
}

// ─────────────────────────────────────────────
// Persistence (survives accidental refresh)
// ─────────────────────────────────────────────

function _persistViolationCount() {
    try {
        sessionStorage.setItem(PROCTOR_CONFIG.SESSION_KEY, String(state.violationCount));
    } catch (_) {}
}

function _restoreViolationCount() {
    try {
        const saved = parseInt(sessionStorage.getItem(PROCTOR_CONFIG.SESSION_KEY) ?? '0', 10);
        if (!isNaN(saved) && saved > 0) {
            state.violationCount = saved;
            console.warn(`Proctoring Engine: restored ${saved} violation(s) from previous session.`);
            if (state.violationCount >= 9) {
                _terminateExam('Exam permanently suspended due to repeated violations.');
            } else if (state.violationCount >= 6) {
                _suspendExam('Session restored mid-suspension.', 15 * 60);
            } else if (state.violationCount >= 3) {
                _suspendExam('Session restored mid-suspension.', 5 * 60);
            }
        }
    } catch (_) {}
}

// ─────────────────────────────────────────────
// Exports (for module environments)
// ─────────────────────────────────────────────
if (typeof module !== 'undefined') {
    module.exports = { startProctoring, stopProctoring };
}