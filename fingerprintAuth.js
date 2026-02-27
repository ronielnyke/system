/**
 * OMEGA SECURITY SYSTEMS - Fingerprint Authentication Module
 * Uses WebAuthn API for platform authenticator (fingerprint, Face ID, PIN)
 */

const FingerprintAuthModule = (() => {
    // Private state
    const state = {
        credentialId: null,
        isSupported: false
    };

    // DOM element references
    const elements = {};

    // Initialize module
    const init = async () => {
        Utils.console.log('Initializing Fingerprint Auth Module...', 'system');
        cacheElements();
        resetUI();
        
        // Check support
        await checkSupport();
        
        // Show interface
        elements.interface.classList.remove('hidden');
        elements.authMethods.classList.add('hidden');
    };

    // Cache DOM elements
    const cacheElements = () => {
        elements.interface = document.getElementById('fingerprintInterface');
        elements.authMethods = document.getElementById('authMethods');
        elements.status = document.getElementById('fingerprintStatus');
        elements.error = document.getElementById('fingerprintError');
        elements.errorText = document.getElementById('fingerprintErrorText');
        elements.supportStatus = document.getElementById('fpSupportStatus');
        elements.startBtn = document.getElementById('startFpBtn');
        elements.cancelBtn = document.getElementById('cancelFpBtn');
    };

    // Check WebAuthn support
    const checkSupport = async () => {
        if (!window.PublicKeyCredential) {
            showError('WebAuthn not supported on this device/browser. Try Chrome, Edge, or Safari.');
            elements.supportStatus.textContent = 'Not supported';
            elements.supportStatus.className = 'text-red-500 mt-1';
            disableStartButton();
            return false;
        }

        try {
            const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
            
            if (!available) {
                showError('No platform authenticator found. Ensure device has fingerprint/Face ID sensor and you are using HTTPS or localhost.');
                elements.supportStatus.textContent = 'No hardware sensor';
                elements.supportStatus.className = 'text-yellow-500 mt-1';
            } else {
                elements.supportStatus.textContent = 'Platform authenticator available';
                elements.supportStatus.className = 'text-green-500 mt-1';
                state.isSupported = true;
            }
        } catch (err) {
            Utils.console.log('Authenticator check error: ' + err.message, 'warning');
            elements.supportStatus.textContent = 'Could not check availability';
            elements.supportStatus.className = 'text-yellow-500 mt-1';
        }

        // Check existing credential
        const credentialId = Utils.storage.get('omega_owner_credential');
        if (!credentialId) {
            elements.status.textContent = 'Register fingerprint to complete setup';
            elements.startBtn.textContent = 'REGISTER';
        } else {
            elements.status.textContent = 'Touch sensor to verify identity';
            elements.startBtn.textContent = 'AUTHENTICATE';
            state.credentialId = credentialId;
        }

        return true;
    };

    // Start scan (register or authenticate)
    const startScan = async () => {
        const credentialId = Utils.storage.get('omega_owner_credential');
        
        elements.startBtn.disabled = true;
        elements.startBtn.classList.add('btn-disabled');

        try {
            if (!credentialId) {
                await register();
            } else {
                await authenticate();
            }
        } catch (err) {
            Utils.console.log('Fingerprint error: ' + err.message, 'error');
            elements.status.textContent = 'Failed: ' + (err.message || 'Unknown error');
            Utils.showToast('Fingerprint authentication failed: ' + (err.message || 'Unknown error'), 'error');
            
            elements.startBtn.disabled = false;
            elements.startBtn.classList.remove('btn-disabled');
            elements.startBtn.textContent = credentialId ? 'RETRY' : 'REGISTER';
        }
    };

    // Register new credential
    const register = async () => {
        Utils.console.log('Registering fingerprint...', 'system');
        elements.status.textContent = 'Touch your device sensor to register...';

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        
        const options = {
            challenge: challenge,
            rp: {
                name: 'OMEGA SECURITY SYSTEMS',
                id: window.location.hostname
            },
            user: {
                id: Uint8Array.from('OWNER', c => c.charCodeAt(0)),
                name: 'owner@omega-sec.local',
                displayName: 'System Owner'
            },
            pubKeyCredParams: [{ alg: -7, type: 'public-key' }],
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                userVerification: 'required',
                residentKey: 'preferred'
            },
            timeout: 60000,
            attestation: 'none'
        };

        const credential = await navigator.credentials.create({ publicKey: options });
        
        if (!credential) {
            throw new Error('No credential returned');
        }

        // Store credential
        const credentialId = Utils.arrayBufferToBase64(credential.rawId);
        Utils.storage.set('omega_owner_credential', credentialId);
        state.credentialId = credentialId;

        Utils.console.log('Credential registered successfully', 'success');
        elements.status.textContent = 'Fingerprint registered successfully!';
        Utils.showToast('Fingerprint registered. Authenticating...', 'success');

        // Auto-authenticate after registration
        setTimeout(() => authenticate(), 1000);
    };

    // Authenticate with existing credential
    const authenticate = async () => {
        Utils.console.log('Authenticating fingerprint...', 'system');
        elements.status.textContent = 'Touch sensor to verify...';

        const credentialId = Utils.storage.get('omega_owner_credential');
        const challenge = crypto.getRandomValues(new Uint8Array(32));
        
        const idBuffer = Utils.base64ToArrayBuffer(credentialId);

        const options = {
            challenge: challenge,
            allowCredentials: [{
                id: idBuffer,
                type: 'public-key',
                transports: ['internal']
            }],
            userVerification: 'required',
            timeout: 60000
        };

        const assertion = await navigator.credentials.get({ publicKey: options });
        
        if (!assertion) {
            throw new Error('No assertion returned');
        }

        // Success!
        Utils.console.log('Fingerprint verified!', 'success');
        elements.status.textContent = 'Fingerprint verified!';
        
        // Update global auth state
        if (window.App) {
            window.App.updateAuthStep(2);
        }

        Utils.showToast('Biometric authentication complete', 'success');

        // Grant access
        setTimeout(() => {
            if (window.App) {
                window.App.grantAccess({
                    name: 'OWNER',
                    clearance: 'OMEGA',
                    id: 'OMEGA-OWNER-' + Date.now(),
                    method: 'BIOMETRIC_DUAL'
                });
            }
        }, 1000);
    };

    // Cancel fingerprint auth
    const cancel = () => {
        Utils.console.log('Cancelling fingerprint auth...', 'system');
        elements.interface.classList.add('hidden');
        elements.authMethods.classList.remove('hidden');
        
        if (window.App) {
            window.App.updateAuthStepText();
        }
    };

    // Show error
    const showError = (message) => {
        elements.error.classList.remove('hidden');
        elements.errorText.textContent = message;
    };

    // Reset UI
    const resetUI = () => {
        elements.error.classList.add('hidden');
        elements.startBtn.disabled = false;
        elements.startBtn.classList.remove('btn-disabled');
        elements.cancelBtn.disabled = false;
        elements.cancelBtn.classList.remove('btn-disabled');
    };

    // Disable start button
    const disableStartButton = () => {
        elements.startBtn.disabled = true;
        elements.startBtn.classList.add('btn-disabled');
    };

    // Public API
    return {
        init,
        startScan,
        cancel
    };
})();

// Make available globally
window.fpAuthModule = FingerprintAuthModule;