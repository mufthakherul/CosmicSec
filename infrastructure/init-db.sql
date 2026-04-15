-- Initialize CosmicSec database
-- PostgreSQL initialization script

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create schema
CREATE SCHEMA IF NOT EXISTS cosmicsec;

-- Users table
CREATE TABLE IF NOT EXISTS cosmicsec.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) DEFAULT 'user',
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP
);

-- Organizations table (for multi-tenancy)
CREATE TABLE IF NOT EXISTS cosmicsec.organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE,
    plan VARCHAR(50) DEFAULT 'free',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    settings JSONB DEFAULT '{}'::jsonb
);

-- User-organization membership
CREATE TABLE IF NOT EXISTS cosmicsec.organization_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES cosmicsec.users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES cosmicsec.organizations(id) ON DELETE CASCADE,
    role VARCHAR(50) DEFAULT 'member',
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, organization_id)
);

-- Scans table
CREATE TABLE IF NOT EXISTS cosmicsec.scans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES cosmicsec.users(id),
    organization_id UUID REFERENCES cosmicsec.organizations(id),
    target VARCHAR(500) NOT NULL,
    scan_types JSONB,
    status VARCHAR(50) DEFAULT 'pending',
    progress INTEGER DEFAULT 0,
    findings_count INTEGER DEFAULT 0,
    severity_breakdown JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    config JSONB DEFAULT '{}'::jsonb
);

-- Findings table
CREATE TABLE IF NOT EXISTS cosmicsec.findings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    scan_id UUID REFERENCES cosmicsec.scans(id) ON DELETE CASCADE,
    title VARCHAR(500) NOT NULL,
    description TEXT,
    severity VARCHAR(50),
    cvss_score DECIMAL(3,1),
    category VARCHAR(100),
    recommendation TEXT,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- API keys table
CREATE TABLE IF NOT EXISTS cosmicsec.api_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES cosmicsec.users(id) ON DELETE CASCADE,
    key_hash VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    last_used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP
);

-- Audit logs table
CREATE TABLE IF NOT EXISTS cosmicsec.audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES cosmicsec.users(id),
    organization_id UUID REFERENCES cosmicsec.organizations(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100),
    resource_id UUID,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON cosmicsec.users(email);
CREATE INDEX idx_scans_user_id ON cosmicsec.scans(user_id);
CREATE INDEX idx_scans_status ON cosmicsec.scans(status);
CREATE INDEX idx_scans_created_at ON cosmicsec.scans(created_at DESC);
CREATE INDEX idx_findings_scan_id ON cosmicsec.findings(scan_id);
CREATE INDEX idx_findings_severity ON cosmicsec.findings(severity);
CREATE INDEX idx_audit_logs_user_id ON cosmicsec.audit_logs(user_id);
CREATE INDEX idx_audit_logs_created_at ON cosmicsec.audit_logs(created_at DESC);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION cosmicsec.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to users table
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON cosmicsec.users
    FOR EACH ROW EXECUTE FUNCTION cosmicsec.update_updated_at_column();

-- Admin user created on first boot via COSMICSEC_ADMIN_EMAIL env var

-- Insert default organization
INSERT INTO cosmicsec.organizations (name, subdomain, plan)
VALUES (
    'CosmicSec Default',
    'default',
    'enterprise'
) ON CONFLICT (subdomain) DO NOTHING;

-- Grant permissions
GRANT ALL PRIVILEGES ON SCHEMA cosmicsec TO cosmicsec;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA cosmicsec TO cosmicsec;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA cosmicsec TO cosmicsec;
