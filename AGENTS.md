# Repository Guidelines

## Project Structure & Module Organization

- `tetris.html` contains the entire app: HTML markup, CSS in a `<style>` block, and JavaScript in a `<script>` block.
- There are no external dependencies, build pipeline, or asset folders.
- If the project grows, prefer splitting into `src/` (JS), `styles/` (CSS), and `assets/` (images/sounds), but keep the single-file layout unless the change clearly improves maintainability.

## Build, Test, and Development Commands

This is a static web page. No build step is required.

- Run a local server (recommended):
  - `python -m http.server 8000`
  - Open `http://localhost:8000/tetris.html`
- Quick check (less consistent): open `tetris.html` directly in a modern browser.

## Coding Style & Naming Conventions

- Indentation: 4 spaces (match existing formatting).
- JavaScript:
  - Use `const`/`let` (no `var`) and always use semicolons.
  - Keep functions small and single-purpose; avoid large, multi-responsibility handlers.
- Naming:
  - `camelCase` for variables/functions (e.g., `dropPiece()`).
  - `PascalCase` for classes (e.g., `Tetris`).
  - `UPPER_SNAKE_CASE` for constants (e.g., `CONFIG`).
- Avoid frameworks/bundlers unless there is a clear, documented need.

## Testing Guidelines

No automated tests are currently set up. Validate changes manually:

- Load the page and verify keyboard controls (move/rotate/drop, pause/resume, reset).
- Confirm line clears, scoring/level progression, and “game over” behavior.
- If input/rendering changes, check at least one Chromium-based browser and Firefox.

## Commit & Pull Request Guidelines

- Commit messages: keep a short, descriptive subject line. History uses a prefix style like `Initial commit: …`; follow a similar `topic: summary` pattern when appropriate.
- Pull requests:
  - Include a brief description and local test steps.
  - For gameplay/UI changes, include a screenshot or short GIF.
  - Keep diffs focused; avoid unrelated refactors.

## Agent-Specific Notes

- Prefer minimal, surgical edits within `tetris.html`.
- Keep the game playable with zero install steps and no external dependencies.
