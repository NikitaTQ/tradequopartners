# TradeQuo Partner Program: сайт

Статический сайт без сборки. Всё, что уходит на хостинг, лежит в `site/`.

```
site/
  index.html                 лендинг (Partner Program v2)
  commission-plans/ dashboard/ marketing-hub/ academy/ success-stories/
                             концепт-страницы, у каждой свой URL
  embeds/                    3D-блоки и ролики (iframe, грузятся при подходе к экрану)
  vendor/                    three.js и React — свои копии, без внешних CDN
  assets/css/site.css        стили (перенесены из дизайна один в один; в index.html встроены автоматически)
  assets/fonts/              шрифты (свои копии Google Fonts, без запросов к Google)
  assets/js/landing.js       логика лендинга: калькулятор, форма с подписью, FAQ, флип, звёзды…
  assets/js/transition.js    переход между страницами через лоадер
tools/
  pages.json                 тексты концепт-страниц
  build-pages.py             пересобирает концепт-страницы из pages.json
```

## Локальный просмотр

```
cd site && python3 -m http.server 8000
```

Откройте http://localhost:8000. Отправка формы локально выдаст ошибку: принимать заявки умеет только Netlify. Открыть `index.html` двойным кликом не получится: встроенным блокам нужен сервер.

## Публикация на Netlify

Настройки лежат в `netlify.toml`: публикуется папка `site/`, сборки нет.

**Вариант 1. Через GitHub (рекомендую): каждый пуш выкатывается сам.**
1. Запушьте репозиторий на GitHub.
2. В Netlify нажмите **Add new site → Import an existing project → GitHub** и выберите репозиторий. Поля сборки оставьте как есть: Netlify возьмёт их из `netlify.toml`.
3. Нажмите **Deploy**.

**Вариант 2. Вручную, без GitHub.** Откройте https://app.netlify.com/drop и перетащите туда папку `site/` или архив `tradequo-partners-site.zip`.

**Домен tradequopartners.com.** В Netlify откройте **Domain management → Add a domain** и добавьте `tradequopartners.com`. Дальше одно из двух:
- перенесите домен на DNS Netlify: у регистратора замените NS-серверы на те, что покажет Netlify;
- или оставьте DNS у регистратора и пропишите `A @ → 75.2.60.5` и `CNAME www → <имя-сайта>.netlify.app`.

HTTPS (Let's Encrypt) Netlify включит сам.

**Заявки с формы** уходят в Netlify Forms (форма `partner-request`). Они видны в разделе **Forms** панели Netlify. Там же можно включить уведомления на почту или в Slack: **Forms → Form notifications**. Если раздел Forms пустой, включите **Forms → Enable form detection** и передеплойте сайт.

## Что нужно решить до публичного запуска

- **Куда приходят заявки.** Сейчас форма отправляет их в Netlify Forms. Чтобы слать в CRM, поменяйте `data-endpoint="/"` у формы в `tools/i18n/landing.html` на адрес вебхука и пересоберите страницы (`python3 tools/build-i18n.py`). Поля уходят POST-запросом: `name`, `email`, `phone`.
- **Ссылки Privacy Policy и Partner Terms** пока ведут на `#`.
- **Концепт-страницы** закрыты от индексации (`noindex`), потому что тексты на них черновые. Кнопки на них, как и в дизайне, пока никуда не ведут. Когда тексты будут готовы, уберите строку `robots` в `tools/build-pages.py`, запустите `python3 tools/build-pages.py` и добавьте страницы в `site/sitemap.xml`.

## Правка концепт-страниц

Отредактируйте `tools/pages.json` и запустите `python3 tools/build-pages.py`.

## Новая версия ролика или 3D-блока из Claude Design

1. Положите новый HTML-файл в `site/embeds/` под тем же именем, например `tradequo-film.html`.
2. Запустите:
   ```
   cd tools && npm install && npm run optimize-embeds
   ```
   Скрипт переведёт файл на локальные three.js и React из `site/vendor/` и заранее скомпилирует JSX в `<имя>.app.js`. Без этого шага блок будет грузить Babel (~3 МБ) и компилировать код прямо в браузере, а страница начнёт тормозить.
3. Запустите `python3 tools/stamp-assets.py`: он обновит метки версий `?v=…` в ссылках на файлы, чтобы браузеры не показывали старую версию из кэша.
4. Закоммитьте изменения: Netlify выкатит их сам.

После любой правки в `site/assets/` или `site/embeds/` тоже запускайте `python3 tools/stamp-assets.py`. Он проставит метки версий и заново встроит `site.css` в `index.html`. `build-pages.py` делает это сам. Файлы в `assets/`, `embeds/` и `vendor/` браузеры кэшируют на год, поэтому без этого шага посетители могут не увидеть правку.

## Языки

На 18 языках собираются три страницы: главная, «Partner Programs» (`/programs/`) и «Commission Plan» с калькулятором (`/commission-plan/`). Английский лежит в корне сайта, остальные языки в папках `/ar/`, `/de/`, `/zh-hans/` и т. д. (например, `/de/programs/`). Переключатель языков находится в шапке. Новые страницы открываются только из веерного меню справа внизу (на телефоне — из красной кнопки меню). Концепт-страницы (`/dashboard/`, `/marketing-hub/`, `/academy/`, `/success-stories/`) убраны из меню; файлы остались на сайте, только на английском.

- `tools/i18n/landing.html`, `programs.html`, `commission.html` — шаблоны. Вместо текста в них ключи `{{ключ}}`, а в атрибутах `{{@ключ}}`. `{{> имя}}` вставляет общий кусок из `tools/i18n/partials/` (шапка, лоадер, веерное меню, футер), `{{faq:префикс:N}}` — N карточек FAQ.
- `tools/i18n/strings/<язык>.json` — тексты главной и общих частей (меню, футер). Главный файл — `en.json`; если ключа нет в переводе, подставляется английский.
- `tools/i18n/strings/programs/<язык>.json` и `strings/commission/<язык>.json` — тексты новых страниц.
- Список страниц и пунктов веерного меню — `PAGES` и `FAN` в начале `tools/build-i18n.py`.
- `tools/i18n/languages.json` — адреса, названия в переключателе, направление письма.
- `tools/i18n/TRANSLATION_BRIEF.md` — бриф для переводчиков: тон, глоссарий, ограничения длины.

Как поменять текст:
1. Исправьте `en.json` и переводы. Каждый язык — отдельный файл с теми же ключами.
2. Проверьте переводы: `python3 tools/check-strings.py` (ключи, метки `<red>`, цифры, длина надписей на кнопках).
3. Соберите страницы: `python3 tools/build-i18n.py`. Скрипт перезаписывает `site/[<язык>/][<страница>/]index.html`, поэтому правьте шаблоны и JSON, а не готовые страницы.
4. Если менялись подписи кристаллов (`embed.crys.*`), запустите `python3 tools/make-caption-fonts.py` (шрифты для CJK) и `cd tools && npm run posters` (кадры-заглушки).

### Автоперевод браузера

Автоперевод (например, в Chrome) разрешён по умолчанию. В конце меню языков есть переключатель «Auto-translate»: если посетитель его выключит, выбор запоминается в браузере (`localStorage`), страница перезагружается и больше не переводится автоматически (`translate="no"` и `<meta name="google" content="notranslate">` ставит скрипт в `partials/head.html`).

### Калькулятор комиссий

`site/assets/js/plan.js`: активные клиенты × лоты на клиента × ставка уровня (Starter до 50 клиентов — $5.00, Gold 51–200 — $7.50, Elite от 201 — $10.00 за лот). Ставки и пороги заданы в начале файла и в шаблоне `commission.html` (таблица уровней) — меняйте в обоих местах.

### Переходы между страницами

`site/assets/js/transition.js` + блок `.tq-loader` в `site/assets/css/site.css`, разметка — `tools/i18n/partials/loader.html` (и такая же в `tools/build-pages.py`). При переходе логотип TradeQuo за ~0,46 с наливается чёрными «чернилами», на новой странице за ~0,5 с сливается, и экран гаснет. Это обычный SVG без WebGL; ссылки предзагружаются при наведении. Старый 3D-лоадер (`site/embeds/tradequo-loader.html`) больше нигде не подключён.

