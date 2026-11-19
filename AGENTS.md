# AGENTS.md

Online tic-tac-toe rooms: a client-side React + TypeScript app (Vite), peer-to-peer over PeerJS, deployed to GitHub Pages. No backend.
Spec: [#6](https://github.com/bgustavocosta-m/sdd-demo-4th-ed/issues/6) · Map: [#1](https://github.com/bgustavocosta-m/sdd-demo-4th-ed/issues/1). Work is driven by the `/sdd` skills in `.claude/skills/`.

## Commands
npm ci                     # install (CI uses this; locally `npm install` is fine)
npm run dev                # local dev server
npm test -- --run          # all tests (Vitest), once
npm run lint -- --fix      # ESLint, with autofix
npm run build              # tsc -b && vite build → dist/
npm run preview            # serve dist/ at /sdd-demo-4th-ed/

## Project
Game logic (pure):     src/game/ticTacToe.ts
Room IDs (pure):       src/room/roomId.ts
Profile + emojis:      src/profile/profile.ts
Wire protocol (pure):  src/net/protocol.ts
Networking (PeerJS):   src/net/host.ts  src/net/guest.ts  src/net/heartbeat.ts  src/net/peerConfig.ts
Routing:               src/router.ts              (#/  and  #/room/:id)
UI:                    src/ui/                    (Home, ProfileForm, Room, Board)
Deploy:                .github/workflows/deploy.yml, vite.config.ts (base: '/sdd-demo-4th-ed/')
Tests:                 next to the module, *.test.ts

## Conventions
- Rules live only in `src/game/` as pure functions; no React, DOM or PeerJS imports there. Invalid moves return `null`, never throw.
- Host-authoritative: the host owns `GameState` and sends full `state` snapshots; the guest never runs game rules.
- Every peer message is a member of the `Message` union in `src/net/protocol.ts` and passes `isMessage()` on receipt; drop anything else. Plain JSON only (no Date, Map, class instances).
- All PeerJS options live in `src/net/peerConfig.ts`. Connect with `{ reliable: true, serialization: 'json' }`.
- A Peer is created and destroyed in one owner (`Room.tsx` effect) with `destroy()` in cleanup; it must survive React StrictMode's double mount.
- Logic is written test-first (Vitest, `node` environment). New pure logic gets a `*.test.ts` beside it, following `src/game/ticTacToe.test.ts`.
- Styling: CSS modules (`*.module.css`) next to the component.
- URLs built at runtime use `import.meta.env.BASE_URL`; hash routing only, no history API.
- `localStorage` access is wrapped in try/catch.
- One `sdd:build` ticket → one branch `ticket-<n>-<slug>` → one PR that says `Closes #<n>` and how each acceptance criterion was checked.

## Boundaries
ALWAYS     run `npm test -- --run`, `npm run lint` and `npm run build` before you finish
ALWAYS     keep the change inside the ticket's scope; note anything else as a follow-up
ASK FIRST  any new dependency (allowed today: react, react-dom, peerjs, vite, vitest + template tooling)
ASK FIRST  changing the wire protocol, the deploy workflow, `vite.config.ts` base, or repo/Pages settings
ASK FIRST  adding a backend, a TURN server, or a non-default PeerJS broker
NEVER      commit secrets or `.env` files
NEVER      push to `main`, force-push, or merge your own PR
NEVER      edit `node_modules/`, `dist/`, or `.claude/skills/` while working a build ticket
