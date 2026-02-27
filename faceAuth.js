/**
 * OMEGA SECURITY SYSTEMS - Face Authentication Module
 * Uses face-api.js for real-time face detection and recognition
 */

const FaceAuthModule = (() => {
    // Private state
    const state = {
        modelsLoaded: false,
        labeledFaceDescriptors: null,
        faceMatcher: null,
        scanInterval: null,
        stream: null,
        videoElement: null,
        canvasElement: null,
        isRegistering: false
    };

    // DOM element references
    const elements = {};

    // Initialize module
    const init = () => {
        Utils.console.log('Initializing Face Auth Module...', 'system');
        cacheElements();
        resetUI();
        loadModels();
    };

    // Cache DOM elements
    const cacheElements = () => {
        elements.video = document.getElementById('videoFeed');
        elements.canvas = document.getElementById('faceOverlay');
        elements.status = document.getElementById('faceStatus');
        elements.detectionMeter = document.getElementById('detectionMeter');
        elements.detectionBar = document.getElementById('detectionBar');
        elements.landmarksMeter = document.getElementById('landmarksMeter');
        elements.identityStatus = document.getElementById('identityStatus');
        elements.matchResult = document.getElementById('faceMatchResult');
        elements.matchName = document.getElementById('matchName');
        elements.matchConfidence = document.getElementById('matchConfidence');
        elements.stream = document.getElementById('biometricStream');
        elements.startBtn = document.getElementById('startScanBtn');
        elements.registerBtn = document.getElementById('registerFaceBtn');
        elements.abortBtn = document.getElementById('abortFaceBtn');
        elements.interface = document.getElementById('faceAuthInterface');
        elements.authMethods = document.getElementById('authMethods');
    };

    // Load face-api models
    const loadModels = async () => {
        updateStatus('LOADING NEURAL MODELS...');

        try {
            const MODEL_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.12/model';

            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
                faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL)
            ]);

            state.modelsLoaded = true;
            Utils.console.log('Face-api models loaded successfully', 'success');
            
            await initCamera();

        } catch (err) {
            Utils.console.log('Failed to load models: ' + err.message, 'error');
            updateStatus('MODEL LOAD FAILED');
            Utils.showToast('Failed to load face recognition models', 'error');
        }
    };

    // Initialize camera
    const initCamera = async () => {
        updateStatus('ACCESSING CAMERA...');

        try {
            const constraints = {
                video: {
                    width: { ideal: 1280, min: 640 },
                    height: { ideal: 720, min: 480 },
                    facingMode: 'user'
                },
                audio: false
            };

            state.stream = await navigator.mediaDevices.getUserMedia(constraints);
            elements.video.srcObject = state.stream;

            elements.video.onloadedmetadata = () => {
                elements.video.play();
                elements.canvas.width = elements.video.videoWidth;
                elements.canvas.height = elements.video.videoHeight;
                
                Utils.console.log('Camera initialized: ' + elements.video.videoWidth + 'x' + elements.video.videoHeight, 'success');
                
                checkRegistrationStatus();
            };

            elements.video.onerror = (err) => {
                Utils.console.log('Video error: ' + err, 'error');
                updateStatus('VIDEO ERROR');
            };

        } catch (err) {
            Utils.console.log('Camera access denied: ' + err.message, 'error');
            updateStatus('CAMERA ACCESS DENIED');
            Utils.showToast('Camera access required: ' + err.message, 'error');
            disableButtons();
        }
    };

    // Check if owner is registered
    const checkRegistrationStatus = () => {
        const ownerData = Utils.storage.get('omega_owner_face');

        if (!ownerData) {
            // No owner - show registration
            updateStatus('NO OWNER REGISTERED - REGISTRATION REQUIRED');
            elements.startBtn.classList.add('hidden');
            elements.registerBtn.classList.remove('hidden');
            Utils.showToast('System requires owner registration', 'warning');
        } else {
            // Owner exists - load data
            try {
                const descriptors = ownerData.descriptors.map(d => new Float32Array(d));
                state.labeledFaceDescriptors = new faceapi.LabeledFaceDescriptors('OWNER', descriptors);
                state.faceMatcher = new faceapi.FaceMatcher(state.labeledFaceDescriptors, 0.6);
                
                updateStatus('POSITION FACE IN TARGET - CLICK INITIATE SCAN');
                elements.startBtn.classList.remove('hidden');
                elements.registerBtn.classList.add('hidden');
            } catch (e) {
                Utils.console.log('Error loading owner data: ' + e.message, 'error');
                Utils.storage.remove('omega_owner_face');
                updateStatus('ERROR LOADING DATA - PLEASE RE-REGISTER');
                elements.startBtn.classList.add('hidden');
                elements.registerBtn.classList.remove('hidden');
            }
        }
    };

    // Register owner face
    const register = async () => {
        if (!state.modelsLoaded || !elements.video.videoWidth) {
            Utils.showToast('System not ready', 'error');
            return;
        }

        Utils.console.log('Starting face registration...', 'system');
        elements.registerBtn.disabled = true;
        elements.registerBtn.textContent = 'PROCESSING...';
        elements.registerBtn.classList.add('btn-disabled');

        updateStatus('CAPTURING BIOMETRIC DATA...');

        const descriptors = [];
        let captureCount = 0;
        const maxCaptures = 3;
        let attempts = 0;
        const maxAttempts = 30;

        elements.stream.innerHTML = '';

        const captureInterval = setInterval(async () => {
            attempts++;

            if (attempts > maxAttempts) {
                clearInterval(captureInterval);
                Utils.showToast('Registration timeout - could not capture face', 'error');
                resetRegisterButton();
                updateStatus('REGISTRATION FAILED - RETRY');
                return;
            }

            try {
                const detection = await faceapi
                    .detectSingleFace(elements.video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptor();

                if (detection) {
                    descriptors.push(detection.descriptor);
                    captureCount++;
                    updateStatus(`CAPTURING SAMPLES... ${captureCount}/${maxCaptures}`);
                    addStreamData(`Sample ${captureCount} captured - Confidence: ${(detection.detection.score * 100).toFixed(1)}%`);

                    if (captureCount >= maxCaptures) {
                        clearInterval(captureInterval);
                        completeRegistration(descriptors);
                    }
                } else {
                    addStreamData('No face detected - hold still...');
                }
            } catch (err) {
                clearInterval(captureInterval);
                Utils.showToast('Registration error: ' + err.message, 'error');
                resetRegisterButton();
            }
        }, 500);
    };

    // Complete registration
    const completeRegistration = (descriptors) => {
        try {
            const data = {
                descriptors: descriptors.map(d => Array.from(d)),
                registeredAt: new Date().toISOString()
            };

            Utils.storage.set('omega_owner_face', data);
            
            state.labeledFaceDescriptors = new faceapi.LabeledFaceDescriptors('OWNER', descriptors);
            state.faceMatcher = new faceapi.FaceMatcher(state.labeledFaceDescriptors, 0.6);

            updateStatus('OWNER REGISTERED SUCCESSFULLY');
            Utils.showToast('Owner biometric data registered', 'success');

            setTimeout(() => {
                elements.registerBtn.classList.add('hidden');
                elements.startBtn.classList.remove('hidden');
                elements.startBtn.disabled = false;
                elements.startBtn.textContent = 'INITIATE SCAN';
                elements.startBtn.classList.remove('btn-disabled');
                updateStatus('POSITION FACE IN TARGET - CLICK INITIATE SCAN');
            }, 1500);

        } catch (err) {
            Utils.showToast('Failed to save registration: ' + err.message, 'error');
            resetRegisterButton();
        }
    };

    // Start face scan
    const startScan = async () => {
        if (!state.modelsLoaded || !state.faceMatcher) {
            Utils.showToast('System not ready', 'error');
            return;
        }

        Utils.console.log('Starting face scan...', 'system');
        elements.startBtn.disabled = true;
        elements.startBtn.textContent = 'SCANNING...';
        elements.startBtn.classList.add('btn-disabled');

        let scanAttempts = 0;
        const maxAttempts = 150;

        if (state.scanInterval) clearInterval(state.scanInterval);

        state.scanInterval = setInterval(async () => {
            scanAttempts++;

            try {
                const detections = await faceapi
                    .detectAllFaces(elements.video, new faceapi.TinyFaceDetectorOptions())
                    .withFaceLandmarks()
                    .withFaceDescriptors()
                    .withFaceExpressions();

                const ctx = elements.canvas.getContext('2d');
                ctx.clearRect(0, 0, elements.canvas.width, elements.canvas.height);

                if (detections.length > 0) {
                    faceapi.draw.drawDetections(elements.canvas, detections);
                    faceapi.draw.drawFaceLandmarks(elements.canvas, detections);

                    const detection = detections[0];
                    const confidence = (detection.detection.score * 100).toFixed(1);
                    
                    elements.detectionMeter.textContent = confidence + '%';
                    elements.detectionBar.style.width = confidence + '%';
                    elements.landmarksMeter.textContent = detection.landmarks.positions.length;

                    const match = state.faceMatcher.findBestMatch(detection.descriptor);
                    addStreamData(`Distance: ${match.distance.toFixed(3)} | ${match.label}`);

                    if (match.label === 'OWNER' && match.distance < 0.6) {
                        // Match found
                        clearInterval(state.scanInterval);
                        state.scanInterval = null;

                        const matchConfidence = ((1 - match.distance) * 100).toFixed(1);
                        
                        elements.identityStatus.textContent = 'VERIFIED';
                        elements.identityStatus.className = 'font-orbitron text-3xl text-green-400 glow-green';
                        elements.matchResult.classList.remove('hidden');
                        elements.matchName.textContent = 'OWNER CONFIRMED';
                        elements.matchConfidence.textContent = `${matchConfidence}% MATCH`;

                        updateStatus('BIOMETRIC IDENTITY CONFIRMED');
                        stopCamera();

                        // Update global auth state
                        if (window.App) {
                            window.App.updateAuthStep(1);
                        }

                        setTimeout(() => {
                            Utils.showToast('Face verification complete. Fingerprint required.', 'success');
                            cancel();
                            if (window.fpAuthModule) {
                                window.fpAuthModule.init();
                            }
                        }, 2000);
                        return;
                    }
                } else {
                    elements.detectionMeter.textContent = '0%';
                    elements.detectionBar.style.width = '0%';
                }

                if (scanAttempts >= maxAttempts) {
                    clearInterval(state.scanInterval);
                    state.scanInterval = null;
                    
                    updateStatus('IDENTITY NOT CONFIRMED - ACCESS DENIED');
                    elements.identityStatus.textContent = 'REJECTED';
                    elements.identityStatus.className = 'font-orbitron text-3xl text-red-400 glow-red';
                    Utils.showToast('Face not recognized. Access denied.', 'error');
                    
                    elements.startBtn.disabled = false;
                    elements.startBtn.textContent = 'RETRY SCAN';
                    elements.startBtn.classList.remove('btn-disabled');
                }

            } catch (err) {
                Utils.console.log('Scan error: ' + err.message, 'error');
                addStreamData('Error: ' + err.message);
            }

        }, 100);
    };

    // Cancel face auth
    const cancel = () => {
        Utils.console.log('Cancelling face auth...', 'system');

        if (state.scanInterval) {
            clearInterval(state.scanInterval);
            state.scanInterval = null;
        }

        stopCamera();

        elements.interface.classList.add('hidden');
        elements.authMethods.classList.remove('hidden');

        setTimeout(resetUI, 300);
    };

    // Stop camera
    const stopCamera = () => {
        if (state.stream) {
            state.stream.getTracks().forEach(track => {
                track.stop();
                Utils.console.log('Track stopped: ' + track.kind, 'info');
            });
            state.stream = null;
        }
        if (elements.video) {
            elements.video.srcObject = null;
        }
    };

    // Reset UI
    const resetUI = () => {
        if (state.scanInterval) {
            clearInterval(state.scanInterval);
            state.scanInterval = null;
        }

        elements.detectionMeter.textContent = '0%';
        elements.detectionBar.style.width = '0%';
        elements.landmarksMeter.textContent = '--';
        elements.identityStatus.textContent = 'SCANNING';
        elements.identityStatus.className = 'font-orbitron text-3xl text-yellow-400';
        elements.matchResult.classList.add('hidden');
        elements.stream.innerHTML = '';

        elements.startBtn.disabled = false;
        elements.startBtn.textContent = 'INITIATE SCAN';
        elements.startBtn.classList.remove('btn-disabled', 'hidden');

        elements.registerBtn.disabled = false;
        elements.registerBtn.textContent = 'REGISTER OWNER';
        elements.registerBtn.classList.remove('btn-disabled');

        elements.abortBtn.disabled = false;
        elements.abortBtn.classList.remove('btn-disabled');
    };

    // Reset register button
    const resetRegisterButton = () => {
        elements.registerBtn.disabled = false;
        elements.registerBtn.textContent = 'REGISTER OWNER';
        elements.registerBtn.classList.remove('btn-disabled');
    };

    // Update status text
    const updateStatus = (message) => {
        if (elements.status) {
            elements.status.textContent = message;
        }
    };

    // Add data to stream
    const addStreamData = (text) => {
        if (!elements.stream) return;
        
        const data = document.createElement('div');
        data.textContent = `[${Utils.formatTime()}] ${text}`;
        elements.stream.appendChild(data);

        if (elements.stream.children.length > 8) {
            elements.stream.removeChild(elements.stream.firstChild);
        }
        elements.stream.scrollTop = elements.stream.scrollHeight;
    };

    // Disable buttons
    const disableButtons = () => {
        elements.startBtn.disabled = true;
        elements.startBtn.classList.add('btn-disabled');
        elements.registerBtn.disabled = true;
        elements.registerBtn.classList.add('btn-disabled');
    };

    // Public API
    return {
        init,
        register,
        startScan,
        cancel,
        stopCamera
    };
})();

// Make available globally
window.faceAuthModule = FaceAuthModule;