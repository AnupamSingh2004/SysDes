# SysDes

> Draw messy system architecture → AI understands it → generates clean professional diagram → gives smart design suggestions → stores every version with reasoning → deploy and showcase anywhere.

## 🎯 Project Vision

SysDes is an intelligent system design tool that transforms rough sketches into professional architecture diagrams while providing AI-powered design optimization suggestions.

## 🏗️ Architecture

**Modular Monolith** in Go - clean domain separation with future microservice extraction path.

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for detailed architecture design.

```
sysdes/
├── frontend/              # Next.js + TailwindCSS + tldraw
├── backend/               # Go modular monolith (Fiber)
│   └── internal/
│       ├── auth/          # Authentication domain
│       ├── project/       # Project management
│       ├── whiteboard/    # Canvas + WebSocket
│       ├── ai/            # Gemini integration
│       ├── rules/         # Heuristic suggestions
│       ├── diagram/       # Diagram generation
│       ├── version/       # Version history
│       ├── export/        # PNG/SVG/PDF export
│       └── search/        # Full-text search
├── docker/                # Docker configuration
├── nginx/                 # Reverse proxy
└── docs/                  # Documentation
```

## 🚀 Quick Start

```bash
# Start infrastructure
docker-compose -f docker/docker-compose.yml up -d

# Run backend (Go)
cd backend && go run cmd/server/main.go

# Run frontend (Next.js)  
cd frontend && npm run dev
```

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14, TailwindCSS, tldraw, React Flow, Zustand |
| Backend | Go 1.22, Fiber, pgx, gorilla/websocket |
| AI | Google Gemini API |
| Database | PostgreSQL 15, Redis 7 |
| DevOps | Docker, Nginx, GitHub Actions |

## 📋 Documentation

- [Architecture Design](docs/ARCHITECTURE.md) - Modular monolith structure
- [Complete Plan](docs/COMPLETE_PLAN.md) - Full technical specification
- [Roadmap](docs/ROADMAP.md) - Development phases

## 📄 License

MIT
