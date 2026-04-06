# Contributing

## Getting Started

```bash
git clone https://github.com/encryptedtouhid/mssql-rest-api.git
cd mssql-rest-api
npm install
```

## Development

```bash
# Start SQL Server + API server
./dev.sh

# Run unit tests
npm run test:unit

# Run integration tests (requires Docker)
npm run docker:up
npm run test:integration
npm run docker:down

# Lint and format
npm run lint:fix
npm run format
```

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/). All commits **must** follow this format:

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type       | Description                  | Version Bump           |
| ---------- | ---------------------------- | ---------------------- |
| `feat`     | New feature                  | Minor (0.1.0 -> 0.2.0) |
| `fix`      | Bug fix                      | Patch (0.1.0 -> 0.1.1) |
| `perf`     | Performance improvement      | Patch                  |
| `refactor` | Code change (no feature/fix) | No bump                |
| `docs`     | Documentation only           | No bump                |
| `test`     | Add/update tests             | No bump                |
| `ci`       | CI/CD changes                | No bump                |
| `chore`    | Maintenance                  | No bump                |
| `build`    | Build system changes         | No bump                |

### Breaking Changes

Add `!` after the type or `BREAKING CHANGE:` in the footer for major version bumps:

```
feat!: change API response format
```

### Examples

```bash
git commit -m "feat: add rate limiting support"
git commit -m "fix: escape LIKE wildcards in contains filter"
git commit -m "perf: parallelize expand queries"
git commit -m "docs: update API examples in README"
git commit -m "test: add integration tests for composite PKs"
```

Non-conventional commits will be **rejected** by the commit-msg hook.

## Branching

- `main` — stable, release-ready
- `feat/*` — new features
- `fix/*` — bug fixes
- `chore/*` — maintenance

## Releasing

Releases are automated. To create a release:

```bash
# Auto-detect version bump from commits
npm run release

# Or force a specific bump
npm run release:patch   # 0.1.0 -> 0.1.1
npm run release:minor   # 0.1.0 -> 0.2.0
npm run release:major   # 0.1.0 -> 1.0.0
```

This will:

1. Bump version in `package.json`
2. Generate/update `CHANGELOG.md`
3. Create a git commit and tag (`v0.2.0`)

Then push with tags to trigger the GitHub Release:

```bash
git push --follow-tags
```

## Git Hooks

| Hook         | Action                              |
| ------------ | ----------------------------------- |
| `pre-commit` | Lint staged files + secret scanning |
| `commit-msg` | Validate conventional commit format |
| `pre-push`   | TypeScript check + unit tests       |

## Project Structure

```
src/
  cli.ts, config.ts, index.ts, server.ts
  db/              Connection pool and type mappings
  introspection/   Schema discovery from SQL Server
  odata/           OData query parser ($filter, $select, etc.)
  query/           SQL query builder (parameterized)
  formatters/      JSON and XML response formatting
  metadata/        OData $metadata and OpenAPI generation
  routes/          Fastify route handlers
  utils/           Logger and error classes
tests/
  unit/            Pure function tests (no DB needed)
  integration/     Full stack tests (requires Docker SQL Server)
```
