# SysDes - Architecture Design

## 🏗️ Architecture Philosophy: Modular Monolith

> "Build it as a modular Go monolith for fast iteration and safe internal communication, with domain boundaries designed for microservice extraction when scaling requires it."

### Why NOT Microservices (Yet)

| Microservices Problem | Modular Monolith Solution |
|----------------------|---------------------------|
| Network latency between services | Direct function calls (microseconds) |
| Auth between services | No inter-service auth needed |
| Distributed debugging | Single process, simple stack traces |
| Complex deployment | Single binary deployment |
| Service discovery | Not needed |
| Data consistency | Single DB transaction |

### When to Extract Microservices (Future)

| Trigger | Extract Service |
|---------|-----------------|
| Need sandboxed code execution at scale | `container-runner` service |
| AI processing causing request timeouts | `ai-worker` service with queue |
| Public gallery needs independent scaling | `gallery-cdn` service |
| Team grows to 10+ developers | Split by domain ownership |

---

## 📁 Project Structure

```
sysdes/
│
├── frontend/                    # Next.js application
│   ├── src/
│   │   ├── app/                 # Next.js App Router
│   │   ├── components/          # React components
│   │   ├── hooks/               # Custom hooks
│   │   ├── stores/              # Zustand stores
│   │   ├── lib/                 # Utilities
│   │   └── types/               # TypeScript types
│   ├── package.json
│   └── Dockerfile
│
├── backend/                     # Go modular monolith
│   ├── cmd/
│   │   └── server/
│   │       └── main.go          # Entry point
│   │
│   ├── internal/                # Private application code
│   │   │
│   │   ├── auth/                # 🔐 Auth Domain
│   │   │   ├── handler.go       # HTTP handlers
│   │   │   ├── service.go       # Business logic
│   │   │   ├── repository.go    # DB operations
│   │   │   ├── models.go        # Domain models
│   │   │   └── jwt.go           # JWT utilities
│   │   │
│   │   ├── project/             # 📁 Project Domain
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   └── models.go
│   │   │
│   │   ├── whiteboard/          # 🎨 Whiteboard Domain
│   │   │   ├── handler.go       # HTTP + WebSocket handlers
│   │   │   ├── service.go       # Canvas processing logic
│   │   │   ├── repository.go
│   │   │   ├── models.go
│   │   │   └── websocket.go     # Realtime sync
│   │   │
│   │   ├── ai/                  # 🤖 AI Domain
│   │   │   ├── handler.go
│   │   │   ├── service.go       # Orchestrates AI pipeline
│   │   │   ├── gemini.go        # Gemini API client
│   │   │   ├── prompts.go       # Prompt templates
│   │   │   ├── parser.go        # Parse AI responses
│   │   │   └── models.go
│   │   │
│   │   ├── rules/               # 📏 Heuristic Rules Domain
│   │   │   ├── engine.go        # Rule execution engine
│   │   │   ├── rules.go         # Rule definitions
│   │   │   ├── scorer.go        # Suggestion scoring
│   │   │   └── models.go
│   │   │
│   │   ├── diagram/             # 📊 Diagram Domain
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── generator.go     # Generate clean diagrams
│   │   │   ├── layout.go        # Auto-layout algorithms
│   │   │   └── models.go
│   │   │
│   │   ├── version/             # 🕒 Version History Domain
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go
│   │   │   ├── diff.go          # Version diffing
│   │   │   └── models.go
│   │   │
│   │   ├── export/              # 📤 Export Domain
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── png.go           # PNG export
│   │   │   ├── svg.go           # SVG export
│   │   │   └── pdf.go           # PDF export
│   │   │
│   │   ├── search/              # 🔍 Search Domain
│   │   │   ├── handler.go
│   │   │   ├── service.go
│   │   │   ├── repository.go    # Full-text search
│   │   │   └── models.go
│   │   │
│   │   └── shared/              # 🔧 Shared Utilities
│   │       ├── config/          # App configuration
│   │       ├── database/        # DB connection, migrations
│   │       ├── middleware/      # HTTP middleware
│   │       ├── errors/          # Custom error types
│   │       ├── logger/          # Structured logging
│   │       └── validator/       # Input validation
│   │
│   ├── pkg/                     # Public packages (if needed)
│   │   └── types/               # Shared types for external use
│   │
│   ├── migrations/              # SQL migrations
│   │   ├── 001_init.up.sql
│   │   └── 001_init.down.sql
│   │
│   ├── go.mod
│   ├── go.sum
│   ├── Makefile
│   └── Dockerfile
│
├── docker/
│   ├── docker-compose.yml       # Development environment
│   └── docker-compose.prod.yml  # Production environment
│
├── nginx/
│   └── sysdes.conf              # Reverse proxy config
│
├── docs/
│   ├── ARCHITECTURE.md          # This file
│   ├── COMPLETE_PLAN.md         # Full technical spec
│   └── ROADMAP.md               # Development timeline
│
├── .env.example
├── .gitignore
└── README.md
```

---

## 🔄 Domain Communication Patterns

### Internal Communication (Within Monolith)

Domains communicate via **Go interfaces**, not HTTP calls:

```go
// internal/ai/service.go
type AIService struct {
    gemini    GeminiClient
    rules     rules.Engine      // Direct dependency injection
    diagram   diagram.Generator // No network call needed
}

func (s *AIService) ProcessSketch(ctx context.Context, input SketchInput) (*ProcessResult, error) {
    // 1. Call Gemini API (external)
    extracted, err := s.gemini.InterpretSketch(ctx, input.Image, input.Explanation)
    if err != nil {
        return nil, err
    }
    
    // 2. Run heuristic rules (internal - direct function call)
    suggestions := s.rules.Evaluate(extracted.Nodes, extracted.Edges)
    
    // 3. Generate diagram (internal - direct function call)
    diagramSVG, err := s.diagram.Generate(extracted.Nodes, extracted.Edges)
    if err != nil {
        return nil, err
    }
    
    return &ProcessResult{
        Nodes:       extracted.Nodes,
        Edges:       extracted.Edges,
        Suggestions: suggestions,
        DiagramSVG:  diagramSVG,
    }, nil
}
```

### External Communication

| Communication | Method |
|--------------|--------|
| Frontend ↔ Backend | HTTP REST + WebSocket |
| Backend → Gemini | HTTPS API calls |
| Backend → PostgreSQL | Direct connection (pgx) |
| Backend → Redis | Direct connection |

---

## 🔌 Dependency Injection Pattern

```go
// cmd/server/main.go
func main() {
    // Load config
    cfg := config.Load()
    
    // Initialize infrastructure
    db := database.Connect(cfg.DatabaseURL)
    redis := cache.Connect(cfg.RedisURL)
    gemini := ai.NewGeminiClient(cfg.GeminiAPIKey)
    
    // Initialize domains (dependency injection)
    authRepo := auth.NewRepository(db)
    authService := auth.NewService(authRepo, cfg.JWTSecret)
    
    projectRepo := project.NewRepository(db)
    projectService := project.NewService(projectRepo)
    
    rulesEngine := rules.NewEngine()
    diagramGenerator := diagram.NewGenerator()
    
    aiService := ai.NewService(gemini, rulesEngine, diagramGenerator)
    
    versionRepo := version.NewRepository(db)
    versionService := version.NewService(versionRepo, aiService)
    
    exportService := export.NewService()
    searchService := search.NewService(db)
    
    // Initialize HTTP handlers
    router := setupRouter(
        authService,
        projectService,
        aiService,
        versionService,
        exportService,
        searchService,
    )
    
    // Start server
    log.Fatal(router.Listen(":4000"))
}
```

---

## 🗄️ Database Design

### Single PostgreSQL Database

All domains share one database but have **logical separation** via table prefixes/schemas:

```sql
-- Auth domain
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    github_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project domain
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    public_slug VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Version domain
CREATE TABLE design_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Raw input
    sketch_image_url TEXT,
    stroke_data JSONB,
    explanation_text TEXT,
    
    -- AI extracted
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    ai_confidence FLOAT,
    
    -- Generated
    diagram_svg TEXT,
    
    -- Metadata
    tags TEXT[],
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(project_id, version_number)
);

-- Suggestions domain (linked to versions)
CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version_id UUID REFERENCES design_versions(id) ON DELETE CASCADE,
    
    rule_id VARCHAR(100) NOT NULL,
    category VARCHAR(50) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    
    affected_nodes TEXT[],
    impact_score INTEGER,
    complexity_score INTEGER,
    
    status VARCHAR(20) DEFAULT 'pending',
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_versions_project ON design_versions(project_id);
CREATE INDEX idx_suggestions_version ON suggestions(version_id);
CREATE INDEX idx_versions_search ON design_versions 
    USING GIN (to_tsvector('english', COALESCE(explanation_text, '') || ' ' || COALESCE(notes, '')));
```

---

## 🛠️ Tech Stack (Updated for Go)

### Backend (Go)

| Component | Library | Why |
|-----------|---------|-----|
| HTTP Framework | **Fiber v2** | Fastest Go framework, Express-like API |
| Database | **pgx v5** | Fastest PostgreSQL driver |
| Migrations | **golang-migrate** | Industry standard |
| Validation | **go-playground/validator** | Struct tag validation |
| JWT | **golang-jwt/jwt/v5** | Latest JWT library |
| WebSocket | **gorilla/websocket** | Most mature WS library |
| Config | **viper** | Env + file config |
| Logging | **zerolog** | Fastest structured logger |
| Testing | **testify** | Assertions + mocking |
| Hot Reload | **air** | Development hot reload |

### Frontend (Unchanged)

| Component | Library |
|-----------|---------|
| Framework | Next.js 14 |
| Styling | TailwindCSS |
| Canvas | tldraw |
| Diagrams | React Flow |
| State | Zustand |
| HTTP | React Query + fetch |

### Infrastructure

| Component | Technology |
|-----------|------------|
| Database | PostgreSQL 15 |
| Cache | Redis 7 |
| Reverse Proxy | Nginx |
| Containers | Docker |
| CI/CD | GitHub Actions |

---

## 📡 API Routes

```go
// All routes defined in one place
func setupRouter(/* services */) *fiber.App {
    app := fiber.New()
    
    // Middleware
    app.Use(logger.New())
    app.Use(cors.New())
    app.Use(recover.New())
    
    // API v1
    api := app.Group("/api/v1")
    
    // Auth routes
    auth := api.Group("/auth")
    auth.Post("/github", authHandler.GitHubCallback)
    auth.Post("/refresh", authHandler.RefreshToken)
    auth.Get("/me", authMiddleware, authHandler.GetMe)
    
    // Project routes
    projects := api.Group("/projects", authMiddleware)
    projects.Get("/", projectHandler.List)
    projects.Post("/", projectHandler.Create)
    projects.Get("/:id", projectHandler.Get)
    projects.Put("/:id", projectHandler.Update)
    projects.Delete("/:id", projectHandler.Delete)
    
    // Version routes (nested under projects)
    projects.Get("/:id/versions", versionHandler.List)
    projects.Post("/:id/versions", versionHandler.Create)
    projects.Get("/:id/versions/:vid", versionHandler.Get)
    
    // AI routes
    ai := api.Group("/ai", authMiddleware)
    ai.Post("/interpret", aiHandler.InterpretSketch)
    ai.Post("/suggest", aiHandler.GetSuggestions)
    
    // Suggestions
    api.Put("/suggestions/:id", authMiddleware, suggestionHandler.Update)
    
    // Export routes
    export := api.Group("/export", authMiddleware)
    export.Get("/:vid/png", exportHandler.ToPNG)
    export.Get("/:vid/svg", exportHandler.ToSVG)
    export.Get("/:vid/pdf", exportHandler.ToPDF)
    
    // Search
    api.Get("/search", authMiddleware, searchHandler.Search)
    
    // Public routes (no auth)
    app.Get("/public/:slug", publicHandler.GetProject)
    
    // WebSocket
    app.Get("/ws", websocket.New(whiteboardHandler.HandleWebSocket))
    
    return app
}
```

---

## 🚀 Future Microservice Extraction Path

If/when you need to extract services:

### 1. AI Worker Service (When AI causes timeouts)

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Monolith  │────▶│    Redis    │────▶│  AI Worker  │
│             │     │   (Queue)   │     │  (Go/Python)│
└─────────────┘     └─────────────┘     └─────────────┘
```

- Monolith pushes job to Redis queue
- Separate worker process handles AI calls
- Results pushed back via Redis pub/sub

### 2. Export Service (When PDF generation is slow)

```
┌─────────────┐     ┌─────────────┐
│   Monolith  │────▶│Export Worker│
│             │     │ (Puppeteer) │
└─────────────┘     └─────────────┘
```

- Heavy PDF rendering in separate process
- Can scale independently

### 3. The Domain Already Prepared

Because domains are separated by interfaces:

```go
// Current: Direct call
suggestions := s.rules.Evaluate(nodes, edges)

// Future: HTTP call to service (just change implementation)
suggestions := s.rulesClient.Evaluate(ctx, nodes, edges)
```

Same interface, different implementation. **Zero business logic changes**.

---

## ✅ Architecture Benefits

| Benefit | How We Achieve It |
|---------|-------------------|
| **Fast Development** | Single codebase, simple deployment |
| **Clean Code** | Domain separation, dependency injection |
| **Type Safety** | Go's compile-time checks |
| **Performance** | Direct function calls, goroutines |
| **Testability** | Interfaces allow easy mocking |
| **Future-Proof** | Clear extraction boundaries |
| **Portfolio Value** | Shows mature engineering thinking |

---

## 🎯 Summary

**Architecture**: Modular Monolith in Go

**Pattern**: Domain-Driven Design (DDD) lite

**Communication**: Interfaces internally, HTTP/WS externally

**Database**: Single PostgreSQL with logical domain separation

**Scaling Strategy**: Vertical first, extract services only when bottlenecks prove necessary
