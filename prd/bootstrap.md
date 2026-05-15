# PRD: Bootstrap — Monorepo Infrastructure

## Problem Statement

Before any domain-specific logic can be built, the repository needs a working monorepo with the chosen tech stack wired up end-to-end. Currently the repo contains only documentation, a few scripts, and an example JSON file — there is no runnable code, no package manager configuration, and no dev server.

## Solution

Set up a pnpm workspace monorepo with two packages (CLI and web dashboard), install all foundational dependencies, and verify the stack works end-to-end by running a local dev server that renders a placeholder page in the browser. No domain logic — just the blank canvas with all tools ready.

## User Stories

1. As a developer, I want to run `pnpm install` at the repo root and have all dependencies installed across both packages, so that I can start working immediately.
2. As a developer, I want to run `pnpm dev` (or equivalent) from the repo root and have the web dashboard dev server start locally, so that I can see the app in the browser.
3. As a developer, I want to see a placeholder page at localhost that renders with Tailwind CSS and shadcn/ui components working, so that I know the styling stack is wired up correctly.
4. As a developer, I want the CLI package to have a runnable entry point (e.g., `pnpm --filter cli start` prints "hello world"), so that I know tsx and TypeScript are working.
5. As a developer, I want TypeScript strict mode configured across both packages, so that type checking catches errors from the start.
6. As a developer, I want the `data/` directory structure in place (constitutions and results subdirectories), so that both packages know where to read from and write to.
7. As a developer, I want a shared tsconfig base at the repo root that both packages extend, so that TypeScript configuration is consistent.
8. As a developer, I want the Anthropic SDK installed in the CLI package, so that I can make API calls when I start building the eval pipeline.
9. As a developer, I want OpenTimestamps CLI documented as a system-level dependency (not an npm package), so that I know to install it separately.

## Implementation Decisions

### Monorepo Layout

```
proof-of-purpose/
├── packages/
│   ├── cli/                  # Eval pipeline (future)
│   │   ├── src/
│   │   │   └── index.ts      # Entry point — placeholder only
│   │   ├── package.json
│   │   └── tsconfig.json
│   └── web/                  # Dashboard
│       ├── app/
│       │   ├── routes/       # React Router route files
│       │   ├── lib/
│       │   │   └── utils.ts  # cn() class-merge utility (shadcn dep)
│       │   └── app.css       # Tailwind v4 config + shadcn theme tokens
│       ├── public/
│       ├── components.json   # shadcn/ui configuration
│       ├── react-router.config.ts
│       ├── package.json
│       ├── tsconfig.json
│       └── vite.config.ts
├── data/
│   ├── constitutions/        # YAML constitution files (future)
│   └── results/              # Eval output JSON + .ots files (future)
├── package.json              # Workspace root
├── pnpm-workspace.yaml
└── tsconfig.base.json        # Shared TypeScript config
```

### Tech Stack

| Layer | Choice | Version guidance |
|---|---|---|
| Package manager | pnpm workspaces | Latest stable pnpm |
| Language | TypeScript (strict) | Latest stable |
| CLI runtime | tsx | Latest stable |
| AI SDK | @anthropic-ai/sdk | Latest stable (CLI package only) |
| Web framework | React Router v7 + Vite | Latest stable |
| UI | Tailwind CSS 4 + shadcn/ui | Tailwind v4, latest shadcn |
| Deployment | Vercel (static) | Not configured in bootstrap — future |
| Bitcoin | OpenTimestamps CLI | System dependency, not npm |

### Tailwind CSS 4 Setup

No `tailwind.config.js` — Tailwind v4 configures entirely in CSS via `@import "tailwindcss"` and `@theme` directives in `app/app.css`. Uses the `@tailwindcss/vite` plugin (not PostCSS).

### shadcn/ui Setup

Requires `components.json` in the web package root (style: `"new-york"`, `rsc: false`, path aliases matching tsconfig). The `cn()` utility (`clsx` + `tailwind-merge`) at `app/lib/utils.ts` is required by all shadcn components. Additional dependencies: `clsx`, `class-variance-authority`, `tailwind-merge`, `lucide-react`, `tw-animate-css`.

### React Router v7 Static Mode

`react-router.config.ts` with `ssr: false`. The dashboard is a client-rendered SPA — no server-side rendering, no loaders, no actions. Produces `index.html` + JS bundles for static hosting.

### Vite Plugins

Three plugins in order: `tailwindcss()` from `@tailwindcss/vite`, `reactRouter()` from `@react-router/dev/vite`, `tsconfigPaths()` from `vite-tsconfig-paths`.

### Path Aliases

Web package tsconfig: `~/*` → `./app/*` for clean imports. CLI package: flat `src/` structure, no alias needed.

### What the Placeholder Page Should Show

A single page with a heading (e.g., "Proof of Purpose") and one or two shadcn/ui components (a Card, a Button, anything visible) styled with Tailwind. The purpose is solely to verify the full stack works: Vite builds, React renders, Tailwind styles apply, shadcn components load. No domain content.

### What the CLI Placeholder Should Do

A single TypeScript file that runs via tsx and prints to stdout. Verifies tsx and TypeScript strict mode work. No domain logic.

## Testing Decisions

No automated tests for the bootstrap. Success criteria are manual:

- `pnpm install` completes without errors
- `pnpm dev` (web) starts a dev server and the placeholder page renders in a browser
- `pnpm --filter cli start` (or equivalent) runs the CLI entry point and prints output
- TypeScript type-checking passes with strict mode (`pnpm tsc --noEmit`)

## Out of Scope

- Eval pipeline logic (constitution parsing, prompt generation, model testing, judging)
- Bitcoin anchoring / OpenTimestamps integration
- Dashboard content, layout, or design
- Vercel deployment configuration
- Any domain-specific data or API calls
- shadcn/ui component library beyond one or two components to prove the wiring works

## Further Notes

- The `data/` directory should contain empty subdirectories with `.gitkeep` files so the structure is committed.
- The existing files at the repo root (README.md, PoP.md, LICENSE, eval-bundle-example.json, eval-bundle-example.json.ots) should remain untouched.
- OpenTimestamps CLI (`ots`) is a Python tool installed via `pipx install opentimestamps-client`. It is a system-level dependency, not managed by pnpm. Document this in the root README or a CONTRIBUTING note, but do not attempt to install it as part of the bootstrap.
