# Honey Manga source research

Source: https://honey-manga.com.ua/

## Observed public routes and data

- Main site: `/`
- Catalog: `/comics`
- Adult catalog: `/mature`
- Book detail: `/book/{uuid}`
- Search is exposed in the header as a client-side control.
- The catalog title reports **1,889** comics.
- The catalog renders **30 cards per page** and exposes pagination pages 1–5, 63, plus next.
- Catalog cards include image CDN URLs on `hmvolumestorage.b-cdn.net`, category/type labels such as `Манхва`, `Манґа`, `Новела`, and links like `/book/8c336683-10ca-4912-9666-e18a1689da6e`.
- Public filters include genre (`За жанрами`) and type (`Тип`), with add/apply/clear controls.
- Sorting control defaults to `За оновленнями`.
- Site is a Next.js application (`#__next` root); direct page text extraction exposes hydrated catalog content and pagination.

## Important caveat

The source has a public catalog and public book URLs. The source also separates adult content at `/mature`.

## Detail page findings

For book `8c336683-10ca-4912-9666-e18a1689da6e`, the public detail page shows 11 chapters and links them as `/read/{chapterUuid}/{bookUuid}`. The first visible link is `/read/15b0a375-f0ae-4469-8606-2ddc97f3a61e/8c336683-10ca-4912-9666-e18a1689da6e`.

Observed browser resource URLs include:

- `https://data.api.honey-manga.com.ua/manga-teams/public/{teamUuid}`
- `https://data.api.honey-manga.com.ua/user-read-next-records?id={bookUuid}`
- `https://data.api.honey-manga.com.ua/v2/chapter/cursor-list`
- `https://data.api.honey-manga.com.ua/comment/cursor-list`
- `https://data.api.honey-manga.com.ua/pinned-comments?objectId={bookUuid}&objectType=MANGA`
- CDN resources at `https://hmvolumestorage.b-cdn.net/public-resources/{resourceUuid}?optimizer=image` and optional `width`.

The chapter links provide the required chapter id and project/book id for reader API requests.

## Confirmed chapter and frame API contract

The chapter list is a public `POST` request to `https://data.api.honey-manga.com.ua/v2/chapter/cursor-list` with JSON `{ "page": 1, "pageSize": 10, "mangaId": "{bookUuid}", "sortOrder": "DESC" }`. The response is `{ cursorNext, cursorPrev, data, counter }`; each `data` item includes `id`, `volume`, `chapterNum`, `subChapterNum`, `title`, `lastUpdated`, `mangaId`, `chapterResourcesId`, `isMonetized`, `minimumPrice`, `likes`, `views`, `bookmarked`, and `commented`.

Frames are requested with `GET https://data.api.honey-manga.com.ua/v2/chapter/frames/{chapterUuid}/{bookUuid}`. A free chapter returns `{ id, resourceIds }`, where `resourceIds` is an object keyed by page order (`"0"`, `"1"`, …) and values are resource UUIDs. A monetized chapter returns HTTP 403 with `{ "message": "Forbidden", "statusCode": 403 }` when called without access credentials; the catalog and free chapters remain publicly usable.

The Honey Manga reader builds image URLs from the frame resource UUID. The main `hmvolumestorage.b-cdn.net` host refused the sandbox request, while the source's fallback `https://honeymangastorage-nocache.b-cdn.net/public-resources/{resourceUuid}?optimizer=image&quality=85&width=992` returned HTTP 200 image/png. The adapter should use the nocache CDN as the primary/fallback URL and retain the existing image retry/fallback behavior.

## Confirmed catalog, filters and adult contract

Catalog requests use `POST https://data.api.honey-manga.com.ua/v2/manga/cursor-list` with JSON shaped as `{ sort: { sortBy: "lastUpdated", sortOrder: "DESC" }, page, pageSize: 30, filters }`. The `/comics` page removes empty UI filters and always adds `{ filterBy: "adult", filterValue: ["18+"], filterOperator: "NOT_IN" }`. The successful response has `{ cursorNext, cursorPrev, counter, data }`; the observed non-adult counter is **1,889**. Each manga item includes `id`, `posterUrl`, `posterId`, `bannerId`, `title`, `lowTitle`, `alternativeTitle`, `type`, `titleStatus`, `translationStatus`, `lastUpdated`, `genres`, `tags`, `description`, `genresAndTags`, `origins`, `authors`, `artists`, `adult`, `isAdultCover`, `searchByTitle`, `alternativeTranslations`, `rate`, `rateScore`, `votenums`, `likes`, `views`, `bookmarked`, `commented`, and `chapters`.

The adult catalog uses the same endpoint with `{ filterBy: "adult", filterValue: ["18+"], filterOperator: "IN" }`; the observed counter is **263**. Genre/tag/type metadata endpoints are `GET https://data.api.honey-manga.com.ua/genres-tags/genres-list`, `GET https://data.api.honey-manga.com.ua/genres-tags/tags-list`, and `GET https://data.api.honey-manga.com.ua/manga-type/manga-type-list`. The service also exposes `GET https://search.api.honey-manga.com.ua/v2/manga/pattern?query={term}` for title pattern lookup, while direct manga retrieval is `GET https://data.api.honey-manga.com.ua/manga/{uuid}` and batch lookup is `GET https://data.api.honey-manga.com.ua/v2/manga/ids?ids=...`.
