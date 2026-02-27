/**
 * OMEGA SECURITY SYSTEMS - Main Application Controller
 */

const App = (() => {
    // Application state
    const state = {
        authStep: 0,
        isAuthenticated: false,
        user: null,
        session: null,
        uptime: 0
    };

    // Boot sequence messages
    const bootSequence = [
        'BIOS DATE: 01/15/2024 14:32:17',
        'CPU: Quantum Core Processor @ 4.8GHz',
        'MEMORY TEST: 16384 TB OK',
        'BIOMETRIC SUBSYSTEM: INITIALIZING...',
        'FACE-API NEURAL NET: LOADING MODELS...',
        'WEBAUTHN API: CHECKING PLATFORM AUTHENTICATOR...',
        'FINGERPRINT SENSOR: STANDBY',
        'QUANTUM ENCRYPTION: ENABLED',
        'OWNER REGISTRY: LOCKED',
        'SYSTEM READY'
    ];

    // Initialize application
    const init = () => {
        document.addEventListener('DOMContentLoaded', runBootSequence);
        
        // Setup cleanup
        window.addEventListener('beforeunload', cleanup);
        
        // Check browser support
        const support = Utils.checkSupport();
        Utils.console.log('Browser support check:', 'info');
        console.table(support);
    };

    // Run boot sequence
    const runBootSequence = async () => {
        const container = document.getElementById('bootSequence');
        const status = document.getElementById('bootStatus');
        const progress = document.getElementById('bootProgress');

        for (let i = 0; i < bootSequence.length; i++) {
            const line = document.createElement('div');
            line.className = 'text-green-500/80 font-mono';
            line.textContent = `[${Utils.formatTime()}] ${bootSequence[i]}`;
            container.appendChild(line);
            container.scrollTop = container.scrollHeight;

            // Update progress
            const progressPercent = ((i + 1) / bootSequence.length) * 100;
            progress.style.width = progressPercent + '%';

            await Utils.sleep(150);
        }

        status.textContent = 'BIOMETRIC SYSTEM READY';
        await Utils.sleep(500);

        // Transition to security gate
        gsap.to('#systemBoot', {
            opacity: 0,
            duration: 0.5,
            onComplete: () => {
                document.getElementById('systemBoot').classList.add('hidden');
                document.getElementById('securityGate').classList.remove('hidden');
                
                // Initialize background effects
                Utils.initMatrixRain();
                Utils.initNeuralNetwork();
                updateAuthStepText();
            }
        });
    };

    // Update auth step
    const updateAuthStep = (step) => {
        state.authStep = step;
        updateAuthStepText();
    };

    // Update auth step text and progress
    const updateAuthStepText = () => {
        const textEl = document.getElementById('authStepText');
        const progressEl = document.getElementById('authProgress');
        
        if (textEl) {
            textEl.textContent = `BIOMETRIC CHECK ${state.authStep}/2`;
        }
        if (progressEl) {
            const progress = (state.authStep / 2) * 100;
            progressEl.style.width = progress + '%';
        }
    };

    // Grant access to dashboard
    const grantAccess = (userData) => {
        if (state.authStep < 2) {
            Utils.showToast('Complete all biometric checks first', 'error');
            return;
        }

        state.user = userData;
        state.isAuthenticated = true;
        state.session = {
            id: Utils.generateId('SES'),
            startTime: new Date(),
            ip: '192.168.1.' + Math.floor(Math.random() * 255)
        };

        // Update UI
        document.getElementById('userName').textContent = userData.name;
        document.getElementById('sessionIdDisplay').textContent = state.session.id;

        Utils.console.log('Access granted to: ' + userData.name, 'success');

        // Transition to dashboard
        gsap.to('#securityGate', {
            opacity: 0,
            scale: 1.1,
            duration: 0.5,
            onComplete: () => {
                document.getElementById('securityGate').classList.add('hidden');
                document.getElementById('mainDashboard').classList.remove('hidden');

                gsap.from('#mainDashboard', {
                    opacity: 0,
                    y: 20,
                    duration: 0.5
                });

                initDashboard();
            }
        });
    };

    // Initialize dashboard
    const initDashboard = () => {
        startClock();
        startUptimeCounter();
        updateWebAuthnStatus();
    };

    // Update WebAuthn status in dashboard
    const updateWebAuthnStatus = () => {
        const statusEl = document.getElementById('webauthnStatus');
        if (statusEl) {
            statusEl.textContent = window.PublicKeyCredential ? 'Ready' : 'Not Available';
            statusEl.className = window.PublicKeyCredential ? 'text-green-400' : 'text-red-400';
        }
    };

    // Start clock
    const startClock = () => {
        const update = () => {
            const clockEl = document.getElementById('headerClock');
            const dateEl = document.getElementById('headerDate');
            if (clockEl) clockEl.textContent = Utils.formatTime();
            if (dateEl) dateEl.textContent = Utils.formatDate();
        };
        update();
        setInterval(update, 1000);
    };

    // Start uptime counter
    const startUptimeCounter = () => {
        setInterval(() => {
            state.uptime++;
            const uptimeEl = document.getElementById('uptimeDisplay');
            if (uptimeEl) {
                uptimeEl.textContent = Utils.formatUptime(state.uptime);
            }
        }, 1000);
    };

    // Navigate to page
    const navigateTo = (page) => {
        document.querySelectorAll('.page-content').forEach(p => p.classList.add('hidden'));
        document.querySelectorAll('.nav-item').forEach(n => {
            n.classList.remove('active', 'bg-green-500/20', 'border-green-500');
            n.classList.add('border-green-500/30');
        });

        const targetPage = document.getElementById(`page-${page}`);
        if (targetPage) {
            targetPage.classList.remove('hidden');
            gsap.from(targetPage, { opacity: 0, y: 10, duration: 0.3 });
        }

        const navItem = document.querySelector(`.nav-item[data-page="${page}"]`);
        if (navItem) {
            navItem.classList.add('active', 'bg-green-500/20', 'border-green-500');
            navItem.classList.remove('border-green-500/30');
        }
    };

    // Logout
    const logout = () => {
        Utils.console.log('Logging out...', 'system');
        
        // Clear state
        state.authStep = 0;
        state.isAuthenticated = false;
        state.user = null;
        state.session = null;

        // Stop camera if active
        if (window.faceAuthModule) {
            window.faceAuthModule.stopCamera();
        }

        // Reload page
        location.reload();
    };

    // Cleanup
    const cleanup = () => {
        if (window.faceAuthModule) {
            window.faceAuthModule.stopCamera();
        }
    };

    // Public API
    return {
        init,
        updateAuthStep,
        updateAuthStepText,
        grantAccess,
        navigateTo,
        logout
    };
})();

// Initialize app
App.init();

// Make available globally
window.App = App;