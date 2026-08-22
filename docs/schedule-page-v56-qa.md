# Schedule page v56 QA

## Local browser check

The local route `http://127.0.0.1:4173/index.html?v=20260822-schedule-page-v56#schedule` rendered the updated schedule page. The page showed the Ukrainian heading `Розклад виходу серій`, the explanatory copy, the dark VakDab atmospheric hero, the American-flag character cutout, and the grouped weekly schedule with live Mikai items.

The generated asset is stored at `src/assets/schedule/schedule-american-flag-girl.png` as a 1920×1920 RGBA PNG. Its transparent export was checked and the visible green-background residue was reduced with a targeted chroma-key cleanup before integration.

The schedule page contains 77 loaded schedule articles in the local response, with the existing click-to-player behavior preserved and keyboard activation added for schedule cards.

## Live browser check

The live route `https://vakdab.github.io/Vakdab/?v=20260822-schedule-page-v56#schedule` rendered the published hero and the Ukrainian `Розклад виходу серій` heading. The transparent character asset is requested from `src/assets/schedule/schedule-american-flag-girl.png`; the live page loaded the grouped weekly schedule with 77 schedule articles. Live schedule articles expose `role="button"`, Ukrainian `aria-label` values, and remain connected to the existing player-opening behavior.
