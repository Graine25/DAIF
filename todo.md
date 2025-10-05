# Roadmap

## ✅ Foundation
- [x] Capture shared domain model for functions, graph elements, queueing, and audit log (`src/common/domain.ts`).
- [x] Persist project state via Electron main-process store with JSON fallback (`src/main/state`).
- [x] Bridge renderer access with IPC handlers and preload API (`src/main/ipc`, `src/main/preload.ts`).
- [x] Surface baseline project state in the renderer for future tabs (`src/renderer/main.ts`).
- [x] Introduce call graph tab skeleton with live stats, groups, and queue placeholders (`src/renderer/index.html`).

## 🚧 Next Up
- [ ] Function Analyzer UI skeleton: lists, detail panes, mock data loader.
- [ ] Call Graph canvas renderer (React Flow or custom) layered onto the new scaffold.
- [ ] Code assembly tab layout with editor placeholder + function queue sidebar.
- [ ] IPC contract for project mutations (queue updates, placements) with optimistic UI updates.
- [ ] Replace JSON store with pluggable provider (SQLite or remote service) once workflows solidify.
- [ ] Integrate IDA MCP connector and LLM orchestrator (stub until backend ready).

## 📌 Notes
- Keep renderer strictly within exposed preload APIs; never enable NodeIntegration.
- Log all LLM mutations through the audit channel before mutating project state.
- Preserve raw MCP payloads alongside LLM summaries to allow re-prompts without re-fetching from IDA.
