# devops-playground-api

`devops-playground-api` is a Node.js and Express API packaged as a DevOps learning project. The API is intentionally small, but the repository is set up to practice production-style backend concerns: Docker images, Docker Compose, environment files, database migrations, logging, testing, linting, formatting, and GitHub Actions CI/CD.

## Table of Contents

1. [Project Overview](#project-overview)
2. [What This Project Teaches](#what-this-project-teaches)
3. [Tech Stack](#tech-stack)
4. [Architecture Overview](#architecture-overview)
5. [Prerequisites](#prerequisites)
6. [Environment Variables](#environment-variables)
7. [Local Setup Without Docker](#local-setup-without-docker)
8. [Development Setup With Docker Compose](#development-setup-with-docker-compose)
9. [Production Setup With Docker Compose](#production-setup-with-docker-compose)
10. [Database and Drizzle Migrations](#database-and-drizzle-migrations)
11. [API Endpoints](#api-endpoints)
12. [Authentication and Security](#authentication-and-security)
13. [Health Checks and Logs](#health-checks-and-logs)
14. [Testing](#testing)
15. [Linting and Formatting](#linting-and-formatting)
16. [GitHub Actions CI/CD](#github-actions-cicd)
17. [Docker Image Build and Push](#docker-image-build-and-push)
18. [Folder Structure](#folder-structure)
19. [Troubleshooting](#troubleshooting)
20. [Known Issues / Learning Notes](#known-issues--learning-notes)

## Project Overview

From the application perspective, this project exposes a basic user API:

- Public health and status routes.
- Auth routes for sign-up, sign-in, and sign-out.
- JWT authentication stored in an HTTP-only cookie.
- Protected user routes with role and ownership checks.
- PostgreSQL persistence through Drizzle ORM.

From the DevOps perspective, the same API is used as a practice surface for:

- Multi-stage Docker builds with development and production targets.
- Docker Compose for local development and production-like runs.
- Neon PostgreSQL / Neon Local environment flows.
- Drizzle migration generation and application.
- CI workflows for tests, linting, formatting, and Docker image publishing.
- Runtime logs, health checks, ignored local files, and example env files.

## What This Project Teaches

This repository is not only a backend API. It is a playground for learning how backend code is prepared to run consistently across local machines, containers, and CI/CD.

Key learning goals:

- How a single `Dockerfile` can support development and production targets.
- How Compose services connect an app container to a database/proxy service.
- How `.env`, `.env.development`, and `.env.production` separate runtime settings.
- How database schema changes move from Drizzle model files to SQL migrations.
- How GitHub Actions validates code before merge and publishes Docker images.
- How operational features such as logs, health checks, restart policies, and resource limits fit around an API.

## Tech Stack

- Runtime: Node.js 20+
- API framework: Express 5
- Database: Neon PostgreSQL / Neon Local
- ORM and migrations: Drizzle ORM and drizzle-kit
- Authentication: JWT stored in cookies
- Validation: Zod
- Security middleware: Helmet, CORS, cookie-parser, Arcjet
- Logging: Winston and Morgan
- Testing: Jest and Supertest
- Code quality: ESLint and Prettier
- DevOps: Docker, Docker Compose, GitHub Actions, Docker Hub

## Architecture Overview

Application request flow:

```text
Client
  -> Express app
  -> Helmet / CORS / JSON parsing / cookie parsing
  -> Morgan request logging
  -> Arcjet security middleware
  -> Routes
  -> Controllers
  -> Services
  -> Drizzle ORM
  -> Neon PostgreSQL
```

Development Docker flow:

```text
Host machine
  -> docker-compose.dev.yml
  -> app container: devops-playground-api:dev
  -> neon-local container: neondatabase/neon_local
  -> Neon branch/database
```

Important files:

- `src/app.js`: Express application setup and route mounting.
- `src/server.js`: starts the HTTP server.
- `src/models/user.model.js`: Drizzle user table schema.
- `drizzle/`: generated SQL migration files and metadata.
- `Dockerfile`: development and production image targets.
- `docker-compose.dev.yml`: development app plus Neon Local.
- `docker-compose.prod.yml`: production-style app container.

## Prerequisites

Install these before running the project:

- Node.js 20 or newer.
- npm.
- Docker Desktop.
- Git Bash, WSL, or another Bash-compatible shell if running `scripts/*.sh` on Windows.
- A Neon account and database/project credentials.
- An Arcjet key.
- A Docker Hub account if you want to use the Docker publish workflow.

## Environment Variables

The repository includes `.env.example` as the safe template. Real env files are ignored by Git.

Common env files:

- `.env`: local development without Docker.
- `.env.development`: Docker Compose development with Neon Local.
- `.env.production`: production-style Compose run with Neon Cloud.

| Variable           | Required for  | Purpose                                                      |
| ------------------ | ------------- | ------------------------------------------------------------ |
| `PORT`             | all runs      | Host port for the API, default `3000`.                       |
| `NODE_ENV`         | all runs      | Runtime mode such as `development`, `test`, or `production`. |
| `LOG_LEVEL`        | all runs      | Winston log level, for example `info`, `debug`, or `error`.  |
| `DATABASE_URL`     | all runs      | PostgreSQL connection string used by Drizzle and Neon.       |
| `DATABASE_NAME`    | dev/prod docs | Database name reference, commonly `neondb`.                  |
| `USE_NEON_LOCAL`   | Docker dev    | Enables Neon Local driver routing when set to `true`.        |
| `NEON_LOCAL_HOST`  | Docker dev    | Neon Local service host, usually `neon-local` in Compose.    |
| `JWT_SECRET`       | auth          | Secret used to sign and verify JWT cookies.                  |
| `ARCJET_KEY`       | security      | Arcjet project key.                                          |
| `ARCJET_ENV`       | security docs | Environment label for Arcjet usage.                          |
| `NEON_API_KEY`     | Neon Local    | Neon API key used by the Neon Local container.               |
| `NEON_PROJECT_ID`  | Neon Local    | Neon project ID.                                             |
| `PARENT_BRANCH_ID` | Neon Local    | Parent branch used for local branch creation.                |
| `DELETE_BRANCH`    | Neon Local    | Whether Neon Local should delete the created branch.         |

Never commit real `.env`, `.env.development`, or `.env.production` files.

## Local Setup Without Docker

Use this path when you want to run Node directly on your host machine while connecting to a Neon cloud database.

```bash
npm install
cp .env.example .env
```

Edit `.env`:

```env
PORT=3000
NODE_ENV=development
USE_NEON_LOCAL=false
DATABASE_URL=your-neon-cloud-connection-string
JWT_SECRET=your-long-random-secret
ARCJET_KEY=your-arcjet-key
```

Apply migrations and start the API:

```bash
npm run db:migrate
npm run dev
```

Open:

```text
http://localhost:3000
http://localhost:3000/health
http://localhost:3000/api
```

Host-local development should leave `USE_NEON_LOCAL=false`. Neon Local routing is intended for the Compose development app container.

## Development Setup With Docker Compose

Use this path to run the app container with hot reload and a Neon Local sidecar.

```bash
cp .env.example .env.development
```

Fill in `.env.development` with your Neon and Arcjet values. The development Compose file sets these for the app container:

```env
USE_NEON_LOCAL=true
NEON_LOCAL_HOST=neon-local
```

Start the development environment through the script:

```bash
npm run dev:docker
```

Or run the steps manually:

```bash
docker compose -f docker-compose.dev.yml up --build -d
npm run db:migrate:dev
```

Useful development commands:

```bash
docker compose -f docker-compose.dev.yml logs -f app
docker compose -f docker-compose.dev.yml logs -f neon-local
docker compose -f docker-compose.dev.yml down
```

Development Compose behavior:

- Builds the `development` target from `Dockerfile`.
- Runs the app with `npm run dev`.
- Mounts the repository into `/app` for hot reload.
- Keeps container dependencies in `/app/node_modules`.
- Mounts host `logs/` into `/app/logs`.
- Starts `neondatabase/neon_local:latest` as `neon-local`.

## Production Setup With Docker Compose

Use this path to practice a production-style local deployment with a Neon Cloud database.

```bash
cp .env.example .env.production
```

Edit `.env.production`:

```env
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
USE_NEON_LOCAL=false
DATABASE_URL=your-neon-production-connection-string
JWT_SECRET=your-production-secret
ARCJET_KEY=your-production-arcjet-key
ARCJET_ENV=production
```

Start through the script:

```bash
npm run prod:docker
```

Or run manually:

```bash
docker compose -f docker-compose.prod.yml up --build -d
npm run db:migrate:prod
```

Useful production commands:

```bash
docker logs -f devops-playground-api-prod
docker compose -f docker-compose.prod.yml down
```

Production Compose behavior:

- Builds the `production` target from `Dockerfile`.
- Runs `npm start`.
- Mounts host `logs/` into `/app/logs`.
- Adds a container health check for `/health`.
- Uses restart policy `unless-stopped`.
- Includes example memory and CPU resource settings.

## Database and Drizzle Migrations

The schema source is:

```text
src/models/user.model.js
```

Generated migrations are stored in:

```text
drizzle/
```

Migration commands:

```bash
npm run db:generate
npm run db:migrate
npm run db:generate:dev
npm run db:migrate:dev
npm run db:migrate:prod
npm run db:studio
```

Typical flow:

1. Change a Drizzle model in `src/models/`.
2. Generate a migration with `npm run db:generate`.
3. Review the SQL in `drizzle/`.
4. Apply it with the correct migration command for your environment.

## API Endpoints

Base URL:

```text
http://localhost:3000
```

Public endpoints:

| Method | Path      | Description                                   |
| ------ | --------- | --------------------------------------------- |
| `GET`  | `/`       | Plain text API greeting.                      |
| `GET`  | `/health` | Health status, timestamp, and process uptime. |
| `GET`  | `/api`    | JSON API status message.                      |

Auth endpoints:

| Method | Path                 | Description                            |
| ------ | -------------------- | -------------------------------------- |
| `POST` | `/api/auth/sign-up`  | Create a user and set the auth cookie. |
| `POST` | `/api/auth/sign-in`  | Authenticate and set the auth cookie.  |
| `POST` | `/api/auth/sign-out` | Clear the auth cookie.                 |

User endpoints:

| Method   | Path             | Auth       | Description                                  |
| -------- | ---------------- | ---------- | -------------------------------------------- |
| `GET`    | `/api/users`     | Admin      | List all users.                              |
| `GET`    | `/api/users/:id` | User/Admin | Get own profile, or any profile as admin.    |
| `PUT`    | `/api/users/:id` | User/Admin | Update own profile, or any profile as admin. |
| `DELETE` | `/api/users/:id` | Admin      | Delete a user.                               |

Example sign-up:

```bash
curl -i -c cookies.txt \
  -X POST http://localhost:3000/api/auth/sign-up \
  -H "Content-Type: application/json" \
  -d '{"name":"Admin User","email":"admin@example.com","password":"secret123","role":"admin"}'
```

Example authenticated request:

```bash
curl -b cookies.txt http://localhost:3000/api/users
```

## Authentication and Security

Auth behavior:

- JWTs are signed with `JWT_SECRET`.
- The token is stored in a cookie named `token`.
- Cookies are HTTP-only.
- Cookies are marked `secure` when `NODE_ENV=production`.
- Cookie `sameSite` is set to `strict`.

Security middleware:

- `helmet()` sets common HTTP security headers.
- `cors()` is currently open for learning convenience.
- `cookie-parser` reads the auth cookie.
- Arcjet runs shield, bot detection, and sliding-window rate limiting.
- Arcjet runs in `DRY_RUN` outside production and `LIVE` in production.
- Rate limits vary by detected role: guest, user, or admin.

For a stricter production setup, replace open `cors()` with an explicit origin allowlist.

## Health Checks and Logs

Health endpoint:

```bash
curl http://localhost:3000/health
```

Example response:

```json
{
  "status": "OK",
  "timestamp": "2026-06-16T00:00:00.000Z",
  "uptime": 12.34
}
```

Docker health checks:

- `Dockerfile` defines a default health check against `/health`.
- `docker-compose.prod.yml` also defines a production health check.

Logs:

- Winston writes application logs to `logs/error.log` and `logs/combined.log`.
- Morgan sends HTTP request logs through Winston.
- The app creates `logs/` automatically if it does not exist.

Useful commands:

```bash
docker compose -f docker-compose.dev.yml logs -f app
docker logs -f devops-playground-api-prod
```

## Testing

Run tests:

```bash
npm test
```

The current Jest/Supertest suite checks:

- `GET /health`
- `GET /api`
- 404 behavior for unknown routes

On Windows, if PowerShell blocks `npm.ps1`, use:

```powershell
npm.cmd test
```

If Jest cannot write to the default temp cache directory, use a workspace cache:

```powershell
npm.cmd test -- --runInBand --cacheDirectory=.cache/jest
```

The `.cache/` directory is ignored by Git.

## Linting and Formatting

Run ESLint:

```bash
npm run lint
```

Fix auto-fixable lint issues:

```bash
npm run lint:fix
```

Check formatting:

```bash
npm run format:check
```

Write formatting changes:

```bash
npm run format
```

## GitHub Actions CI/CD

Workflows live in:

```text
.github/workflows/
```

Workflows:

- `tests.yml`: installs dependencies and runs Jest on pushes and pull requests to `main` and `staging`.
- `lint-and-format.yml`: runs ESLint and Prettier checks on pushes and pull requests to `main` and `staging`.
- `docker-build-and-push.yml`: builds and pushes Docker images on pushes to `main` and manual workflow dispatch.

Required repository secrets:

| Secret              | Workflow       | Purpose                                 |
| ------------------- | -------------- | --------------------------------------- |
| `TEST_DATABASE_URL` | tests          | Optional database URL for CI test runs. |
| `DOCKER_USERNAME`   | Docker publish | Docker Hub username.                    |
| `DOCKER_PASSWORD`   | Docker publish | Docker Hub password or access token.    |

The test workflow also sets:

```env
NODE_ENV=test
JWT_SECRET=test-secret-for-ci
LOG_LEVEL=error
```

## Docker Image Build and Push

Build a development image:

```bash
docker build --target development -t devops-playground-api:dev .
```

Build a production image:

```bash
docker build --target production -t devops-playground-api:latest .
```

Run the production Compose stack:

```bash
docker compose -f docker-compose.prod.yml up --build -d
```

The Docker publish workflow uses:

- Docker Buildx.
- Multi-platform builds for `linux/amd64` and `linux/arm64`.
- Docker metadata tags for branch, SHA, `latest`, and timestamped production tags.
- GitHub Actions cache for faster rebuilds.

Published image format:

```text
docker.io/<DOCKER_USERNAME>/devops-playground-api:<tag>
```

Avoid sharing output from this command because it expands env-file values, including secrets:

```bash
docker compose -f docker-compose.dev.yml config
```

## Folder Structure

```text
.
|-- .github/workflows/       # GitHub Actions CI/CD workflows
|-- drizzle/                 # Drizzle migrations and metadata
|-- scripts/                 # Bash helper scripts for dev/prod Compose runs
|-- src/
|   |-- config/              # Database, Arcjet, and logger setup
|   |-- controllers/         # Express route handlers
|   |-- middleware/          # Auth and security middleware
|   |-- models/              # Drizzle table definitions
|   |-- routes/              # Express routers
|   |-- services/            # Database-facing business logic
|   |-- utils/               # JWT, cookie, and formatting helpers
|   |-- validations/         # Zod schemas
|   |-- app.js               # Express app setup
|   |-- index.js             # Loads env and starts server
|   `-- server.js            # HTTP listen call
|-- tests/                   # Jest and Supertest tests
|-- Dockerfile               # Multi-stage image definition
|-- docker-compose.dev.yml   # Development stack
|-- docker-compose.prod.yml  # Production-style stack
|-- drizzle.config.js        # Drizzle Kit config
|-- eslint.config.js         # ESLint config
|-- jest.config.mjs          # Jest config
|-- package.json             # Scripts and dependencies
`-- README.md
```

Ignored local/runtime directories include:

- `node_modules/`
- `.env*`
- `.neon_local/`
- `.cache/`
- `coverage/`
- `logs/`
- `.idea/`

## Troubleshooting

Wrong port:

- The API defaults to `3000`.
- Compose maps `${PORT:-3000}:3000`.
- Check `PORT` in your env file.

Docker is not running:

- Start Docker Desktop before using Compose scripts.
- Validate with `docker info`.

PowerShell blocks npm:

```powershell
npm.cmd run lint
npm.cmd test
```

Missing env file:

- Copy `.env.example` to `.env`, `.env.development`, or `.env.production`.
- Fill in real Neon, JWT, and Arcjet values.

Migrations fail:

- Confirm `DATABASE_URL` points to the intended database.
- For Docker development, confirm the Neon Local container is running.
- For production, confirm the Neon Cloud connection string is reachable.

Neon Local does not start:

- Confirm `NEON_API_KEY`, `NEON_PROJECT_ID`, and `PARENT_BRANCH_ID`.
- Check `docker compose -f docker-compose.dev.yml logs -f neon-local`.
- Ensure `.neon_local/` is writable and ignored by Git.

Arcjet warnings during tests or local runs:

- Arcjet may warn that it is using `127.0.0.1` when a public IP is not available.
- The app runs Arcjet in dry-run mode outside production.

Logs are missing:

- The app creates `logs/` automatically.
- In Docker, Compose mounts `./logs` to `/app/logs`.

## Known Issues / Learning Notes

- The automated test suite currently focuses on public routes and 404 behavior. Auth and user endpoints should get DB-backed tests as the project grows.
- CORS is open with `cors()` for learning convenience. Production apps should restrict allowed origins.
- Password changes are intentionally not handled by `PUT /api/users/:id`; add a dedicated password-change flow if needed.
- The production Compose file is production-style practice, not a full cloud deployment blueprint. Real deployments should use managed secrets, external logging, migration jobs, and platform-specific health checks.
- `docker compose config` is useful for debugging but prints expanded env values. Do not paste its output into public issues or logs.
