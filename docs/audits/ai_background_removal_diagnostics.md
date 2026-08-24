# AI background removal diagnostics

Дата: 2026-08-16.

## External sources

- IMG.LY GitHub: https://github.com/imgly/background-removal-js
- IMG.LY npm: https://www.npmjs.com/package/@imgly/background-removal
- remove.bg API docs: https://www.remove.bg/api

## Findings

1. The published site is https://vakdab.github.io/Vakdab/.
2. Browser dynamic import of https://cdn.jsdelivr.net/npm/@imgly/background-removal@1.7.0/+esm succeeded. Exports included `removeBackground`, `removeForeground`, `segmentForeground`, `applySegmentationMask`, `preload`, and `alphamask`.
3. The live `src/js/app-legacy.js?v=stickers-profile-v3` included the AI import and `removeFlatStickerBackground` fallback.
4. A real browser test created a 256x256 white canvas with a magenta circle, called `removeBackground` using model `isnet_fp16`, device `cpu`, and PNG foreground output. It succeeded with a PNG Blob of 8686 bytes in approximately 21.9 seconds.
5. Therefore the AI package and model can run in the browser. The likely user-facing issue is that the old sticker shown in the screenshot was uploaded before the AI change, or the app's upload flow falls back/does not visibly distinguish the processed result. The next fix should add an explicit processed-image preview/verification before upload and ensure the newly returned AI PNG is the URL saved for the sticker.
6. IMG.LY documentation states that the first run downloads and caches model/WASM assets, and that the result is a PNG Blob. It also documents `output.type: 'foreground'`, `output.format: 'image/png'`, and model options including `isnet_fp16`.
7. remove.bg official API requires an API key in `X-Api-Key`; the VakDab static site does not currently have a remove.bg connector/key, so the browser-based IMG.LY implementation is the suitable no-key approach.

## Follow-up diagnosis

8. Switching to `isnet_quint8` exposed a real bug in the progress callback contract: the @imgly module raised a Zod `invalid_return_type` error for `progress`, expecting `void` but receiving `number`. The current VakDab callback calls `showToastProgress(...)`; although that function is intended to return undefined, the callback contract must be made explicit with a block body and `return undefined` to avoid any return-value inference/validation issue. The prior browser test with `isnet_fp16` did not include the progress callback and succeeded.
9. The fix should use a progress callback that explicitly ends with `return undefined;`, test `isnet_quint8` again, and keep the mobile-friendly smaller model plus visible progress toast.

## Model compatibility diagnosis

10. `isnet_quint8` fails in the browser with the same Zod `invalid_return_type` error for an internal `progress` callback even when no progress callback is supplied by the caller. This appears to be a compatibility bug in the 1.7.0 CDN build/configuration for the quint8 model.
11. `isnet_fp16` without a progress callback succeeds in the browser, returning a PNG Blob of 1580 bytes in approximately 18.6 seconds on a 64x64 test image. The stable fix is therefore to revert the production call to `isnet_fp16`, remove the external progress callback, and use the local rotating status toast plus timeout.
