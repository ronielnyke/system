# OMEGA SECURITY SYSTEMS

Advanced Biometric Access Control System using Face Recognition and Fingerprint Authentication.

## Features

- **Face Recognition**: Real-time facial biometric authentication using face-api.js
- **Fingerprint Authentication**: WebAuthn platform authenticator support (Windows Hello, Touch ID, Android Biometric)
- **Multi-Factor Authentication**: Requires both face and fingerprint for access
- **Owner Registration**: First-time setup with secure biometric enrollment
- **Cyberpunk UI**: Matrix rain effects, neural network visualization, CRT scanlines

## Requirements

### For Face Recognition
- Modern browser (Chrome, Firefox, Edge, Safari)
- Webcam access
- JavaScript enabled

### For Fingerprint
- **HTTPS or localhost** (WebAuthn requirement)
- Device with biometric sensor:
  - Windows: Windows Hello (fingerprint or PIN)
  - macOS: Touch ID
  - iOS: Face ID / Touch ID
  - Android: Fingerprint sensor

## Installation

1. Clone or download the repository
2. Serve files over HTTPS (required for WebAuthn):
   ```bash
   # Using Python
   python -m http.server 8443
   
   # Using Node.js http-server
   npx http-server -S -C cert.pem -K key.pem -p 8443
   
   # Or use any HTTPS-enabled web server