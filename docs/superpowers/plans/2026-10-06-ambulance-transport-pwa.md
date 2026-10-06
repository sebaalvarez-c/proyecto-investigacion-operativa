# Ambulance Transport PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a responsive PWA that simulates ambulance dispatch in Santa Cruz and visibly demonstrates the transportation method, route selection, blockage handling, and ambulance tracking.

**Architecture:** A React/TypeScript PWA will consume a NestJS API for business rules and optimization. Supabase will provide PostgreSQL, authentication, and realtime events; Google Maps will provide geographic routes and map rendering, while the transportation algorithm remains independent and testable.

**Tech Stack:** React, TypeScript, Vite, PWA support, NestJS, PostgreSQL through Supabase, Supabase Auth/Realtime, Google Maps Platform, Vitest, Jest, Docker Compose for local development.

**Spec:** `docs/superpowers/specs/2026-10-06-ambulance-transport-pwa-design.md`

## Global Constraints

- The system is an academic prototype and does not replace a real emergency medical service.
- The frontend is a responsive PWA usable on desktop and mobile.
- The cost in the transportation matrix represents estimated minutes.
- The transportation calculation must remain independent of Google Maps.
- Use environment variables and an `.env.example` without secrets.
- Enable Row Level Security on Supabase tables.
- Never expose `service_role`, secret keys, database credentials, or unrestricted Google Maps keys.
- Every workflow must support reproducible seed data and a simulated blockage.
- The MVP excludes payments, real medical history, emergency-center integration, and driver navigation.

## Review Focus

- Empty availability: the API must return a clear no-assignment result when there are no available ambulances or eligible hospitals; covered by Task 4.
- Unbalanced supply and demand: the solver must normalize or reject the matrix explicitly rather than silently produce an invalid assignment; covered by Task 3.
- Tied costs: the solver must produce deterministic assignments for equal costs; covered by Task 3.
- Missing or invalid coordinates: route requests must fail with a typed validation error and no map update; covered by Task 5.
- Realtime interruption: the tracking screen must preserve the last known position and show a reconnecting state; covered by Task 7.

### Task 1: Bootstrap the monorepo and development commands

**Files:**
- Create: `package.json`
- Create: `frontend/` using Vite React TypeScript scaffold
- Create: `backend/` using NestJS scaffold
- Create: `supabase/README.md`
- Create: `.env.example`
- Create: `docker-compose.yml`
- Modify: `README.md`

**Interfaces:**
- Produces root scripts for `dev`, `test`, `lint`, and `format`.
- Produces frontend and backend environment variable names consumed by later tasks.

- [ ] **Step 1: Create the root workspace manifest and scripts**

  Define workspaces for `frontend` and `backend`, plus scripts that delegate to each package without starting external services implicitly.

- [ ] **Step 2: Scaffold the React/Vite frontend and NestJS backend**

  Keep the generated entry points minimal and remove demo content. Add TypeScript path aliases only if both test runners resolve them consistently.

- [ ] **Step 3: Add the environment template and local service documentation**

  Document `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `GOOGLE_MAPS_API_KEY`, `SUPABASE_URL`, and the backend port. Do not add real values.

- [ ] **Step 4: Add the local PostgreSQL/Supabase development placeholder**

  Configure `docker-compose.yml` only for services that are actually needed locally; document that the hosted Supabase project remains the source for the presentation environment.

- [ ] **Step 5: Verify the scaffold**

  Run `npm install`, frontend tests, backend tests, and both development builds. Expected: clean installation, generated test suites pass, and no secret file is tracked.

- [ ] **Step 6: Commit**

  ```bash
  git add package.json frontend backend supabase .env.example docker-compose.yml README.md
  git commit -m "chore: bootstrap ambulance transport monorepo"
  ```

### Task 2: Create the Supabase schema and deterministic seed data

**Files:**
- Create: `supabase/migrations/001_initial_schema.sql`
- Create: `supabase/migrations/002_rls_policies.sql`
- Create: `supabase/seed.sql`
- Modify: `supabase/README.md`

**Interfaces:**
- Produces tables `ambulances`, `hospitals`, `emergencies`, `routes`, and `transport_solutions`.
- Produces seed identifiers that backend tests and the demo scenario can use.

- [ ] **Step 1: Write the schema migration**

  Add UUID primary keys, coordinate checks, status constraints, timestamps, foreign keys, and indexes for availability/status lookups. Store matrices and assignments as JSONB with an explicit total cost in minutes.

- [ ] **Step 2: Write RLS policies**

  Enable RLS on every application table. Permit the demo's authenticated role to read operational data and write only the records required by the MVP; backend-only mutations use the server secret. Keep service-role-only operations out of browser policies and document the selected demo authentication mode.

- [ ] **Step 3: Add Santa Cruz seed data**

  Insert deterministic fictional ambulances and a small set of hospitals with valid coordinates. Mark one ambulance unavailable and include one scenario suitable for a blockage demonstration.

- [ ] **Step 4: Verify schema and seed locally or with the configured Supabase project**

  Apply migrations, run the seed, verify constraints, and confirm unauthenticated access cannot bypass RLS.

- [ ] **Step 5: Commit**

  ```bash
  git add supabase
  git commit -m "feat: add Supabase schema and demo seed data"
  ```

### Task 3: Implement the transportation-method engine with tests first

**Files:**
- Create: `backend/src/modules/transport-method/domain/transport.types.ts`
- Create: `backend/src/modules/transport-method/application/transport-solver.ts`
- Create: `backend/src/modules/transport-method/application/transport-solver.spec.ts`
- Create: `backend/src/modules/transport-method/transport-method.module.ts`

**Interfaces:**
- Consumes `TransportProblem { origins, destinations, costs, supply, demand }`.
- Produces `TransportSolution { allocations, totalCost, method, iterations }`.
- `solveByMinimumCost(problem: TransportProblem): TransportSolution` must be deterministic.

- [ ] **Step 1: Write failing tests for the exact sample matrix**

  Assert the expected assignments and total minutes for a three-ambulance, three-hospital matrix. Add tests for ties, empty origins/destinations, invalid negative costs, and unbalanced supply/demand.

- [ ] **Step 2: Run the solver tests and verify failure**

  Run `npm --workspace backend test -- transport-solver.spec.ts`. Expected: failures because the solver is not implemented.

- [ ] **Step 3: Implement the typed solver**

  Use a copy of the input matrix, repeatedly select the lowest available cost with stable origin/destination ordering, allocate the minimum remaining supply/demand, and record each iteration. Reject malformed dimensions and negative costs with typed errors.

- [ ] **Step 4: Run the solver tests and verify success**

  Run the focused test command again. Expected: all transportation-method tests pass.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/modules/transport-method
  git commit -m "feat: implement minimum cost transportation solver"
  ```

### Task 4: Add backend application modules and API contracts

**Files:**
- Create: `backend/src/modules/emergencies/*`
- Create: `backend/src/modules/ambulances/*`
- Create: `backend/src/modules/hospitals/*`
- Create: `backend/src/modules/routes/*`
- Modify: `backend/src/app.module.ts`
- Create: `backend/test/emergency-flow.e2e-spec.ts`

**Interfaces:**
- `POST /emergencies` accepts `{ description, latitude, longitude }` and returns an emergency DTO.
- `GET /ambulances?status=AVAILABLE` returns available ambulance DTOs.
- `GET /hospitals?emergency=true` returns eligible hospital DTOs.
- `POST /emergencies/:id/optimize` returns the matrix, assignment, and total cost.
- `POST /emergencies/:id/route` returns a route DTO with primary and optional alternative route.

- [ ] **Step 1: Define DTOs and validation tests**

  Test rejected coordinates, missing descriptions, unsupported statuses, and the empty-availability response.

- [ ] **Step 2: Implement repositories for Supabase access**

  Keep Supabase queries in repository classes. The solver receives plain domain objects and must not import Supabase types.

- [ ] **Step 3: Implement the emergency and availability services**

  Create the incident, load available resources, and return typed not-found or no-assignment errors.

- [ ] **Step 4: Implement the optimization service**

  Build the time-cost matrix from the route provider, call `solveByMinimumCost`, persist `transport_solutions`, and return a presentation-safe DTO.

- [ ] **Step 5: Implement the route-provider interface and mock provider**

  Define `RouteProvider.getRoute(origin, destination, options): Promise<RouteResult>`. Use a deterministic mock provider in tests and keep Google Maps behind the adapter boundary.

- [ ] **Step 6: Run backend unit and e2e tests**

  Run `npm --workspace backend test` and `npm --workspace backend run test:e2e`. Expected: validation, availability, optimization, and route contract tests pass.

- [ ] **Step 7: Commit**

  ```bash
  git add backend/src backend/test
  git commit -m "feat: add emergency and optimization API"
  ```

### Task 5: Build the responsive PWA screens and map adapter

**Files:**
- Create: `frontend/src/lib/supabase.ts`
- Create: `frontend/src/services/api.ts`
- Create: `frontend/src/services/maps.ts`
- Create: `frontend/src/features/emergency/*`
- Create: `frontend/src/features/transport-matrix/*`
- Create: `frontend/src/features/map/*`
- Create: `frontend/src/features/tracking/*`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/index.css`
- Create: `frontend/src/App.test.tsx`

**Interfaces:**
- `createEmergency(input): Promise<Emergency>`.
- `optimizeEmergency(id): Promise<TransportSolutionView>`.
- `getRoute(id): Promise<RouteView>`.
- `MapAdapter.renderRoute(route): void` and `MapAdapter.moveAmbulance(position): void`.

- [ ] **Step 1: Write component tests for the main workflow**

  Assert the user can submit an incident, see loading/error states, see the matrix and assignment, and see a final arrived state using mocked API responses.

- [ ] **Step 2: Implement the Supabase browser client**

  Read only the publishable environment variables, establish the demo's authenticated Supabase session, and fail with a clear configuration message when configuration or session setup is unavailable.

- [ ] **Step 3: Implement typed API and map adapters**

  Keep HTTP calls and Google Maps-specific code outside presentation components. Use a mock map adapter during tests and development without a map key.

- [ ] **Step 4: Implement the report-accident and optimization screens**

  Make the responsive layout usable at mobile width first. Show the matrix, costs, assignment, and total minutes in a way suitable for a classroom demonstration.

- [ ] **Step 5: Implement the map and route screens**

  Render the incident, ambulance, hospital, primary route, and alternative route. Show blockage and route replacement as explicit status messages.

- [ ] **Step 6: Add PWA metadata and offline-safe shell behavior**

  Add manifest, icons/placeholders, theme colors, and a service worker that caches the application shell but does not pretend that live tracking works offline.

- [ ] **Step 7: Run frontend tests and production build**

  Run `npm --workspace frontend test` and `npm --workspace frontend run build`. Expected: tests pass and the production bundle is generated without requiring secrets during build.

- [ ] **Step 8: Commit**

  ```bash
  git add frontend
  git commit -m "feat: add responsive ambulance dispatch PWA"
  ```

### Task 6: Add realtime ambulance tracking and simulation

**Files:**
- Create: `backend/src/modules/realtime/*`
- Create: `frontend/src/services/realtime.ts`
- Modify: `frontend/src/features/tracking/*`
- Create: `backend/src/modules/realtime/realtime.spec.ts`
- Create: `frontend/src/services/realtime.test.ts`

**Interfaces:**
- Backend publishes `ambulance.position.updated` with `{ ambulanceId, latitude, longitude, status, occurredAt }`.
- Frontend subscribes with `subscribeToAmbulance(ambulanceId, onUpdate): Unsubscribe`.

- [ ] **Step 1: Write tests for ordered position updates and reconnect state**

  Assert that position events move the marker, stale events are ignored, and disconnects preserve the last position while exposing a reconnecting state.

- [ ] **Step 2: Implement the backend simulation publisher**

  Move the ambulance through a deterministic list of route points at a controllable interval. Stop at the hospital and publish `ARRIVED`.

- [ ] **Step 3: Implement the Supabase Realtime subscription**

  Subscribe only to the incident/ambulance channel required by the current user and clean up the channel when the tracking screen unmounts.

- [ ] **Step 4: Connect tracking state to the map marker**

  Animate between known positions without inventing a position after a disconnect. Display connection and arrival status.

- [ ] **Step 5: Run focused tests and the full test suite**

  Run backend realtime tests, frontend realtime tests, and root `npm test`. Expected: all pass.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/src/modules/realtime frontend/src/services/realtime.ts frontend/src/features/tracking
  git commit -m "feat: add realtime ambulance tracking simulation"
  ```

### Task 7: Complete documentation, visual verification, and release checks

**Files:**
- Modify: `README.md`
- Create: `docs/metodo-transporte/ejemplo.md`
- Create: `docs/arquitectura/flujo.md`
- Modify: `supabase/README.md`
- Create: `.env.example` entries if required by the final adapters

**Interfaces:**
- README documents setup, environment, seed, tests, demo flow, and limitations.
- The method example contains the exact sample matrix, allocations, and total cost produced by the solver.

- [ ] **Step 1: Document local setup and Supabase configuration**

  Explain how to create a Supabase project, apply migrations, seed data, configure RLS, and run frontend/backend without publishing credentials.

- [ ] **Step 2: Document the academic demonstration**

  Add a step-by-step presentation scenario from accident report to hospital arrival, including a blockage and alternative route.

- [ ] **Step 3: Run the release checks**

  Run lint, type-check, all unit/e2e tests, frontend production build, and a secret scan for `.env`, service-role keys, and Google API keys.

- [ ] **Step 4: Perform responsive and workflow verification**

  Verify mobile and desktop layouts, the matrix readability, route replacement, marker movement, arrival state, and reconnecting state.

- [ ] **Step 5: Commit and publish**

  ```bash
  git add README.md docs supabase .env.example
  git commit -m "docs: complete academic demo and release checks"
  git push
  ```
