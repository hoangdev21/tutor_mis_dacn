# Audio Files for WebRTC Calls

This directory contains audio files for the WebRTC calling feature.

## Files:

### ringtone.mp3
- **Purpose**: Plays when receiving an incoming call
- **Duration**: ~3-5 seconds (loops)
- **Usage**: User hears this when someone is calling them

### ringback.mp3
- **Purpose**: Plays when making an outgoing call (waiting for answer)
- **Duration**: ~3-5 seconds (loops)  
- **Usage**: Caller hears this while waiting for recipient to answer

## How to Add Audio Files:

Since GitHub Copilot cannot create actual MP3 files, you have two options:

### Option 1: Use Free Audio (Recommended)
Download free ringtone sounds from:
- https://mixkit.co/free-sound-effects/phone-ringtone/
- https://freesound.org/search/?q=phone+ringtone
- https://pixabay.com/sound-effects/search/phone-ringtone/

### Option 2: Generate Using Web Audio API
The code includes fallback to generate beep sounds using Web Audio API if files are not found.

## File Requirements:
- Format: MP3 (supported by all browsers)
- Size: < 100KB recommended
- Quality: 128kbps is sufficient
- Loop-friendly: Should sound good when repeated

## Current Implementation:
The code will:
1. Try to load MP3 files from this directory
2. If not found, generate tones using Web Audio API
3. Stop playing when call is answered/rejected/ended
