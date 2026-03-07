# Contributing to Licensor

Thank you for your interest in contributing! This guide outlines our development process, code standards, and release workflow.

## Development Setup

### Prerequisites

- **Node.js** 20+ with pnpm 9+
- **Rust** (stable) — install via [rustup](https://rustup.rs/)
- **Git** 2.0+

### First-Time Setup

```bash
# Clone the repo
git clone https://github.com/yourusername/licensor.git
cd licensor

# Install Node dependencies (both www/ and app/)
pnpm install

# Development server (starts both dev server + Tauri desktop app)
pnpm dev

# Build for production (generates dist/ + Tauri binary)
pnpm build

# Clean build artifacts
pnpm clean

# Clean local database (dev only)
pnpm clean:db
```

#### Project Structure

```txt
licensor/
  www/              ← React frontend (TypeScript)
  app/              ← Rust backend (Tauri + SQLite)
  .github/workflows ← CI/CD pipelines
  package.json      ← Frontend dependencies + scripts
  Cargo.toml        ← Rust dependencies
```

## Code Standards

#### Clarity Over Cleverness

- **Comments**: Explain *why*, not *what*.

```ts
// Bad: describes the code itself
// const result = items.filter(x => x.price > 100);

// Good: explains intent
// Filter to premium items — these have higher profit margins and justify expedited shipping
const premiumItems = items.filter(x => x.price > 100);
```

- **Naming**: Use complete, descriptive names. `templateMetadata` not `tm`. `handleDocumentExport` not `export`.
- **Functions**: Keep them focused. If a function does multiple unrelated things, split it. A function should have one reason to change.
- **Types** (TypeScript): Use them. Avoid `any`. If a type is unclear, add a JSDoc comment.

```ts
/** Metadata stored with each document. Includes audit timestamps and custom user fields. */
interface DocumentMetadata {
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  customFields: Record<string, string>;
}
```

#### Concise Code

- Keep lines under 100 characters when readable.
- Avoid nested ternaries (use `if` statements or early returns).
- Prefer `.map()` / `.filter()` over `.forEach()` where the intent is transformation, not side effects.
- Remove dead code, TODOs with no owner, and obsolete comments.

#### React Patterns

- Prefer functional components and hooks.
- Extract components when they exceed ~150 lines or represent a distinct concern.
- Use useCallback / useMemo judiciously — only when you have a measurable performance issue.

#### Rust Patterns

- Use `?` operator for error propagation; avoid `.unwrap()` in production code.
- Document public functions with doc comments (used by `cargo doc`).
- Follow Rust naming conventions: `snake_case` for functions/variables, `PascalCase` for types.

---

## Git Workflow

#### Branch Naming

Not mandatory, but recommended:

```txt
feature/add-pdf-export        ← New functionality
fix/crash-on-export           ← Bug fix
chore/update-dependencies     ← Maintenance
docs/improve-readme           ← Documentation
refactor/simplify-db-layer    ← Code restructuring
```

#### Commit Messages - Conventional Commits

**Required**. Used for automated changelog generation and versioning.

Format: `<type>(<scope>): <subject>`

| Type | Release Impact | Example |
|------|----------------|---------|
| `feat` | Minor bump | `feat: add cloud sync for templates` |
| `fix` | Patch bump | `fix: resolve race condition in doc render` |
| `feat! or BREAKING CHANGE:` | Major bump | `feat!: change metadata schema` |
| `chore` | None | `chore: update dependencies` |
| `docs` | None | `docs: clarify contribution guidelines` |
| `refactor` | None | `refactor: simplify template engine` |
| `ci` | None | `ci: add Windows build to CI matrix` |
| `perf` | Patch bump (optional) | `perf: optimize folder tree rendering` |

---

## Pull Requests

1. **Branch from `master`**: ensure you're up to date: `git pull origin master`
2. **Run locally**: verify your changes work: `pnpm tauri dev`
3. **Check CI**: your branch should pass all checks.
4. **Rebase if needed**: keep history clean: `git rebase origin/master`

- [ ] **CI must pass**: all cheeecks are required.
- [ ] **Address feedback**: push new commits (don't rebase unless requested).
- [ ] **Link any relevant issues.**
- [ ] Briefly explain what changed and why.

---

## Releases

Automated via GitHub Actions. **Do not manually bump versions or create releases.**

#### How it works

1. Merge PRs with conventional commit messages into `master`.
2. **release-please** opens a "Release PR" containing:
  a. Bumped versions (`package.json`, `Cargo.toml`, `tauri.conf.json`)
  b. Auto-generated `CHANGELOG.md`
3. Review + merge the Release PR.
4. **release-please** creates a git tag and triggers build on all platforms.
5. Artifacts auto-upload to the GitHub release.

**You**: Use conventional commits, merge the release PR when ready.
