# Privacy Policy for ChordApp

**Effective Date:** September 30, 2026  
**Last Updated:** September 30, 2026

ChordApp ("we", "our", or "the App") is committed to protecting your privacy. This Privacy Policy details our practices concerning information collection, use, and disclosure when you use our mobile application.

---

### 1. Summary: 100% On-Device & Zero Data Collection

- **Audio is processed 100% locally on your device in real-time.**
- **No audio or voice recordings are ever stored, recorded, collected, or transmitted over any network.**
- **No personal data, identifiers, or usage analytics are collected, tracked, or sold.**
- **ChordApp operates completely offline without external server dependencies.**

---

### 2. Microphone Access and Audio Processing

ChordApp requires access to your device's microphone (`android.permission.RECORD_AUDIO` on Android and `NSMicrophoneUsageDescription` on iOS).

#### Purpose of Access
Microphone access is requested strictly to capture ambient piano acoustics and identify musical chords in real time for visual display on your screen.

#### Real-Time On-Device Processing
All audio input captured by the microphone is processed **exclusively on your physical device** using local, on-device machine learning inference (via native ONNX Runtime). The audio signal is converted into short mathematical spectral frames solely to determine pitch activations.

#### Zero Audio Retention or Recording
Audio buffers exist solely in volatile device memory (RAM) for the few milliseconds required to compute pitch activations and are immediately overwritten. **ChordApp does not create, record, save, cache, or store audio files, voice recordings, or sound samples to your device's storage, nor to any remote server or cloud.**

#### Zero Network Transmission
Microphone data is **never transmitted across the internet**, uploaded to any remote server, or shared with any third party. ChordApp's chord detection engine functions fully without an active internet connection.

---

### 3. Personal Information and Device Data

- **No Personal Data Collected**: ChordApp does not ask for, collect, store, or process any personally identifiable information (such as your name, email address, phone number, location, or contacts).
- **No Third-Party Analytics or Advertising**: ChordApp does not integrate third-party ad networks, tracking scripts, or analytics SDKs (such as Google Analytics, Firebase Analytics, Meta SDK, or adjust).
- **No Telemetry**: We do not monitor or log your chord practice history, usage frequency, or interaction patterns.

---

### 4. Local User Preferences

ChordApp saves your application preferences (specifically: *Show Note Names*, *Keep Screen Awake*, and *Detection Sensitivity*) directly to your device's local sandboxed storage via React Native AsyncStorage. 

This configuration data never leaves your device, is not accessible by other applications, and is automatically erased if you uninstall the App.

---

### 5. Children's Privacy

ChordApp does not collect any personal information from anyone, including children under the age of 13 (or under the age of 16 in certain jurisdictions). The App is safe for all audiences and complies with COPPA (Children's Online Privacy Protection Act) and GDPR guidelines.

---

### 6. Security

Because ChordApp does not collect, transmit, or store personal information or audio recordings on external servers, the risk of data compromise or external interception is eliminated. All on-device processing occurs within the secure application sandbox provided by iOS and Android.

---

### 7. Changes to This Privacy Policy

We may update this Privacy Policy from time to time to reflect improvements or regulatory changes. Any changes will be posted on this page with an updated "Effective Date."

---

### 8. Contact Us

If you have questions, concerns, or feedback regarding this Privacy Policy or ChordApp's privacy practices, please contact us:

- **Repository**: [https://github.com/Ezra-creator/Chord-App](https://github.com/Ezra-creator/Chord-App)
- **Issue Tracker**: [https://github.com/Ezra-creator/Chord-App/issues](https://github.com/Ezra-creator/Chord-App/issues)
- **Developer**: Ezra-creator
