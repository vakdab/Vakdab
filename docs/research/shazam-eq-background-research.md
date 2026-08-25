# Shazam EQ and background playback research

Date: 2026-08-25.

## Equalizer reference

The user-provided repository [Spotify-10-Band-Equalizer-iOS](https://github.com/al3xndrz/Spotify-10-Band-Equalizer-iOS) describes a 10-band equalizer with frequencies **31, 63, 125, 250, 500, 1,000, 2,000, 4,000, 8,000, and 16,000 Hz**. It maps each gain to a normalized value from -1.0 to +1.0, equivalent to -12 to +12 dB, and lists presets including flat, bass boost, treble boost, V-shape, vocal, rock, and electronic. The repository is MIT licensed. Its implementation is an iOS Objective-C tweak using Apple's `AUNBandEQ`; it is not directly portable to a browser Mini App, so the transferable parts are the band frequencies, gain range, and presets rather than the iOS hook code.

## Telegram/iOS background playback

The official [Telegram Mini Apps documentation](https://core.telegram.org/bots/webapps) lists lifecycle and UI APIs but does not document a Mini App API that keeps an HTML audio element alive after the Mini App WebView is closed. The open [Telegram Mini Apps MediaSession feature request #81](https://github.com/Telegram-Mini-Apps/issues/issues/81) explicitly reports that `navigator.mediaSession` is disabled in Telegram Mini Apps and requests system lock-screen metadata and controls. Therefore a web-only Mini App cannot guarantee reliable background playback after the WebView is closed, especially on iOS. The practical implementation should add best-effort MediaSession metadata when available, preserve playback while the Mini App is merely backgrounded, and provide a Telegram-native fallback such as sending/opening the audio as a Telegram message for playback in Telegram's own media player.

## Live UI verification

Production v24 served the new HTML/CSS/JS. The public feed showed an imported `Sound House – youtube video #PdLCVAyAYbQ` track. Starting it revealed the player with `Фон` and `EQ` controls. Opening Audio Lab showed all ten controls: 31, 63, 125, 250, 500, 1k, 2k, 4k, 8k, and 16k, plus the seven presets Flat, Bass Boost, Treble, Vocal, V-Shape, Rock, and Electronic.
