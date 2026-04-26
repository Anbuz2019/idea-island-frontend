# Idea Island Frontend

正式前端工程，基于 `../frontend-code-design.md` 和 `../frontend-preview/index.html` 落地。

## Commands

```bash
npm install
npm run dev
npm run build
npm run preview
```

## Environment

Copy `.env.example` to `.env` when you need local overrides.

```text
VITE_API_BASE_URL=http://localhost:8091
VITE_USE_MOCK=true
```

`VITE_USE_MOCK=true` uses the local mock repository so the UI can run without the backend. Set it to `false` to call the real API described in `../interface.md`.

## Current Scope

- Desktop workbench layout with sidebar, material list, and detail panel.
- Inbox, library, and search workspaces.
- Independent list scrolling with infinite pagination.
- Quick capture modal.
- Material detail browsing and edit mode.
- Topic, tag group, and tag value settings.
- Tag group color configuration; tags inherit group color.

## Deployment

Docker deployment instructions are in [DEPLOYMENT.md](./DEPLOYMENT.md).
