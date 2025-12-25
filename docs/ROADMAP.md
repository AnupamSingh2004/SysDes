# SysDes - Development Roadmap

## 🎯 MVP vs Full Vision

### Critical Advice: Build in Layers

**DON'T** try to build everything at once. Here's a realistic phased approach:

---

## Phase 0: Foundation (Week 1-2)
**Goal: Basic canvas + backend skeleton**

### MVP Features:
- [ ] Next.js project with TailwindCSS
- [ ] Basic tldraw canvas integration
- [ ] Draw shapes, arrows, text
- [ ] Express backend with basic routes
- [ ] PostgreSQL setup for user data
- [ ] Simple JWT authentication

### Skip for Now:
- Neo4j (use PostgreSQL JSON columns initially)
- Qdrant (implement later)
- WebRTC collaboration
- Multiple export formats

---

## Phase 1: Core AI Pipeline (Week 3-4)
**Goal: Sketch → AI → Structured Data**

### MVP Features:
- [ ] Capture canvas as image + stroke JSON
- [ ] Send to Gemini Vision API
- [ ] Parse response into nodes/edges structure
- [ ] Display parsed structure in sidebar
- [ ] Basic error handling

### Key Files to Build:
```
ai-engine/
├── prompts/
│   └── sketch-interpreter.md
├── services/
│   └── gemini.service.js
└── parsers/
    └── structure.parser.js
```

---

## Phase 2: Diagram Generation (Week 5-6)
**Goal: Structured Data → Clean Diagram**

### MVP Features:
- [ ] React Flow integration for diagram display
- [ ] Auto-layout algorithm (dagre or elkjs)
- [ ] Different node types (service, database, queue, etc.)
- [ ] Edge types (sync, async, realtime)
- [ ] Basic styling/theming

### Skip for Now:
- 3D layered view
- Sequence diagrams
- Multiple diagram formats

---

## Phase 3: AI Suggestions (Week 7-8)
**Goal: Design analysis + recommendations**

### MVP Features:
- [ ] Define 10 core heuristic rules
- [ ] Send design to Gemini for analysis
- [ ] Score and rank suggestions
- [ ] Display suggestions panel
- [ ] Accept/dismiss suggestions

### Initial Rules to Implement:
1. DB inside service warning
2. Missing API gateway detection
3. Direct service-to-service coupling
4. Missing cache layer suggestion
5. Container isolation warnings

---

## Phase 4: Version Storage (Week 9-10)
**Goal: Save and compare designs**

### MVP Features:
- [ ] Save design versions to PostgreSQL
- [ ] Version history UI
- [ ] Compare two versions
- [ ] Auto-tagging (simple keyword extraction)
- [ ] Manual notes per version

### Database Tables:
- users
- projects
- design_versions
- suggestions
- tags

---

## Phase 5: Export & Deploy (Week 11-12)
**Goal: Make it shareable**

### MVP Features:
- [ ] Export as PNG
- [ ] Export as SVG
- [ ] Public shareable link
- [ ] Docker Compose for all services
- [ ] Deploy to VPS
- [ ] Basic CI/CD

---

## 🚀 Post-MVP Enhancements

### Phase 6: Advanced Search (Month 4)
- Neo4j for graph queries
- Qdrant for semantic search
- "Ask your architecture" feature

### Phase 7: Collaboration (Month 5)
- WebSocket-based realtime sync
- Multi-cursor support
- Presence indicators
- Role-based permissions

### Phase 8: Voice Input (Month 6)
- Web Speech API integration
- Voice-to-text for explanations
- Voice commands for canvas

### Phase 9: Advanced Diagrams (Month 7)
- Sequence diagram generation
- Deployment diagram view
- Component interaction maps
- 3D layered visualization

### Phase 10: Polish & Scale (Month 8+)
- Performance optimization
- Mobile responsive design
- Premium features
- Analytics dashboard

---

## 📊 Effort Estimation

| Phase | Duration | Complexity | Dependencies |
|-------|----------|------------|--------------|
| Phase 0 | 2 weeks | Medium | None |
| Phase 1 | 2 weeks | High | Phase 0 |
| Phase 2 | 2 weeks | High | Phase 1 |
| Phase 3 | 2 weeks | High | Phase 2 |
| Phase 4 | 2 weeks | Medium | Phase 3 |
| Phase 5 | 2 weeks | Medium | Phase 4 |

**Total MVP: ~12 weeks (3 months) of focused work**

---

## 🎯 Success Criteria for MVP

1. User can draw a system architecture sketch
2. AI extracts components and relationships
3. Clean diagram is generated automatically
4. AI provides 3-5 relevant suggestions
5. User can save and view past versions
6. User can export and share diagram
7. Deployed and accessible online

---

## ⚠️ Risk Mitigation

### AI Accuracy Risk
- **Mitigation**: Build manual override UI for when AI misinterprets
- **Mitigation**: Allow users to correct and retrain understanding

### Scope Creep Risk
- **Mitigation**: Strictly follow phase boundaries
- **Mitigation**: Create feature backlog, not feature list

### Cost Risk
- **Mitigation**: Use Gemini free tier initially (15 requests/min)
- **Mitigation**: Cache AI responses aggressively
- **Mitigation**: Consider open-source models for v2

### Technical Complexity Risk
- **Mitigation**: Start with PostgreSQL only
- **Mitigation**: Add Neo4j/Qdrant only when proven necessary
