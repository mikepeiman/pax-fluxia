

# Tech Stack Documentation Policy

## MANDATORY: Maintain a docs reference for every project

Every project MUST have a curated list of documentation URLs for its tech stack. When implementing features that touch a library or framework, **consult the official docs first** before writing code.

## Where to Document

Store tech stack docs in `.atlas/TECH_STACK.md` (or equivalent project docs directory).

## What to Include

| Category | Examples |
|----------|----------|
| Core framework docs | SvelteKit, Next.js, etc. |
| Server/networking | Colyseus, Socket.io, etc. |
| Rendering/graphics | PixiJS, Three.js, etc. |
| Build tools | Vite, Bun, esbuild |
| Key libraries | Any library with non-obvious API |
| Architecture guides | Relevant design pattern articles |

## Process

1. When starting a new project, create the docs reference file
2. When encountering a new library, add its docs URL immediately
3. Before implementing a feature that touches a library, **read the relevant docs page**
4. When debugging, check docs for API changes between versions

## Current Project: Pax Fluxia

See `.atlas/TECH_STACK.md` for the full reference.

