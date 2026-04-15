# SysDes - Complete Project Plan

## 📋 Table of Contents
1. [Project Overview](#project-overview)
2. [Tech Stack Decisions](#tech-stack-decisions)
3. [Database Design](#database-design)
4. [API Design](#api-design)
5. [AI Pipeline](#ai-pipeline)
6. [Heuristic Rules Engine](#heuristic-rules-engine)
7. [Frontend Architecture](#frontend-architecture)
8. [DevOps Setup](#devops-setup)
9. [File Structure](#file-structure)
10. [Implementation Order](#implementation-order)

---

## 1. Project Overview

### What We're Building
A web application that:
1. **Captures** hand-drawn system architecture sketches
2. **Interprets** them using AI (Google Gemini Vision)
3. **Generates** clean, professional diagrams
4. **Suggests** design improvements based on custom rules
5. **Stores** every version with full history
6. **Exports** diagrams in multiple formats
7. **Deploys** for public access and portfolio showcase

### Core User Flow
```
┌─────────────────┐
│  User draws on  │
│    whiteboard   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Capture canvas │
│  + explanation  │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Send to Gemini │
│  Vision API     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Extract nodes,  │
│ edges, metadata │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate clean  │
│    diagram      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Run heuristic  │
│  rules engine   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Show diagram +  │
│  suggestions    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Save version   │
│  to database    │
└─────────────────┘
```

---

## 2. Tech Stack Decisions

### Frontend
| Technology | Purpose | Why This Choice |
|------------|---------|-----------------|
| **Next.js 14** | React framework | App router, SSR, API routes, great DX |
| **TailwindCSS** | Styling | Rapid UI development, consistent design |
| **tldraw** | Whiteboard canvas | Best-in-class drawing library, MIT license |
| **React Flow** | Diagram rendering | Customizable nodes/edges, built-in layouts |
| **Zustand** | State management | Simple, TypeScript-friendly, no boilerplate |
| **React Query** | Server state | Caching, background refetch, optimistic updates |
| **shadcn/ui** | UI components | Beautiful, accessible, customizable |

### Backend
| Technology | Purpose | Why This Choice |
|------------|---------|-----------------|
| **Node.js 20** | Runtime | JavaScript ecosystem, async I/O |
| **Express.js** | HTTP server | Simple, mature, extensible |
| **Socket.io** | Realtime events | WebSocket abstraction, room support |
| **Prisma** | ORM for PostgreSQL | Type-safe, migrations, great DX |
| **JWT** | Authentication | Stateless, scalable |
| **Multer** | File uploads | Handle canvas image uploads |
| **Sharp** | Image processing | Resize/optimize images before AI |

### AI & ML
| Technology | Purpose | Why This Choice |
|------------|---------|-----------------|
| **Google Gemini 1.5 Pro** | Vision + Text AI | Multimodal, good at diagrams, free tier |
| **Custom Rules Engine** | Heuristics | Your own logic, no AI unpredictability |

### Databases (MVP Simplified)
| Technology | Purpose | Why This Choice |
|------------|---------|-----------------|
| **PostgreSQL** | Primary database | Reliable, JSONB support, full-text search |
| **Redis** | Caching + Sessions | Fast, pub/sub for realtime |

### Databases (Future - Post MVP)
| Technology | Purpose | When to Add |
|------------|---------|-------------|
| **Neo4j** | Graph relationships | When "Ask Architecture" feature needed |
| **Qdrant** | Vector search | When semantic search needed |

### DevOps
| Technology | Purpose |
|------------|---------|
| **Docker** | Containerization |
| **Docker Compose** | Local multi-service dev |
| **Nginx** | Reverse proxy, SSL |
| **GitHub Actions** | CI/CD pipeline |
| **VPS (DigitalOcean/Hetzner)** | Hosting |
| **Let's Encrypt** | Free SSL certificates |

---

## 3. Database Design

### PostgreSQL Schema

```sql
-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    github_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Projects table (workspace for designs)
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    public_slug VARCHAR(100) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Design versions table
CREATE TABLE design_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Raw input data
    sketch_image_url TEXT,
    stroke_data JSONB,
    explanation_text TEXT,
    voice_transcript TEXT,
    
    -- AI extracted data
    extracted_nodes JSONB,
    extracted_edges JSONB,
    ai_confidence_score FLOAT,
    ai_raw_response JSONB,
    
    -- Generated diagram
    diagram_svg TEXT,
    diagram_config JSONB,
    
    -- Metadata
    tags TEXT[],
    manual_notes TEXT,
    diff_from_previous JSONB,
    
    created_at TIMESTAMP DEFAULT NOW()
);

-- AI Suggestions table
CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    design_version_id UUID REFERENCES design_versions(id) ON DELETE CASCADE,
    
    category VARCHAR(50), -- 'scalability', 'security', 'performance', etc.
    severity VARCHAR(20), -- 'critical', 'warning', 'info'
    title VARCHAR(255),
    description TEXT,
    affected_nodes TEXT[], -- Which nodes this affects
    
    -- Scoring
    impact_score INTEGER, -- 1-10
    complexity_score INTEGER, -- 1-10 (how hard to fix)
    confidence_score FLOAT, -- AI confidence
    
    -- User interaction
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'accepted', 'dismissed'
    user_response TEXT,
    
    rule_id VARCHAR(100), -- Which heuristic rule triggered this
    created_at TIMESTAMP DEFAULT NOW()
);

-- Tags table (for better querying)
CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50), -- 'technology', 'pattern', 'concern'
    color VARCHAR(7) -- Hex color
);

-- Design-Tags junction
CREATE TABLE design_tags (
    design_version_id UUID REFERENCES design_versions(id) ON DELETE CASCADE,
    tag_id UUID REFERENCES tags(id) ON DELETE CASCADE,
    auto_generated BOOLEAN DEFAULT true,
    PRIMARY KEY (design_version_id, tag_id)
);

-- Indexes for performance
CREATE INDEX idx_design_versions_project ON design_versions(project_id);
CREATE INDEX idx_design_versions_created ON design_versions(created_at DESC);
CREATE INDEX idx_suggestions_design ON suggestions(design_version_id);
CREATE INDEX idx_suggestions_category ON suggestions(category);
CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_public ON projects(is_public) WHERE is_public = true;

-- Full text search index
CREATE INDEX idx_design_search ON design_versions 
    USING GIN (to_tsvector('english', explanation_text || ' ' || COALESCE(manual_notes, '')));
```

### Node/Edge JSON Structure

```typescript
// Stored in extracted_nodes JSONB
interface ExtractedNode {
  id: string;
  type: 'service' | 'database' | 'queue' | 'cache' | 'gateway' | 'client' | 'external' | 'container' | 'load_balancer';
  label: string;
  description?: string;
  position: { x: number; y: number }; // Original sketch position
  properties: {
    technology?: string; // "PostgreSQL", "Redis", "Node.js"
    containerized?: boolean;
    replicated?: boolean;
    estimated_load?: string;
  };
  confidence: number; // 0-1, how confident AI is about this extraction
}

// Stored in extracted_edges JSONB
interface ExtractedEdge {
  id: string;
  source: string; // Node ID
  target: string; // Node ID
  type: 'sync' | 'async' | 'realtime' | 'batch' | 'unknown';
  label?: string; // "REST API", "gRPC", "WebSocket"
  properties: {
    protocol?: string;
    authenticated?: boolean;
    encrypted?: boolean;
  };
  style: 'solid' | 'dashed' | 'dotted';
  confidence: number;
  assumed: boolean; // true if AI inferred this connection
}
```

---

## 4. API Design

### Authentication Endpoints
```
POST   /api/auth/github          # GitHub OAuth callback
POST   /api/auth/refresh         # Refresh JWT token
POST   /api/auth/logout          # Invalidate session
GET    /api/auth/me              # Get current user
```

### Project Endpoints
```
GET    /api/projects             # List user's projects
POST   /api/projects             # Create new project
GET    /api/projects/:id         # Get project details
PUT    /api/projects/:id         # Update project
DELETE /api/projects/:id         # Delete project
POST   /api/projects/:id/publish # Make project public
GET    /api/public/:slug         # Get public project (no auth)
```

### Design Version Endpoints
```
GET    /api/projects/:id/versions           # List all versions
POST   /api/projects/:id/versions           # Create new version
GET    /api/projects/:id/versions/:vid      # Get specific version
GET    /api/projects/:id/versions/:vid/diff # Compare with previous
DELETE /api/projects/:id/versions/:vid      # Delete version
```

### AI Processing Endpoints
```
POST   /api/ai/interpret         # Send sketch for interpretation
        Body: { image: base64, strokes: JSON, explanation: string }
        Response: { nodes: [], edges: [], confidence: number }

POST   /api/ai/suggest           # Get design suggestions
        Body: { nodes: [], edges: [], context: string }
        Response: { suggestions: [] }

POST   /api/ai/regenerate        # Regenerate diagram with tweaks
        Body: { versionId: string, modifications: {} }
```

### Suggestion Endpoints
```
GET    /api/versions/:vid/suggestions       # Get suggestions for version
PUT    /api/suggestions/:id                 # Update suggestion status
POST   /api/suggestions/:id/apply           # Apply suggestion to design
```

### Export Endpoints
```
GET    /api/export/:vid/png      # Export as PNG
GET    /api/export/:vid/svg      # Export as SVG
GET    /api/export/:vid/pdf      # Export as PDF
GET    /api/export/:vid/embed    # Get embed code
```

### Search Endpoints (MVP - Simple)
```
GET    /api/search?q=auth        # Full-text search designs
GET    /api/search/tags          # List all tags with counts
GET    /api/search/tags/:tag     # Get designs by tag
```

### WebSocket Events (Socket.io)
```
# Client → Server
canvas:update          # Send canvas changes
cursor:move            # Send cursor position (collab)

# Server → Client
version:created        # New version saved
ai:progress            # AI processing progress
suggestion:new         # New suggestion generated
collab:cursor          # Other user's cursor (collab)
```

---

## 5. AI Pipeline

### Prompt Templates

#### 1. Sketch Interpretation Prompt
```markdown
You are an expert system architect analyzing a hand-drawn architecture sketch.

## Your Task
Analyze the provided sketch image and extract:
1. All system components (services, databases, queues, caches, etc.)
2. All connections between components
3. The overall architecture pattern

## Input Context
User's explanation: {explanation_text}

## Output Format
Return a JSON object with this exact structure:
{
  "nodes": [
    {
      "id": "unique_id",
      "type": "service|database|queue|cache|gateway|client|external|container|load_balancer",
      "label": "Component Name",
      "description": "Brief description of purpose",
      "properties": {
        "technology": "Detected or inferred technology",
        "containerized": true/false,
        "replicated": true/false
      },
      "confidence": 0.0-1.0
    }
  ],
  "edges": [
    {
      "id": "unique_id",
      "source": "node_id",
      "target": "node_id", 
      "type": "sync|async|realtime|batch|unknown",
      "label": "Connection description",
      "properties": {
        "protocol": "REST|gRPC|WebSocket|AMQP|etc",
        "authenticated": true/false
      },
      "style": "solid|dashed|dotted",
      "confidence": 0.0-1.0,
      "assumed": true/false
    }
  ],
  "patterns_detected": ["microservices", "event-driven", "monolith", etc],
  "overall_confidence": 0.0-1.0,
  "ambiguities": ["List of unclear elements that need user confirmation"]
}

## Rules
- If a connection seems implied but not drawn, include it with "assumed": true
- Solid arrows = synchronous calls
- Dashed arrows = asynchronous/event-based
- Cylinders = databases
- Clouds = external services
- Boxes = services/applications
- If text is unclear, make best guess and note in ambiguities
```

#### 2. Design Suggestions Prompt
```markdown
You are a senior system architect reviewing a system design.

## Current Design
Nodes: {nodes_json}
Edges: {edges_json}
Context: {user_explanation}

## Your Task
Analyze this design and provide actionable suggestions for improvement.

## Categories to Consider
1. **Scalability** - Can this handle 10x, 100x load?
2. **Security** - Authentication, encryption, isolation
3. **Reliability** - Single points of failure, redundancy
4. **Performance** - Caching, connection pooling, async patterns
5. **Maintainability** - Service boundaries, coupling
6. **Cost** - Resource optimization

## Output Format
{
  "suggestions": [
    {
      "category": "scalability|security|reliability|performance|maintainability|cost",
      "severity": "critical|warning|info",
      "title": "Short title",
      "description": "Detailed explanation",
      "affected_nodes": ["node_ids"],
      "recommendation": "Specific action to take",
      "impact_score": 1-10,
      "complexity_score": 1-10
    }
  ]
}

## Important Rules
- Be specific, not generic
- Reference actual components in the design
- Prioritize critical issues first
- Don't suggest unnecessary complexity
- Consider the apparent scale/context of the application
```

#### 3. Tag Extraction Prompt
```markdown
Given this system design, extract relevant tags.

Nodes: {nodes_summary}
Technologies detected: {technologies}
Patterns: {patterns}

Return tags in these categories:
- Technologies: (Redis, PostgreSQL, Kafka, etc.)
- Patterns: (microservices, event-driven, CQRS, etc.)
- Concerns: (auth, caching, messaging, storage, etc.)
- Scale: (small, medium, large, enterprise)

Output as JSON array: ["tag1", "tag2", ...]
```

### AI Pipeline Flow

```
┌──────────────────────────────────────────────────────────────┐
│                    AI Processing Pipeline                     │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. IMAGE PREPROCESSING                                       │
│     ├─ Resize to max 1024x1024                               │
│     ├─ Convert to base64                                      │
│     └─ Compress if > 4MB                                      │
│                                                               │
│  2. SKETCH INTERPRETATION (Gemini Vision)                     │
│     ├─ Send: image + explanation + interpretation prompt      │
│     ├─ Receive: nodes + edges + patterns                      │
│     ├─ Validate JSON structure                                │
│     └─ Retry up to 3x on failure                              │
│                                                               │
│  3. POST-PROCESSING                                           │
│     ├─ Assign final IDs to nodes/edges                        │
│     ├─ Calculate layout positions (dagre)                     │
│     ├─ Detect low-confidence items                            │
│     └─ Mark assumed connections                               │
│                                                               │
│  4. HEURISTIC RULES (Your Custom Logic)                       │
│     ├─ Run all rules against structure                        │
│     ├─ Generate rule-based suggestions                        │
│     └─ Score each suggestion                                  │
│                                                               │
│  5. AI SUGGESTIONS (Gemini Text)                              │
│     ├─ Send: nodes + edges + context + suggestions prompt     │
│     ├─ Receive: additional AI suggestions                     │
│     └─ Merge with rule-based suggestions                      │
│                                                               │
│  6. TAG EXTRACTION                                            │
│     ├─ Extract from detected technologies                     │
│     ├─ Extract from patterns                                  │
│     └─ Send to Gemini for additional tags                     │
│                                                               │
│  7. DIAGRAM GENERATION                                        │
│     ├─ Convert nodes to React Flow format                     │
│     ├─ Apply layout algorithm                                 │
│     ├─ Generate SVG snapshot                                  │
│     └─ Store all data                                         │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 6. Heuristic Rules Engine

### Rule Structure

```typescript
interface HeuristicRule {
  id: string;
  name: string;
  description: string;
  category: 'scalability' | 'security' | 'reliability' | 'performance' | 'maintainability';
  severity: 'critical' | 'warning' | 'info';
  
  // Function that checks if rule applies
  condition: (design: Design) => boolean;
  
  // Function that returns affected nodes
  getAffectedNodes: (design: Design) => string[];
  
  // Suggestion to show user
  suggestion: {
    title: string;
    description: string;
    recommendation: string;
  };
  
  // Scoring
  impactScore: number;
  complexityScore: number;
}
```

### MVP Rules (10 Core Rules)

```typescript
const rules: HeuristicRule[] = [
  
  // RULE 1: Database inside service boundary
  {
    id: 'db-inside-service',
    name: 'Database Coupling',
    category: 'maintainability',
    severity: 'warning',
    condition: (design) => {
      // Check if any database node is visually "inside" a service
      // Based on position/containment in original sketch
      return design.nodes.some(node => 
        node.type === 'database' && 
        design.getContainingService(node) !== null
      );
    },
    suggestion: {
      title: 'Database tightly coupled with service',
      description: 'Your database appears to be embedded within a service boundary. This makes it harder to scale and maintain independently.',
      recommendation: 'Consider extracting the database as a separate component with a clear API boundary.'
    },
    impactScore: 7,
    complexityScore: 4
  },

  // RULE 2: Missing API Gateway
  {
    id: 'missing-api-gateway',
    name: 'No API Gateway',
    category: 'security',
    severity: 'warning',
    condition: (design) => {
      const hasMultipleServices = design.nodes.filter(n => n.type === 'service').length > 2;
      const hasClient = design.nodes.some(n => n.type === 'client');
      const hasGateway = design.nodes.some(n => n.type === 'gateway');
      
      return hasMultipleServices && hasClient && !hasGateway;
    },
    suggestion: {
      title: 'Consider adding an API Gateway',
      description: 'With multiple services, an API Gateway provides centralized authentication, rate limiting, and routing.',
      recommendation: 'Add an API Gateway (Kong, AWS API Gateway, or Nginx) between clients and your services.'
    },
    impactScore: 8,
    complexityScore: 5
  },

  // RULE 3: Direct service-to-service database access
  {
    id: 'shared-database',
    name: 'Shared Database Anti-pattern',
    category: 'maintainability',
    severity: 'critical',
    condition: (design) => {
      // Check if multiple services connect to same database
      const dbNodes = design.nodes.filter(n => n.type === 'database');
      return dbNodes.some(db => {
        const connections = design.edges.filter(e => e.target === db.id);
        const sourceServices = connections.map(c => c.source);
        const uniqueServices = new Set(sourceServices);
        return uniqueServices.size > 1;
      });
    },
    suggestion: {
      title: 'Multiple services sharing a database',
      description: 'Sharing databases between services creates tight coupling and makes independent deployment difficult.',
      recommendation: 'Consider database-per-service pattern or use APIs for cross-service data access.'
    },
    impactScore: 9,
    complexityScore: 8
  },

  // RULE 4: No caching layer
  {
    id: 'no-cache',
    name: 'Missing Cache Layer',
    category: 'performance',
    severity: 'info',
    condition: (design) => {
      const hasDatabase = design.nodes.some(n => n.type === 'database');
      const hasCache = design.nodes.some(n => n.type === 'cache');
      const hasHighTraffic = design.estimatedScale === 'large';
      
      return hasDatabase && !hasCache && hasHighTraffic;
    },
    suggestion: {
      title: 'Consider adding a caching layer',
      description: 'For high-traffic applications, caching frequently accessed data can significantly improve response times.',
      recommendation: 'Add Redis or Memcached as a caching layer between your services and database.'
    },
    impactScore: 6,
    complexityScore: 3
  },

  // RULE 5: Single point of failure
  {
    id: 'single-point-failure',
    name: 'Single Point of Failure',
    category: 'reliability',
    severity: 'critical',
    condition: (design) => {
      // Find nodes that are critical path with no redundancy
      return design.nodes.some(node => {
        if (node.type === 'database' || node.type === 'gateway') {
          const incomingEdges = design.edges.filter(e => e.target === node.id);
          const isReplicated = node.properties?.replicated === true;
          return incomingEdges.length > 2 && !isReplicated;
        }
        return false;
      });
    },
    suggestion: {
      title: 'Single point of failure detected',
      description: 'Critical components without redundancy can cause system-wide outages.',
      recommendation: 'Consider adding replication, load balancing, or failover for critical components.'
    },
    impactScore: 10,
    complexityScore: 6
  },

  // RULE 6: Synchronous chain too long
  {
    id: 'sync-chain',
    name: 'Long Synchronous Chain',
    category: 'performance',
    severity: 'warning',
    condition: (design) => {
      // Detect chains of 4+ synchronous calls
      const syncEdges = design.edges.filter(e => e.type === 'sync');
      // Use graph traversal to find chains
      return design.findLongestSyncChain() > 3;
    },
    suggestion: {
      title: 'Long synchronous call chain',
      description: 'Chains of synchronous calls increase latency and reduce reliability.',
      recommendation: 'Consider using async messaging or caching to break long chains.'
    },
    impactScore: 7,
    complexityScore: 6
  },

  // RULE 7: Missing authentication
  {
    id: 'missing-auth',
    name: 'Unauthenticated Endpoints',
    category: 'security',
    severity: 'critical',
    condition: (design) => {
      const clientEdges = design.edges.filter(e => {
        const source = design.getNode(e.source);
        return source?.type === 'client' || source?.type === 'external';
      });
      
      return clientEdges.some(e => e.properties?.authenticated !== true);
    },
    suggestion: {
      title: 'Client connections may lack authentication',
      description: 'External connections should be authenticated to prevent unauthorized access.',
      recommendation: 'Implement JWT, OAuth, or API key authentication for all client-facing endpoints.'
    },
    impactScore: 10,
    complexityScore: 5
  },

  // RULE 8: Container without network isolation
  {
    id: 'container-network',
    name: 'Container Network Isolation',
    category: 'security',
    severity: 'warning',
    condition: (design) => {
      const containers = design.nodes.filter(n => n.properties?.containerized);
      const hasMultipleContainers = containers.length > 2;
      // Check if services in different "zones" are directly connected
      return hasMultipleContainers && !design.hasNetworkSegmentation();
    },
    suggestion: {
      title: 'Consider container network isolation',
      description: 'Containers in the same network can communicate freely, which may be a security risk.',
      recommendation: 'Use Docker networks or Kubernetes namespaces to isolate service groups.'
    },
    impactScore: 6,
    complexityScore: 4
  },

  // RULE 9: Realtime without WebSocket
  {
    id: 'realtime-pattern',
    name: 'Realtime Communication Pattern',
    category: 'performance',
    severity: 'info',
    condition: (design) => {
      const hasRealtimeEdge = design.edges.some(e => e.type === 'realtime');
      const hasWebSocket = design.nodes.some(n => 
        n.properties?.technology?.toLowerCase().includes('websocket') ||
        n.properties?.protocol?.toLowerCase().includes('websocket')
      );
      
      return hasRealtimeEdge && !hasWebSocket;
    },
    suggestion: {
      title: 'Consider WebSocket for realtime features',
      description: 'Polling-based realtime updates are inefficient compared to WebSocket connections.',
      recommendation: 'Use WebSocket, Socket.io, or Server-Sent Events for realtime features.'
    },
    impactScore: 5,
    complexityScore: 4
  },

  // RULE 10: No monitoring/observability
  {
    id: 'no-observability',
    name: 'Missing Observability',
    category: 'reliability',
    severity: 'info',
    condition: (design) => {
      const hasObservability = design.nodes.some(n => 
        n.label.toLowerCase().includes('monitor') ||
        n.label.toLowerCase().includes('prometheus') ||
        n.label.toLowerCase().includes('grafana') ||
        n.label.toLowerCase().includes('logging') ||
        n.label.toLowerCase().includes('elk')
      );
      
      return design.nodes.length > 3 && !hasObservability;
    },
    suggestion: {
      title: 'Consider adding observability',
      description: 'Without monitoring, debugging production issues becomes very difficult.',
      recommendation: 'Add logging (ELK), metrics (Prometheus/Grafana), and tracing (Jaeger).'
    },
    impactScore: 7,
    complexityScore: 5
  }
];
```

### Suggestion Scoring Algorithm

```typescript
interface SuggestionScore {
  totalScore: number;      // Final priority score
  impactScore: number;     // How much it improves design (1-10)
  complexityScore: number; // How hard to implement (1-10)
  confidenceScore: number; // How confident we are (0-1)
  urgencyScore: number;    // Based on severity (1-10)
}

function calculateSuggestionScore(suggestion: Suggestion): SuggestionScore {
  // Severity to urgency mapping
  const urgencyMap = {
    'critical': 10,
    'warning': 6,
    'info': 3
  };
  
  const urgencyScore = urgencyMap[suggestion.severity];
  
  // Total score formula:
  // Higher impact + Higher urgency + Lower complexity = Higher priority
  const totalScore = (
    (suggestion.impactScore * 0.4) +
    (urgencyScore * 0.3) +
    ((10 - suggestion.complexityScore) * 0.2) +
    (suggestion.confidenceScore * 10 * 0.1)
  );
  
  return {
    totalScore: Math.round(totalScore * 10) / 10,
    impactScore: suggestion.impactScore,
    complexityScore: suggestion.complexityScore,
    confidenceScore: suggestion.confidenceScore,
    urgencyScore
  };
}

// Sort suggestions by total score descending
function prioritizeSuggestions(suggestions: Suggestion[]): Suggestion[] {
  return suggestions
    .map(s => ({ ...s, score: calculateSuggestionScore(s) }))
    .sort((a, b) => b.score.totalScore - a.score.totalScore);
}
```

---

## 7. Frontend Architecture

### Page Structure

```
/                           # Landing page
/login                      # Login page
/dashboard                  # User's projects list
/project/[id]              # Project workspace (main editor)
/project/[id]/history      # Version history
/project/[id]/settings     # Project settings
/public/[slug]             # Public shared view
/gallery                   # Public gallery of designs
```

### Component Hierarchy

```
App
├── Layout
│   ├── Header
│   │   ├── Logo
│   │   ├── Navigation
│   │   └── UserMenu
│   └── Footer
│
├── Dashboard
│   ├── ProjectGrid
│   │   └── ProjectCard
│   └── CreateProjectModal
│
├── Editor (Main Workspace)
│   ├── Toolbar
│   │   ├── DrawingTools
│   │   ├── UndoRedo
│   │   └── ExportButtons
│   │
│   ├── CanvasArea
│   │   ├── TldrawCanvas        # Drawing whiteboard
│   │   └── ReactFlowDiagram    # Clean diagram view
│   │
│   ├── Sidebar
│   │   ├── TabNavigation
│   │   ├── ExplanationPanel    # Text/voice input
│   │   ├── SuggestionsPanel    # AI suggestions
│   │   ├── NodesPanel          # Extracted components
│   │   └── HistoryPanel        # Version timeline
│   │
│   └── BottomBar
│       ├── AIStatus            # Processing indicator
│       └── VersionInfo
│
└── Modals
    ├── ExportModal
    ├── ShareModal
    ├── VersionCompareModal
    └── SettingsModal
```

### State Management (Zustand)

```typescript
// stores/editor.store.ts
interface EditorState {
  // Canvas state
  canvasMode: 'draw' | 'diagram';
  strokes: Stroke[];
  
  // Design data
  nodes: ExtractedNode[];
  edges: ExtractedEdge[];
  
  // AI state
  isProcessing: boolean;
  aiProgress: number;
  suggestions: Suggestion[];
  
  // Version state
  currentVersion: DesignVersion | null;
  hasUnsavedChanges: boolean;
  
  // Actions
  setCanvasMode: (mode: 'draw' | 'diagram') => void;
  updateStrokes: (strokes: Stroke[]) => void;
  processWithAI: () => Promise<void>;
  acceptSuggestion: (id: string) => void;
  dismissSuggestion: (id: string) => void;
  saveVersion: () => Promise<void>;
}

// stores/project.store.ts
interface ProjectState {
  currentProject: Project | null;
  versions: DesignVersion[];
  
  loadProject: (id: string) => Promise<void>;
  createVersion: (data: CreateVersionDTO) => Promise<void>;
  deleteVersion: (id: string) => Promise<void>;
}
```

---

## 8. DevOps Setup

### Docker Compose (Development)

```yaml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
      - /app/node_modules
    environment:
      - NEXT_PUBLIC_API_URL=http://localhost:4000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    volumes:
      - ./backend:/app
      - /app/node_modules
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/archboard
      - REDIS_URL=redis://redis:6379
      - GEMINI_API_KEY=${GEMINI_API_KEY}
      - JWT_SECRET=${JWT_SECRET}
    depends_on:
      - db
      - redis

  db:
    image: postgres:15-alpine
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
      - POSTGRES_DB=archboard
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml
name: Deploy

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test

  build-and-push:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: ghcr.io/${{ github.repository }}/frontend:latest
      - uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: ghcr.io/${{ github.repository }}/backend:latest

  deploy:
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to VPS
        uses: appleboy/ssh-action@v1
        with:
          host: ${{ secrets.VPS_HOST }}
          username: ${{ secrets.VPS_USER }}
          key: ${{ secrets.VPS_SSH_KEY }}
          script: |
            cd /opt/archboard
            docker compose pull
            docker compose up -d
```

### Nginx Configuration

```nginx
# nginx/archboard.conf
upstream frontend {
    server frontend:3000;
}

upstream backend {
    server backend:4000;
}

server {
    listen 80;
    server_name archboard.yourdomain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name archboard.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/archboard.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/archboard.yourdomain.com/privkey.pem;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    # WebSocket
    location /socket.io {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

---

## 9. Complete File Structure

```
archboard-ai/
│
├── frontend/
│   ├── public/
│   │   └── icons/
│   ├── src/
│   │   ├── app/                    # Next.js App Router
│   │   │   ├── (auth)/
│   │   │   │   ├── login/
│   │   │   │   └── callback/
│   │   │   ├── (dashboard)/
│   │   │   │   ├── dashboard/
│   │   │   │   └── project/[id]/
│   │   │   ├── (public)/
│   │   │   │   ├── public/[slug]/
│   │   │   │   └── gallery/
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/                 # shadcn components
│   │   │   ├── canvas/
│   │   │   │   ├── TldrawCanvas.tsx
│   │   │   │   └── ReactFlowDiagram.tsx
│   │   │   ├── editor/
│   │   │   │   ├── Toolbar.tsx
│   │   │   │   ├── Sidebar.tsx
│   │   │   │   └── Panels/
│   │   │   ├── diagram/
│   │   │   │   ├── CustomNodes/
│   │   │   │   └── CustomEdges/
│   │   │   └── shared/
│   │   ├── hooks/
│   │   │   ├── useCanvas.ts
│   │   │   ├── useAI.ts
│   │   │   └── useProject.ts
│   │   ├── stores/
│   │   │   ├── editor.store.ts
│   │   │   └── project.store.ts
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   └── styles/
│   │       └── globals.css
│   ├── package.json
│   ├── tailwind.config.ts
│   ├── tsconfig.json
│   └── Dockerfile
│
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts
│   │   │   └── env.ts
│   │   ├── controllers/
│   │   │   ├── auth.controller.ts
│   │   │   ├── project.controller.ts
│   │   │   ├── version.controller.ts
│   │   │   ├── ai.controller.ts
│   │   │   └── export.controller.ts
│   │   ├── middleware/
│   │   │   ├── auth.middleware.ts
│   │   │   ├── error.middleware.ts
│   │   │   └── upload.middleware.ts
│   │   ├── routes/
│   │   │   ├── index.ts
│   │   │   ├── auth.routes.ts
│   │   │   ├── project.routes.ts
│   │   │   └── ai.routes.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── project.service.ts
│   │   │   ├── version.service.ts
│   │   │   └── suggestion.service.ts
│   │   ├── socket/
│   │   │   ├── index.ts
│   │   │   └── handlers/
│   │   ├── utils/
│   │   │   └── helpers.ts
│   │   └── index.ts
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── migrations/
│   ├── package.json
│   ├── tsconfig.json
│   └── Dockerfile
│
├── ai-engine/
│   ├── src/
│   │   ├── prompts/
│   │   │   ├── sketch-interpreter.ts
│   │   │   ├── design-suggestions.ts
│   │   │   └── tag-extractor.ts
│   │   ├── services/
│   │   │   ├── gemini.service.ts
│   │   │   └── pipeline.service.ts
│   │   ├── rules/
│   │   │   ├── index.ts
│   │   │   ├── scalability.rules.ts
│   │   │   ├── security.rules.ts
│   │   │   ├── reliability.rules.ts
│   │   │   └── performance.rules.ts
│   │   ├── parsers/
│   │   │   ├── structure.parser.ts
│   │   │   └── validation.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
│
├── diagram-service/
│   ├── src/
│   │   ├── generators/
│   │   │   ├── svg.generator.ts
│   │   │   └── layout.ts
│   │   ├── renderers/
│   │   │   └── react-flow.renderer.ts
│   │   └── index.ts
│   ├── package.json
│   └── Dockerfile
│
├── export-service/
│   ├── src/
│   │   ├── exporters/
│   │   │   ├── png.exporter.ts
│   │   │   ├── svg.exporter.ts
│   │   │   └── pdf.exporter.ts
│   │   └── index.ts
│   ├── package.json
│   └── Dockerfile
│
├── docker/
│   ├── docker-compose.yml
│   ├── docker-compose.prod.yml
│   └── .env.example
│
├── nginx/
│   ├── nginx.conf
│   └── archboard.conf
│
├── ci/
│   └── .github/
│       └── workflows/
│           ├── test.yml
│           └── deploy.yml
│
├── docs/
│   ├── COMPLETE_PLAN.md
│   ├── ROADMAP.md
│   ├── API.md
│   └── ARCHITECTURE.md
│
├── .gitignore
├── .env.example
└── README.md
```

---

## 10. Implementation Order

### Week 1-2: Foundation
```
Day 1-2:   Set up monorepo, install dependencies
Day 3-4:   Frontend: Next.js + TailwindCSS + shadcn/ui
Day 5-6:   Frontend: Integrate tldraw canvas
Day 7-8:   Backend: Express + PostgreSQL + Prisma
Day 9-10:  Backend: Auth (JWT + GitHub OAuth)
Day 11-14: Connect frontend ↔ backend, basic CRUD
```

### Week 3-4: AI Core
```
Day 15-16: Set up Gemini API integration
Day 17-19: Implement sketch interpretation pipeline
Day 20-22: Parse AI response → nodes/edges
Day 23-24: Build React Flow diagram renderer
Day 25-28: Test and refine AI accuracy
```

### Week 5-6: Suggestions Engine
```
Day 29-31: Implement heuristic rules engine
Day 32-34: Build 10 core rules
Day 35-37: Scoring algorithm
Day 38-40: Suggestions UI panel
Day 41-42: Accept/dismiss flow
```

### Week 7-8: Storage & History
```
Day 43-45: Version save/load
Day 46-48: Version history UI
Day 49-50: Version diff comparison
Day 51-53: Auto-tagging
Day 54-56: Search by text/tags
```

### Week 9-10: Export & Polish
```
Day 57-59: PNG export
Day 60-62: SVG export
Day 63-65: Public sharing links
Day 66-70: UI polish, bug fixes
```

### Week 11-12: Deploy
```
Day 71-73: Dockerize all services
Day 74-76: Set up VPS + domain
Day 77-79: Nginx + SSL
Day 80-82: CI/CD pipeline
Day 83-84: Final testing + launch
```

---

## 💰 Estimated Costs

| Item | Monthly Cost |
|------|-------------|
| VPS (4GB RAM) | $20-40 |
| Domain | $1-2 |
| Gemini API (free tier) | $0 |
| Gemini API (paid, if needed) | $10-50 |
| **Total** | **$21-92/month** |

---

## ✅ Pre-requisites Before Starting

1. **Google Cloud Account** - For Gemini API key
2. **GitHub Account** - For OAuth + hosting
3. **VPS Account** - DigitalOcean/Hetzner/etc
4. **Domain** - For deployment
5. **Node.js 20+** - Local development
6. **Docker Desktop** - For containerization
7. **PostgreSQL** - Local or Docker
8. **VS Code** - With extensions (ESLint, Prettier, Prisma)

---

## 🚀 Ready to Build?

This plan gives you:
- Clear technical decisions
- Realistic timeline
- All schemas and APIs defined
- AI prompts ready to use
- DevOps configuration ready

**Next step**: Start Phase 0 - Project setup!
