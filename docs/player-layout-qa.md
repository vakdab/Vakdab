# Player layout QA

v51 local smoke: the application loads and the player route opens after the hero carousel changes. The player page now hides the `.hero-img` block to prevent the temporary poster/English title flash. The page-info flex order places `.content-top` first, `.anime-info-section` immediately after it, then ratings, actions, player controls, cast/related/media/details.

Фінальний v51 local player QA на «Проводжальниця Фрірен»: hero area з poster/English title не показується, українська назва є першою видимою назвою, а «Основна інформація» розташована перед rating cards/actions/player controls. Mikai poster більше не мерехтить перед відкриттям контенту.

v52 verification is in progress after applying the final rule that hides the circled ratings row. The exact Frieren card was triggered through the DOM for a player-order smoke test.

Фінальний v52 DOM smoke: player modal для «Проводжальниця Фрірен» відкрився, текстовий порядок у markdown — українська назва, короткі дані, теги, потім `Основна інформація`; в DOM snapshot немає visible English title. Screenshot renderer ще показує background card behind the modal due viewport capture, але player content itself has the intended CSS order.

Після додавання прихованого `.ratings-row` browser snapshot v52 все ще показав hero та rating cards. Computed-style check до CSS import fix дав `heroDisplay: block`, `ratingsDisplay: flex`; причина — `player-polish.css` мав старий nested import cache marker. Після оновлення app.css import до `player-layout-v52` потрібен повторний computed-style test перед commit.

Успішний v53 computed/live-like QA після cache fix: screenshot показує українську назву, метадані й теги; далі одразу `Основна інформація`. Hero poster/English title та обведені rating cards не відображаються. Кнопки дій і player controls залишилися доступними нижче.
