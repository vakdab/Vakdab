# Hero edge-to-edge QA

Date: 2026-08-21

A clean v12 preview was checked after adding the hero edge-to-edge fix. The hero wrapper now has no border, keeps `overflow: hidden`, and uses the dark shell background. The slide, background, and overlay extend 2px beyond the wrapper bounds so no light seam can appear between the image and rounded edges.

The DOM geometry check confirmed the wrapper and slide share the same rendered width, the wrapper has `border: 0px` and `overflow: hidden`, and the background layer is oversized beyond the slide bounds. Syntax checks, all three regression fixtures, and `git diff --check` passed.
