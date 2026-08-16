# Дослідження джерела розкладу Mikai

Дата: 2026-08-16

Сторінка-орієнтир: https://mikai.me/anime/7382-perekury-za-supermarketom

На сторінці відображаються статус «Онґоінґ», кількість серій 12 / 12 та таблиця оновлень епізодів із колонками «Коли», «Серія», «Команда», «Плеєр». HTML сторінки збережено браузером у /home/ubuntu/browser_html/mikai_me_7382-perekury-za-supermarketom_1786875712694.html.

Попередній висновок: розклад потрібно шукати в даних Mikai або його внутрішньому API, а не в AnimeOn. Наступний крок — проаналізувати HTML, JavaScript-бандли та мережеві URL Mikai.


## Підтверджені API-знахідки

Сторінка `https://mikai.me/schedule` показує розклад за днями тижня. У браузерних мережевих ресурсах підтверджено домен `https://api.mikai.me`.

Перевірений endpoint:

`GET https://api.mikai.me/v1/schedule`

Він повертає JSON у формі `{ ok: true, result: { monday: [...], tuesday: [...], wednesday: [...], thursday: [...], friday: [...], saturday: [...], sunday: [...] } }`. Елемент розкладу містить `anime.id`, `anime.slug`, `anime.details.names.name`, `anime.details.names.nameNative`, `anime.details.names.nameEnglish`, `anime.media.posterUid`, `episode` та `airing` у форматі `YYYY-MM-DD HH:mm`.

Для конкретного прикладу `GET https://api.mikai.me/v1/anime/7382` повертає `nextEpisode`, зокрема `episode` і `airing`. Але для сторінки розкладу потрібен загальний endpoint `/v1/schedule`.
