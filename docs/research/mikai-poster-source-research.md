# Mikai poster/banner source research

Source checked: https://mikai.me/ (accessed 2026-08-22).

The homepage HTML exposes its hero/banner as `https://images.mikai.me/banner/big/e8645ed7-76e7-11f1-8264-b6096736b69a.webp` at the time of inspection. The homepage feature for the title «Вигнаний важкоозброєний лицар стає непереможним завдяки знанням гри» uses an image URL `/images/anime_slider/vazhkoozbroienyi_logo.png` and links to `/anime/7412-vyhnanyi-vazhkoozbroienyi-lyts-emozhnym-zavdiaky-znanniam-hry`.

Mikai catalog cards use image hosts under `images.mikai.me`, with paths such as `/poster/small/{uuid}.webp` and `/ua_poster/small/{uuid}.webp`. The featured hero/logo asset is a separate `images/anime_slider/*_logo.png` path, indicating the logo-like title graphic is an image asset rather than text rendered by the browser.

The requested screenshot appears to show a title-logo graphic embedded in or overlaid on a Mikai anime poster/banner. Exact per-title player route still needs to be inspected before implementation; no TMDB source should be used.

Direct asset verification: `https://mikai.me/images/anime_slider/vazhkoozbroienyi_logo.png` returned HTTP 200, `image/png`, dimensions 1860×900. It is therefore a wide transparent/graphic title-logo poster asset, not a dub/team logo.

Current VakDab Hikka player flow uses Hikka poster URLs and local source metadata; it does not currently read Mikai's `/images/anime_slider/*_logo.png` asset path. The Mikai home hero uses this asset as a separate centered image over the hero artwork, so the correct term is a **hero/banner title logo** or **anime title-logo overlay**, not a voice-acting logo.

Local implementation QA (v50): opening a live Hikka title in the VakDab player produced a Mikai URL in the hero poster layer, e.g. `https://images.mikai.me/ua_poster/big/248d1a88-8925-11f1-ac09-62951faff73e.webp`. The player UI displayed the Mikai poster asset, while title, episode, dub and Hikka metadata remained functional.
