# Profile thought note QA

Date: 2026-08-21

A clean v16 guest profile preview was checked. The thought trigger appears at the lower-right edge of the avatar. Clicking it opens an animated thought bubble with the Ukrainian title `Думка`, a 120-character textarea, live character count, close button, and `Зберегти` action.

The bubble uses a cloud-like rounded shape with two tail circles and a pop animation. It is keyboard accessible through a real button, supports Escape to close, click-outside close, and reduced-motion fallback. The profile renderer and settings save API are wired without removing the existing avatar navigation hooks.

Syntax checks, all three regression fixtures, and `git diff --check` passed.
