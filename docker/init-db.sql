-- SysDes Database Schema
-- Modular Monolith - All domains in single database

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- AUTH DOMAIN
-- ============================================

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    avatar_url TEXT,
    github_id VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- PROJECT DOMAIN
-- ============================================

CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    is_public BOOLEAN DEFAULT false,
    public_slug VARCHAR(100) UNIQUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_projects_user ON projects(user_id);
CREATE INDEX idx_projects_public ON projects(is_public) WHERE is_public = true;
CREATE INDEX idx_projects_slug ON projects(public_slug) WHERE public_slug IS NOT NULL;

-- ============================================
-- VERSION DOMAIN
-- ============================================

CREATE TABLE design_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    
    -- Raw input data
    sketch_image_url TEXT,
    stroke_data JSONB DEFAULT '{}',
    explanation_text TEXT,
    
    -- AI extracted data
    nodes JSONB NOT NULL DEFAULT '[]',
    edges JSONB NOT NULL DEFAULT '[]',
    ai_confidence FLOAT,
    ai_raw_response JSONB,
    
    -- Generated diagram
    diagram_svg TEXT,
    diagram_config JSONB DEFAULT '{}',
    
    -- Metadata
    tags TEXT[] DEFAULT '{}',
    notes TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    UNIQUE(project_id, version_number)
);

CREATE INDEX idx_versions_project ON design_versions(project_id);
CREATE INDEX idx_versions_created ON design_versions(created_at DESC);
CREATE INDEX idx_versions_tags ON design_versions USING GIN(tags);

-- Full-text search index
CREATE INDEX idx_versions_search ON design_versions 
    USING GIN (to_tsvector('english', COALESCE(explanation_text, '') || ' ' || COALESCE(notes, '')));

-- ============================================
-- SUGGESTIONS DOMAIN
-- ============================================

CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    version_id UUID NOT NULL REFERENCES design_versions(id) ON DELETE CASCADE,
    
    -- Rule identification
    rule_id VARCHAR(100) NOT NULL,
    
    -- Suggestion details
    category VARCHAR(50) NOT NULL, -- scalability, security, reliability, performance, maintainability
    severity VARCHAR(20) NOT NULL, -- critical, warning, info
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    recommendation TEXT,
    
    -- Affected components
    affected_nodes TEXT[] DEFAULT '{}',
    
    -- Scoring
    impact_score INTEGER CHECK (impact_score >= 1 AND impact_score <= 10),
    complexity_score INTEGER CHECK (complexity_score >= 1 AND complexity_score <= 10),
    confidence_score FLOAT CHECK (confidence_score >= 0 AND confidence_score <= 1),
    
    -- User interaction
    status VARCHAR(20) DEFAULT 'pending', -- pending, accepted, dismissed
    user_response TEXT,
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_suggestions_version ON suggestions(version_id);
CREATE INDEX idx_suggestions_category ON suggestions(category);
CREATE INDEX idx_suggestions_status ON suggestions(status);

-- ============================================
-- TAGS DOMAIN (Optional - for better tag management)
-- ============================================

CREATE TABLE tags (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50), -- technology, pattern, concern
    color VARCHAR(7), -- Hex color
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tags_category ON tags(category);
CREATE INDEX idx_tags_usage ON tags(usage_count DESC);

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at
    BEFORE UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Auto-increment version number
CREATE OR REPLACE FUNCTION set_version_number()
RETURNS TRIGGER AS $$
BEGIN
    NEW.version_number := COALESCE(
        (SELECT MAX(version_number) + 1 FROM design_versions WHERE project_id = NEW.project_id),
        1
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER design_versions_set_number
    BEFORE INSERT ON design_versions
    FOR EACH ROW
    WHEN (NEW.version_number IS NULL)
    EXECUTE FUNCTION set_version_number();

-- ============================================
-- SEED DATA (Development)
-- ============================================

-- Insert some common tags
INSERT INTO tags (name, category, color) VALUES
    ('postgresql', 'technology', '#336791'),
    ('redis', 'technology', '#DC382D'),
    ('docker', 'technology', '#2496ED'),
    ('kubernetes', 'technology', '#326CE5'),
    ('nginx', 'technology', '#009639'),
    ('kafka', 'technology', '#231F20'),
    ('microservices', 'pattern', '#FF6B6B'),
    ('monolith', 'pattern', '#4ECDC4'),
    ('event-driven', 'pattern', '#45B7D1'),
    ('cqrs', 'pattern', '#96CEB4'),
    ('authentication', 'concern', '#DDA0DD'),
    ('caching', 'concern', '#98D8C8'),
    ('messaging', 'concern', '#F7DC6F'),
    ('storage', 'concern', '#BB8FCE')
ON CONFLICT (name) DO NOTHING;
