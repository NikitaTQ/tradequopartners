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

- **Куда приходят заявки.** Сейчас форма отправляет их в Netlify Forms. Чтобы слать в CRM, поменяйте `data-endpoint="/"` у формы в `site/index.html` на адрес вебхука. Поля уходят POST-запросом: `name`, `email`, `phone`.
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
