CREATE TYPE plan_tier AS ENUM ('starter', 'pro', 'team', 'enterprise');
CREATE TYPE task_status AS ENUM ('todo', 'in_progress', 'done', 'blocked');

CREATE TABLE users (
  id UUID PRIMARY KEY,
  clerk_user_id VARCHAR(100) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE projects (
  id UUID PRIMARY KEY,
  owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  milestones JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE papers (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  doi VARCHAR(128),
  abstract TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  storage_key VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE paper_annotations (
  id UUID PRIMARY KEY,
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  highlighted_text TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE citations (
  id UUID PRIMARY KEY,
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  style VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  bibtex TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE research_tasks (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  details TEXT,
  status task_status NOT NULL DEFAULT 'todo',
  due_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE chat_messages (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL,
  content TEXT NOT NULL,
  sources JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE subscriptions (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  stripe_customer_id VARCHAR(128) NOT NULL,
  stripe_subscription_id VARCHAR(128) UNIQUE NOT NULL,
  plan_tier plan_tier NOT NULL DEFAULT 'starter',
  unit_price_usd NUMERIC(10,2) NOT NULL DEFAULT 20.00,
  seats INT NOT NULL DEFAULT 1,
  status VARCHAR(32) NOT NULL DEFAULT 'active',
  current_period_end TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  actor_user_id UUID,
  action VARCHAR(255) NOT NULL,
  entity_type VARCHAR(64) NOT NULL,
  entity_id UUID NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
