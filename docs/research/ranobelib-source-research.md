# RanobeLib source research

## Initial page

Source URL: https://ranobelib.me/ru?section=home-updates

RanobeLib is a Russian-language novel site. The updates page exposes book URLs in the form `/ru/book/{numericId}--{slug}` and chapter URLs in the form `/ru/{numericId}--{slug}/read/v{volume}/c{chapter}` with an optional `bid` query parameter. Cards expose cover images from `cover.cdnlibs.org`, title, chapter number, and source language/country. Example observed card: `/ru/book/51849--hoegwija-sayongseolmyeongseo-novel` and chapter `/ru/51849--hoegwija-sayongseolmyeongseo-novel/read/v1/c673?bid=26112`.

The page includes mixed content (novel, WN, LN, fanfic, Korean/Chinese/Japanese/English works). The adapter must use Hikka for the Ukrainian catalog metadata/posters while using RanobeLib only for matched chapter/text reading.

## Book and reader findings

Book detail URL: https://ranobelib.me/ru/book/51849--hoegwija-sayongseolmyeongseo-novel

The book page exposes a direct first-chapter link `/ru/51849--hoegwija-sayongseolmyeongseo-novel/read/v01/c01`, reports 1014 chapters, and has a Chapters section. The loaded reader normalized the route to `/read/v1/c0?bid=3821`, showing that chapter numbering and volume are encoded in the URL and an internal `bid` query may identify the translation/book edition.

The reader page contains the chapter heading and content in HTML. Chapter 0 in the inspected title is an image-only illustration chapter with images under `https://ranobelib.me/uploads/ranobe/{slug}/chapters/{chapterAssetId}/{filename}`. It also exposes a next-chapter link and chapter navigation. Therefore the adapter must support both text chapters and image-only illustration chapters rather than assuming every chapter is plain text.

The first-chapter direct URL initially showed a loading screen, then client-side navigation resolved to chapter 0. A robust adapter should parse the final DOM/HTML or use the site’s own endpoint discovered from scripts, and should preserve volume/chapter labels.

## Hikka novel metadata

The Hikka novel endpoint is `https://api.hikka.io/novel?page={page}&size={size}` and accepts a POST body such as `{ "only_translated": true }`. Novel items expose `title_ua`, `title_en`, `title_original`, `slug`, `image`, `chapters`, `volumes`, `translated_ua`, `genres`, `synopsis_ua`, `synopsis_en`, `status`, `year`, and `media_type`. VakDab already maps these through `hikkaItem(item, 'novel')` and uses Hikka `image` as the poster.

This supports a split-source design: keep Hikka as the catalog/poster/metadata source and attach a RanobeLib match plus chapter URL only when a title match is found.

## Text chapter findings

Text chapter URL: `https://ranobelib.me/ru/51849--hoegwija-sayongseolmyeongseo-novel/read/v1/c1?bid=3821`

The reader exposes a heading such as `Том 1 Глава 1 - Стартовая точка`, followed by plain text paragraphs and dialogue lines in the HTML. The page has previous/next links, a link back to the book’s chapter list, and a visible source translation team. The page may show an age-warning modal for some titles, so a server-side/static fetch must tolerate the modal and extract the underlying chapter content.

For the Ukrainian reader, paragraphs can be translated individually or in bounded batches through a CORS-enabled translation endpoint, with a local in-memory/session cache. The source text is Russian; the target is Ukrainian (`ru` → `uk`).

## Fetch fallback

Direct browser `fetch()` and `corsproxy.io` can return RanobeLib’s generic `код ошибки 1` HTML instead of chapter content, even though interactive navigation renders the chapter. The HTTPS text extraction endpoint `https://r.jina.ai/https://ranobelib.me/...` returned the real chapter as Markdown with a title, book/chapter links, heading, and Russian paragraph lines. The implementation therefore needs a Jina HTTPS fallback and Markdown parsing before the CORS HTML fallback.

