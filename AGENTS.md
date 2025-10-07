# Repository Guidelines

## Project Structure & Module Organization
The Electron rewrite sources live under `src`. `src/main` holds the main-process bootstrap and preload bridge; keep system APIs isolated here. `src/renderer` contains the UI (`index.html`, `main.ts`, `styles.css`) and should stay platform-agnostic. Keep shared types and Node helpers in `src/types` and `scripts/` respectively. `dist/` contains TypeScript output and copied static assets; treat it as disposable. The legacy Qt C++ files (`main.cpp`, `MainWindow.cpp`, etc.) remain for reference only—avoid modifying them unless you are backporting behaviour.

## Build, Test, and Development Commands
Run `npm install` once per environment to populate `node_modules`. `npm run build` cleans `dist/`, compiles TypeScript via `tsc`, and copies renderer assets. `npm run start` performs a fresh build before launching Electron. `npm run dev` keeps `tsc --watch` and Electron running for iterative debugging. `npm run clean` removes generated bundles, and `npm run copy:static` refreshes HTML/CSS in place. After a successful build you can package installers with `npx electron-builder --mac universal` or `--win --x64`.

## Coding Style & Naming Conventions
Follow the existing two-space indentation and TypeScript strict-mode defaults. Use `PascalCase` for classes, `camelCase` for constants and functions, and suffix bridge files with `*.preload.ts` when applicable. Keep renderer state in dedicated controller classes (see `TabController` in `src/renderer/main.ts`) and prefer modular functions over large scripts. When editing CSS, align selectors with the BEM-like pattern already used (`.tab-button`, `.tab-panel`). Run `npm run build` before submitting to ensure `tsc` passes.

## Testing Guidelines
Automated tests are not yet wired up; add new suites under `src/**/__tests__` or `*.spec.ts` files colocated with the code. Prefer a lightweight runner such as Vitest or Jest for renderer logic and Playwright for end-to-end flows. Until formal tests exist, include manual verification notes in PRs (screenshots of tabs, platform info panel output, etc.). Maintain high coverage on IPC contracts and tab-switching logic once tests are introduced.

## Commit & Pull Request Guidelines
Adopt Conventional Commit prefixes (`feat:`, `fix:`, `chore:`) so changelog tooling remains viable. Keep commit scopes small and reference the touched area (`feat(renderer): add constructor tab actions`). Pull requests should describe the UI/IPC changes, list verification steps, and link any tracking issues. Attach screenshots or GIFs when the renderer changes, and rerun `npm run build` before requesting review.

## Security & Configuration Tips
Expose only vetted APIs through the preload bridge and keep `contextIsolation` enabled. Store secrets in environment files, never in source.
