# AGENTS.md

## Project

Azubi Lab is an interactive learning platform for Fachinformatiker Systemintegration trainees. It is a TypeScript web application and Progressive Web App built with Next.js. The primary user interface language is German.

The application uses Next.js with the App Router, TypeScript, Tailwind CSS, and ESLint. Application source lives in `src/app`, and static assets belong in `public` when needed.

Use Node.js 24 as declared in `.nvmrc` and npm as the package manager. Available project commands are:

- `npm run dev` for local development
- `npm run lint` for ESLint
- `npm run typecheck` for TypeScript validation
- `npm run build` for a production build

## Engineering Guidelines

- Build responsive, mobile-first interfaces.
- Use TypeScript strict mode.
- Prefer clear, maintainable code over clever abstractions.
- Organize code by feature or domain where appropriate.
- Use English for source-code identifiers and German for user-facing text.
- Use ESLint and Prettier once the project tooling is initialized.
- Add dependencies only when there is a clear, documented reason.
- Add automated tests for important application logic and bug fixes, using the testing setup established in the repository.

## Architecture and Deployment

- Use PostgreSQL as the database.
- Package production deployment with Docker.
- Use Traefik as the production reverse proxy.
- Production runs on a separate homelab server; this repository and laptop are for local development.
- Do not expose PostgreSQL directly to the public network.
- Do not change deployment or security configuration unless explicitly requested.

## Security

- Never commit secrets, passwords, API keys, tokens, private keys, or certificates.
- Never commit `.env` files containing secrets. Provide safe example files with placeholders when configuration documentation is needed.
- Keep sensitive configuration out of source control and avoid printing secrets in logs or command output.

## Product Direction

Planned features include:

- trainee and admin accounts
- learning modules and quizzes
- learning progress tracking
- XP, levels, and achievements
- daily challenges
- interactive troubleshooting scenarios
- an admin interface for managing learning content

Treat these as product direction, not authorization to implement unrelated features.

## Git

Use Conventional Commits with concise, imperative subjects, for example:

- `feat: add quiz module`
- `fix: correct progress calculation`
- `docs: document local setup`
- `refactor: simplify authentication flow`

## Repository Workflow

Before substantial repository work, read:

- `docs/CODEX_WORKFLOW.md`
- `docs/CODEX_CONTEXT.md`

Use the repository-provided validation tooling instead of recreating common
preflight, focused-test, database, final-validation, or report workflows.

For new feature batches, use `docs/CODEX_BATCH_TEMPLATE.md` as the starting
point and keep prompts focused on feature-specific requirements.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
