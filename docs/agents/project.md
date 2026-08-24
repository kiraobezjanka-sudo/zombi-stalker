# Проект и структура

## О проекте

`zombi-stalker` — небольшая браузерная 2D survival-horror игра про полицейский участок. Игрок собирает три улики, избегает зомби и добирается до выхода.

Игра работает без нейросетей. Поведение зомби построено на конечном автомате, проверке видимости и обычном поиске пути по клеткам.

## Технологии

- Node.js 22+ и pnpm.
- React 19.
- Next.js 16 и Vinext.
- Canvas API для игрового поля.
- GitHub Pages для превью Pull Request.

## Основные файлы

- `app/page.tsx` — состояние игры, карта, управление, AI и Canvas-отрисовка.
- `app/globals.css` — визуальный стиль и адаптивная вёрстка.
- `next.config.ts` — статический экспорт и пути GitHub Pages.
- `.github/workflows/pr-preview.yml` — превью Pull Request.
- `.github/workflows/pages-main.yml` — публикация основной GitHub Pages-версии.
- `.openai/hosting.json` — настройки существующего проекта OpenAI Sites.

Не создавайте новый Sites-проект и не изменяйте production-деплой без явного запроса пользователя.
