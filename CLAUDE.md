# CubePix — публічний репозиторій сайту: тут лише зібрані файли

Тут лежить **зібраний** сайт гри й веб-демо: https://roshevasternin.github.io/Game-CubePix/ (GitHub Pages: гілка `main`, корінь).
**Руками тут нічого не правимо.** Усе зі списку `.site-files` (і цей файл теж) робить збірка, і наступна публікація
це перепише. Інших файлів (`.gitignore`, `.gitattributes`) збірка не чіпає.

**Джерело** — приватний репозиторій **RoShevasternin/Game-CubePix-PRIVATE**, папка `cubepix/`:
- шаблон сторінки — `site/index.html`;
- тексти 15 мовами — `tools/site/strings_src.py`;
- налаштування — `site/site.json`;
- політика — `site/privacy.html`;
- збірка — `scripts/build-site.mjs`.

Повна інструкція — там, у **`cubepix/docs/site.md`**, розділ «Як редагувати й покращувати». Правила проєкту — у `CLAUDE.md` там же.
З власником спілкуйся українською, дружньо й просто (він звертається «бро»).

## Як змінити сайт
- **Хмарна сесія, відкрита на цьому репозиторії:**
  1. Підключи джерело: `add_repo` RoShevasternin/Game-CubePix-PRIVATE (push). Не виходить — скажи власнику, що в цьому
     акаунті Claude треба підключити GitHub і дати доступ до обох репозиторіїв.
  2. Склонуй його, прочитай його `CLAUDE.md` і `cubepix/docs/site.md` і працюй там.
  3. `npm run site` → `npm run site:test` → `npm run site:publish -- <цей клон> --commit`.
  4. Гілка, PR і злиття тут; зміни в джерелі — так само PR і злиття там.

  Простіше — щоб власник одразу відкрив сесію на Game-CubePix-PRIVATE.
- **Mac власника:** цей клон — `/Users/admin/Apps/Game CubePix SITE`. Працюй у клоні Game-CubePix-PRIVATE; якщо не знаєш
  його шляху, спитай у власника. Потім з його `cubepix/`:
  `npm run site && npm run site:test && npm run site:publish -- "/Users/admin/Apps/Game CubePix SITE" --commit --push`.
