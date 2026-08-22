# Profile identity and birthdate calendar QA

- Local route `http://127.0.0.1:4173/?profile-identity-v42=1#settings` rendered the settings page successfully.
- Nickname field displays `@user`, placeholder is `@username`, and the hint says the handle starts with `@`.
- Name field is a separate plain text field with placeholder `Необов'язково`.
- Birthdate trigger displays `Оберіть дату` and the native date input is not visually exposed.
- Clicking the trigger opens the custom calendar popover.
- Calendar uses Ukrainian month/year (`серпень 2026 р.`), Monday-first weekday order (`ПнВтСрЧтПтСбНд`), day buttons, previous/next month controls, `Сьогодні`, and `Готово`.
- Future dates are disabled by the picker logic; the visible current month is August 2026 in the sandbox clock.
- The browser screenshot showed the popover opening below the trigger and responsive width within the settings content.

Next: test date selection/clear, inspect profile display/avatar initials, bump cache marker, run checks, commit/push, wait for Pages, and verify live marker.

Під час браузерного тесту календар відкрився коректно. Один координатний тестовий клік закрив поповер без зміни значення, тому додатково запущено DOM-перевірку через click-події; консоль не повернула серіалізований результат, тож перед релізом виконано окрему перевірку через DOM/localStorage.

Детермінований DOM-тест успішний: після вибору `2026-08-10` hidden input отримав `2026-08-10`, кнопка показала `10 серпня 2026 р.`, а локальний профіль отримав таке саме `birthdate`.

Identity input QA успішний: введення `cool_name` зберегло `nickname: "@cool_name"`, а введення `@Оля` зберегло `realName: "Оля"`; birthdate не змінився. Перехід на `#profile` без авторизації коректно показав україномовний auth gate, тому для avatar/profile header потрібен окремий guest-mode smoke test.

Guest-mode profile smoke test успішний: header показує `Оля` окремим primary рядком і `@cool_name` окремим handle рядком. Після owner avatar fallback patch сторінка лишається функціональною; screenshot route також підтвердив, що identity presentation не змішався.

Live QA після Pages deployment успішний: `https://vakdab.github.io/Vakdab/?profile-identity-v42=1#settings` завантажив налаштування з полями `@username`, plain `Ім'я` та custom trigger `Оберіть дату`. Попередній чорний стан був коротким моментом завантаження; після очікування сторінка повністю відобразила v42 UI.
