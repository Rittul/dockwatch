# DockWatch

A real-time Docker container monitoring dashboard with a CI/CD pipeline powered by GitHub Actions and Jenkins.

---

## Overview

DockWatch gives you a live view of your Docker environment — container statuses, system resource usage, and logs — all in one clean web interface. The project is fully containerised and ships with a two-stage CI/CD pipeline: GitHub Actions validates every push, and Jenkins handles building and deploying the containers.

---

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                    Browser                          │
│              localhost:5173 (Frontend)              │
└────────────────────┬────────────────────────────────┘
                     │ HTTP
          ┌──────────┴──────────┐
          ▼                     ▼
┌─────────────────┐   ┌─────────────────────┐
│ monitoring-     │   │   logs-service      │
│ service :5000   │   │   :5001             │
│                 │   │                     │
│ CPU / RAM info  │   │ Container logs      │
│ System stats    │   │ Container status    │
└────────┬────────┘   └────────┬────────────┘
         │                     │
         └──────────┬──────────┘
                    ▼
         /var/run/docker.sock
                    │
         ┌──────────▼──────────┐
         │   Docker Engine     │
         └─────────────────────┘

┌─────────────────┐   ┌─────────────────────┐
│   MongoDB :27017│   │   Jenkins :8080      │
│   (persistence) │   │   (CI/CD pipeline)  │
└─────────────────┘   └─────────────────────┘
```

---

## Services

| Service | Port | Description |
|---|---|---|
| `frontend` | 5173 | React + Vite dashboard UI |
| `monitoring-service` | 5000 | Exposes CPU and RAM metrics |
| `logs-service` | 5001 | Streams container logs and status |
| `mongodb` | 27017 | Database (persistence layer) |
| `jenkins` | 8080 | CI/CD pipeline server |

---

## CI/CD Pipeline

DockWatch uses a two-stage pipeline so broken code never reaches your containers.

```
git push → GitHub Actions (validate) → Jenkins (build & deploy)
```

### Stage 1 — GitHub Actions

Runs on every push to `main`. Validates all three application services before Jenkins is ever involved.

| Job | What it checks |
|---|---|
| `frontend-build` | Installs dependencies and runs `npm run build` |
| `monitoring-service-check` | Installs dependencies, verifies no install errors |
| `logs-service-check` | Installs dependencies, verifies no install errors |

If any job fails, the Jenkins build is not triggered.

### Stage 2 — Jenkins

Picks up after GitHub Actions passes. Runs inside the `jenkins` container with access to the Docker socket.

```groovy
// Jenkinsfile (simplified)
environment {
    COMPOSE_PROJECT_NAME = 'dockwatch'   // ensures no duplicate stacks
}

stages:
  Checkout → Build (frontend, monitoring-service, logs-service) → Deploy → Verify
```

Jenkins only builds and deploys the three application services. `jenkins` and `mongodb` are treated as infrastructure and are started once manually — the pipeline never touches them.

---

## Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [Git](https://git-scm.com/)

### 1. Clone the repository

```bash
git clone https://github.com/Rittul/dockwatch.git
cd dockwatch
```

### 2. Start the full stack

```bash
docker compose up -d
```

This starts all five services. On first run, Jenkins and MongoDB take ~30 seconds to initialise.

### 3. Access the services

| Service | URL |
|---|---|
| Dashboard | http://localhost:5173 |
| Jenkins | http://localhost:8080 |
| Monitoring API | http://localhost:5000 |
| Logs API | http://localhost:5001 |

### 4. Configure Jenkins

On first login (`localhost:8080`), Jenkins will ask for an initial admin password:

```bash
docker exec dockwatch-jenkins-1 cat /var/jenkins_home/secrets/initialAdminPassword
```

Install the suggested plugins, then create a pipeline job pointing to this repository.

---

## Project Structure

```
dockwatch/
├── frontend/                  # React + Vite dashboard
│   ├── src/
│   │   └── App.jsx
│   ├── Dockerfile
│   └── package.json
├── monitoring-service/        # Node.js — system metrics
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
├── logs-service/              # Node.js — container logs & status
│   ├── server.js
│   ├── Dockerfile
│   └── package.json
├── jenkins/                   # Custom Jenkins image with Docker CLI
│   └── Dockerfile
├── docker-compose.yml
├── Jenkinsfile
└── .github/
    └── workflows/
        └── ci.yml             # GitHub Actions validation
```

---

## Development Workflow

### Making changes

```bash
# 1. Edit your code locally
# 2. Test quickly without Docker
cd frontend && npm run dev        # instant hot-reload at localhost:5173

# 3. When happy, push to trigger the full pipeline
git add .
git commit -m "your message"
git push origin main
```

### Pipeline flow after push

```
push to main
     │
     ▼
GitHub Actions runs ci.yml
     │  ✓ all jobs pass
     ▼
Jenkins triggered (via webhook or manually)
     │
     ├── docker compose build frontend monitoring-service logs-service
     ├── docker compose up -d --no-deps frontend monitoring-service logs-service
     └── docker compose ps
```

### Triggering Jenkins automatically on push

Install [ngrok](https://ngrok.com), then:

```bash
ngrok http 8080
# → https://abc123.ngrok-free.app
```

Add a webhook in GitHub → your repo → Settings → Webhooks:
- **Payload URL:** `https://abc123.ngrok-free.app/github-webhook/`
- **Content type:** `application/json`
- **Event:** Just the push event

In Jenkins → your pipeline → Configure, enable **"GitHub hook trigger for GITScm polling"**.

---

## API Reference

### Monitoring Service (`localhost:5000`)

| Endpoint | Response |
|---|---|
| `GET /system` | `{ cpu, totalRam, usedRam }` |

### Logs Service (`localhost:5001`)

| Endpoint | Response |
|---|---|
| `GET /status` | Array of `{ id, name, image, status }` |
| `GET /logs/:id` | Raw log output for the given container ID |

---

## Key Design Decisions

**Why does the Jenkins pipeline exclude `jenkins` and `mongodb`?**
Running `docker compose up -d` from inside Jenkins would try to recreate the Jenkins container itself, causing a port conflict on `8080`. Infrastructure services are started once on the host and left running; only application services are managed by the pipeline.

**Why `COMPOSE_PROJECT_NAME = 'dockwatch'`?**
Jenkins runs from `/var/jenkins_home/workspace/dockwatch-pipeline`, so Docker Compose would default the project name to `dockwatch-pipeline` — creating a duplicate stack with conflicting ports. Setting the env variable forces it to reuse the existing `dockwatch` stack and update containers in place.

---

## License

Rittul