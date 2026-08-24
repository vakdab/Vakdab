# Hide brand and raise hero QA

Date: 2026-08-21

The visible VakDab brand row is hidden while the `#logoHome` hook remains in the DOM for player/home navigation compatibility. The header has `height: 0px`, `visibility: hidden`, and no padding or margin. The hero wrapper has `margin-top: 0px` and starts at `y=0`, immediately at the top of the app shell.

A clean v14 mobile preview showed no visible VakDab title above the hero and the hero moved up to the top edge. Syntax checks and all three regression fixtures passed.
