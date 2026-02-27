/**
 * OMEGA SECURITY SYSTEMS - Utility Functions
 */

const Utils = {
    // Sleep/delay function
    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    // Generate random ID
    generateId: (prefix = 'ID') => {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
    },

    // Format time
    formatTime: (date = new Date()) => {
        return date.toLocaleTimeString('en-US', { hour12: false });
    },

    // Format date
    formatDate: (date = new Date()) => {
        return date.toISOString().split('T')[0];
    },

    // Format uptime
    formatUptime: (seconds) => {
        const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
        const mins = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${hours}:${mins}:${secs}`;
    },

    // Base64 encoding/decoding for ArrayBuffer
    arrayBufferToBase64: (buffer) => {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return window.btoa(binary);
    },

    base64ToArrayBuffer: (base64) => {
        const binary_string = window.atob(base64);
        const len = binary_string.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    },

    // LocalStorage with error handling
    storage: {
        get: (key) => {
            try {
                const item = localStorage.getItem(key);
                return item ? JSON.parse(item) : null;
            } catch (e) {
                console.error('Storage get error:', e);
                return null;
            }
        },
        set: (key, value) => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
                return true;
            } catch (e) {
                console.error('Storage set error:', e);
                return false;
            }
        },
        remove: (key) => {
            try {
                localStorage.removeItem(key);
                return true;
            } catch (e) {
                console.error('Storage remove error:', e);
                return false;
            }
        }
    },

    // Toast notifications
    showToast: (message, type = 'info', duration = 4000) => {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const colors = {
            info: 'border-cyan-500 text-cyan-400',
            success: 'border-green-500 text-green-400',
            warning: 'border-yellow-500 text-yellow-400',
            error: 'border-red-500 text-red-400'
        };

        const icons = {
            info: 'ℹ️',
            success: '✅',
            warning: '⚠️',
            error: '❌'
        };

        const toast = document.createElement('div');
        toast.className = `toast pointer-events-auto bg-black/90 border-l-4 ${colors[type]} px-4 py-3 rounded shadow-lg flex items-center gap-3 min-w-[300px] backdrop-blur-sm`;
        toast.innerHTML = `
            <span class="text-lg">${icons[type]}</span>
            <div class="flex-1">
                <div class="font-mono text-sm">${message}</div>
            </div>
        `;

        container.appendChild(toast);
        
        // Trigger animation
        requestAnimationFrame(() => toast.classList.add('show'));

        // Auto remove
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, duration);

        return toast;
    },

    // Console styling
    console: {
        log: (msg, type = 'info') => {
            const styles = {
                info: 'color: #00d4ff',
                success: 'color: #00ff41',
                warning: 'color: #ffaa00',
                error: 'color: #ff0040',
                system: 'color: #00ff41; font-weight: bold;'
            };
            console.log(`%c[OMEGA-SEC] ${msg}`, styles[type] || styles.info);
        }
    },

    // Check browser support
    checkSupport: () => {
        return {
            webauthn: !!window.PublicKeyCredential,
            mediaDevices: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
            faceApi: typeof faceapi !== 'undefined',
            crypto: !!(window.crypto && window.crypto.getRandomValues),
            localStorage: (() => {
                try {
                    const test = '__storage_test__';
                    localStorage.setItem(test, test);
                    localStorage.removeItem(test);
                    return true;
                } catch (e) {
                    return false;
                }
            })()
        };
    },

    // Initialize matrix rain effect
    initMatrixRain: (canvasId = 'matrixCanvas') => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*';
        const fontSize = 14;
        const columns = canvas.width / fontSize;
        const drops = [];

        for (let i = 0; i < columns; i++) {
            drops[i] = Math.random() * -100;
        }

        const draw = () => {
            ctx.fillStyle = 'rgba(0, 5, 0, 0.05)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.fillStyle = '#00ff41';
            ctx.font = fontSize + 'px monospace';

            for (let i = 0; i < drops.length; i++) {
                const text = chars[Math.floor(Math.random() * chars.length)];
                ctx.fillText(text, i * fontSize, drops[i] * fontSize);

                if (drops[i] * fontSize > canvas.height && Math.random() > 0.975) {
                    drops[i] = 0;
                }
                drops[i]++;
            }
        };

        return setInterval(draw, 50);
    },

    // Initialize neural network background
    initNeuralNetwork: (canvasId = 'neuralCanvas') => {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener('resize', resize);

        const nodes = [];
        const nodeCount = 50;

        for (let i = 0; i < nodeCount; i++) {
            nodes.push({
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                vx: (Math.random() - 0.5) * 0.5,
                vy: (Math.random() - 0.5) * 0.5
            });
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            nodes.forEach((node, i) => {
                node.x += node.vx;
                node.y += node.vy;

                if (node.x < 0 || node.x > canvas.width) node.vx *= -1;
                if (node.y < 0 || node.y > canvas.height) node.vy *= -1;

                ctx.beginPath();
                ctx.arc(node.x, node.y, 2, 0, Math.PI * 2);
                ctx.fillStyle = '#00ff41';
                ctx.fill();

                // Draw connections
                nodes.forEach((other, j) => {
                    if (i === j) return;
                    const dx = node.x - other.x;
                    const dy = node.y - other.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);

                    if (dist < 150) {
                        ctx.beginPath();
                        ctx.moveTo(node.x, node.y);
                        ctx.lineTo(other.x, other.y);
                        ctx.strokeStyle = `rgba(0, 255, 65, ${1 - dist / 150})`;
                        ctx.stroke();
                    }
                });
            });

            requestAnimationFrame(animate);
        };

        animate();
    }
};

// Make available globally
window.Utils = Utils;