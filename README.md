<p align="center">
  <img src="docs/assets/logo.svg" alt="SysDes Logo" width="120" height="120">
</p>

<h1 align="center">SysDes</h1>

<p align="center">
  <strong>Transform messy sketches into professional system architecture diagrams with AI-powered insights</strong>
</p>

<p align="center">
  <a href="#features">Features</a> •
  <a href="#demo">Demo</a> •
  <a href="#quick-start">Quick Start</a> •
  <a href="#tech-stack">Tech Stack</a> •
  <a href="#documentation">Docs</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Go-1.22-00ADD8?style=flat-square&logo=go" alt="Go">
  <img src="https://img.shields.io/badge/Next.js-14-black?style=flat-square&logo=next.js" alt="Next.js">
  <img src="https://img.shields.io/badge/PostgreSQL-15-336791?style=flat-square&logo=postgresql" alt="PostgreSQL">
  <img src="https://img.shields.io/badge/Gemini-AI-4285F4?style=flat-square&logo=google" alt="Gemini">
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
</p>

---

## ✨ What is SysDes?

**SysDes** (System Design) is an intelligent design tool that bridges the gap between quick whiteboard sketches and professional architecture documentation.

```
📝 Sketch  →  🤖 AI Interprets  →  📊 Clean Diagram  →  💡 Smart Suggestions  →  📚 Version History
```

### The Problem

- Drawing system architecture on whiteboards is fast but messy
- Converting sketches to professional diagrams is tedious
- Design reviews lack consistency and miss common issues
- No easy way to version and search past designs

### The Solution

SysDes lets you **draw freely**, then uses **AI to understand** your intent, **generates clean diagrams**, provides **actionable suggestions** based on best practices, and **stores everything** with full version history.

---

## 🎯 Features

### 🎨 Intelligent Whiteboard
- **Free-form drawing** - Boxes, arrows, text, icons
- **Hand-drawn recognition** - AI understands your messy sketches
- **Real-time sync** - Collaborate with teammates (coming soon)

### 🤖 AI-Powered Analysis
- **Sketch interpretation** - Gemini Vision extracts components & relationships
- **Pattern detection** - Identifies microservices, event-driven, monolith patterns
- **Confidence scoring** - Highlights uncertain interpretations for review

### 📊 Professional Diagrams
- **Auto-layout** - Clean, organized diagram generation
- **Multiple views** - Architecture, sequence, deployment diagrams
- **Customizable** - Themes, styles, node types

### 💡 Design Suggestions
- **Scalability** - Load balancing, caching, replication recommendations
- **Security** - Authentication, encryption, isolation warnings
- **Reliability** - Single point of failure detection
- **Performance** - Async patterns, connection pooling tips
- **Custom rules** - Add your own heuristics

### 📚 Version History
- **Every change saved** - Full history with diffs
- **AI reasoning stored** - Know why suggestions were made
- **Tagging** - Auto-tag by technology (Docker, Kafka, PostgreSQL...)
- **Search** - "Show me all auth-related designs"

### 📤 Export & Share
- **PNG / SVG / PDF** - High-quality exports
- **Public links** - Share with anyone
- **Embed** - Iframe for portfolios
- **API access** - Programmatic diagram generation

---

## 🖼️ Demo

<p align="center">
  <i>Screenshots coming soon...</i>
</p>

<!-- 
<p align="center">
  <img src="docs/assets/demo-sketch.png" alt="Sketch View" width="45%">
  <img src="docs/assets/demo-diagram.png" alt="Diagram View" width="45%">
</p>
-->

---

## 🚀 Quick Start

### Prerequisites

- **Go 1.22+**
- **Node.js 20+**
- **Docker & Docker Compose**
- **Gemini API Key** ([Get one free](https://makersuite.google.com/app/apikey))

### 1. Clone the repository

```bash
git clone https://github.com/AnupamSingh2004/SysDes.git
cd SysDes
```

### 2. Start the database

```bash
docker-compose -f docker/docker-compose.yml up -d db redis
```

### 3. Setup the backend

```bash
cd backend
cp .env.example .env
# Edit .env with your API keys

go run cmd/server/main.go
```

### 4. Setup the frontend

```bash
cd frontend
cp .env.example .env.local

npm install
npm run dev
```

### 5. Open the app

Visit [http://localhost:3000](http://localhost:3000) 🎉

---

## 🏗️ Architecture

SysDes uses a **Modular Monolith** architecture - clean separation of concerns with the simplicity of a single deployable unit.

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend                              │
│                   Next.js + TailwindCSS                      │
└─────────────────────────┬───────────────────────────────────┘
                          │ REST + WebSocket
┌─────────────────────────▼───────────────────────────────────┐
│                    Go Backend (Fiber)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │  Auth   │ │ Project │ │   AI    │ │ Diagram │           │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘           │
│       │          │          │          │                    │
│  ┌────┴──────────┴──────────┴──────────┴────┐              │
│  │          Shared (DB, Config, Logger)      │              │
│  └───────────────────────────────────────────┘              │
└─────────────────────────┬───────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │ PostgreSQL │   │   Redis   │   │  Gemini   │
    └───────────┘   └───────────┘   └───────────┘
```

### Project Structure

```
SysDes/
├── frontend/                # Next.js application
│   ├── src/
│   │   ├── app/            # App router pages
│   │   ├── components/     # React components
│   │   ├── hooks/          # Custom hooks
│   │   ├── stores/         # Zustand stores
│   │   └── lib/            # Utilities
│   └── package.json
│
├── backend/                 # Go modular monolith
│   ├── cmd/server/         # Entry point
│   ├── internal/
│   │   ├── auth/           # Authentication domain
│   │   ├── project/        # Project management
│   │   ├── ai/             # Gemini integration
│   │   ├── diagram/        # Diagram generation
│   │   ├── rules/          # Heuristic suggestions
│   │   ├── version/        # Version history
│   │   ├── export/         # Export service
│   │   └── shared/         # Shared utilities
│   └── go.mod
│
├── docker/                  # Docker configuration
├── docs/                    # Documentation
└── README.md
```

---

## 🛠️ Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| **Next.js 14** | React framework with App Router |
| **TailwindCSS** | Utility-first styling |
| **shadcn/ui** | Beautiful, accessible components |
| **Framer Motion** | Smooth animations |
| **tldraw** | Whiteboard canvas |
| **React Flow** | Diagram rendering |
| **Zustand** | State management |

### Backend
| Technology | Purpose |
|------------|---------|
| **Go 1.22** | Fast, concurrent backend |
| **Fiber** | Express-like web framework |
| **pgx** | PostgreSQL driver |
| **golang-jwt** | JWT authentication |
| **zerolog** | Structured logging |

### Infrastructure
| Technology | Purpose |
|------------|---------|
| **PostgreSQL 15** | Primary database |
| **Redis 7** | Caching & sessions |
| **Docker** | Containerization |
| **Nginx** | Reverse proxy |
| **GitHub Actions** | CI/CD |

### AI
| Technology | Purpose |
|------------|---------|
| **Google Gemini** | Vision + Text AI |
| **Custom Rules Engine** | Heuristic suggestions |

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [Architecture](docs/ARCHITECTURE.md) | Detailed system design |
| [API Reference](docs/API.md) | REST API documentation |
| [Contributing](CONTRIBUTING.md) | Contribution guidelines |
| [Roadmap](docs/ROADMAP.md) | Development timeline |

---

## 🗺️ Roadmap

- [x] **Phase 1**: Core infrastructure (Go backend, PostgreSQL, auth)
- [ ] **Phase 2**: Whiteboard canvas with tldraw
- [ ] **Phase 3**: AI sketch interpretation with Gemini
- [ ] **Phase 4**: Diagram generation
- [ ] **Phase 5**: Heuristic suggestions engine
- [ ] **Phase 6**: Version history & search
- [ ] **Phase 7**: Export & sharing
- [ ] **Phase 8**: Collaboration features

---

## 🤝 Contributing

Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙏 Acknowledgments

- [tldraw](https://tldraw.com) - Amazing whiteboard library
- [React Flow](https://reactflow.dev) - Diagram rendering
- [shadcn/ui](https://ui.shadcn.com) - Beautiful components
- [Google Gemini](https://deepmind.google/technologies/gemini/) - AI capabilities

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/AnupamSingh2004">Anupam Singh</a>
</p>
