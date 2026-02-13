-- ==========================================
-- Supabase Migration: localStorage → DB
-- 아래 SQL을 Supabase Dashboard > SQL Editor 에서 실행하세요.
-- https://supabase.com/dashboard/project/hzfxvcqfqeeovcgoqsbu/sql/new
-- ==========================================

-- 1. conversations 테이블
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL DEFAULT '새 대화',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. messages 테이블
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  tool_calls JSONB,
  images JSONB
);

CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);

-- 3. mcp_servers 테이블
CREATE TABLE IF NOT EXISTS mcp_servers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  transport_type TEXT NOT NULL,
  url TEXT,
  headers JSONB,
  command TEXT,
  args JSONB,
  env JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 권한 부여 (anon / authenticated 역할 허용)
GRANT SELECT, INSERT, UPDATE, DELETE ON conversations TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON messages TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON mcp_servers TO anon, authenticated;

-- ==========================================
-- 목업 데이터 (Mock Data)
-- ==========================================

-- 대화 1: Supabase 질문
INSERT INTO conversations (id, title, created_at, updated_at) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Supabase 사용법 질문', '2026-02-13T09:00:00Z', '2026-02-13T09:05:00Z');

INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'user',
   'Supabase가 뭐야?', '2026-02-13T09:00:00Z'),
  ('aaaa2222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'assistant',
   'Supabase는 오픈소스 Firebase 대안으로, PostgreSQL 데이터베이스, 인증, 실시간 구독, 스토리지, Edge Functions 등을 제공하는 백엔드 서비스 플랫폼입니다.',
   '2026-02-13T09:00:30Z'),
  ('aaaa3333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'user',
   'Next.js에서 어떻게 연결해?', '2026-02-13T09:03:00Z'),
  ('aaaa4444-4444-4444-4444-444444444444', '11111111-1111-1111-1111-111111111111', 'assistant',
   '@supabase/supabase-js 패키지를 설치하고, createClient()로 클라이언트를 초기화하면 됩니다. 환경변수로 SUPABASE_URL과 SUPABASE_ANON_KEY를 설정하세요.',
   '2026-02-13T09:03:30Z');

-- 대화 2: MCP 프로토콜
INSERT INTO conversations (id, title, created_at, updated_at) VALUES
  ('22222222-2222-2222-2222-222222222222', 'MCP 프로토콜 설명', '2026-02-13T10:00:00Z', '2026-02-13T10:02:00Z');

INSERT INTO messages (id, conversation_id, role, content, created_at) VALUES
  ('bbbb1111-1111-1111-1111-111111111111', '22222222-2222-2222-2222-222222222222', 'user',
   'MCP 프로토콜이 뭐야?', '2026-02-13T10:00:00Z'),
  ('bbbb2222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222', 'assistant',
   'MCP(Model Context Protocol)는 AI 모델이 외부 도구와 데이터 소스에 접근할 수 있게 해주는 표준 프로토콜입니다. AI가 코드 실행, 파일 읽기, API 호출 등 다양한 작업을 수행할 수 있게 도와줍니다.',
   '2026-02-13T10:00:45Z');

-- 대화 3: 빈 대화
INSERT INTO conversations (id, title, created_at, updated_at) VALUES
  ('33333333-3333-3333-3333-333333333333', '새 대화', '2026-02-13T11:00:00Z', '2026-02-13T11:00:00Z');

-- MCP 서버 샘플 1: HTTP 방식
INSERT INTO mcp_servers (id, name, enabled, transport_type, url, created_at, updated_at) VALUES
  ('cccc1111-1111-1111-1111-111111111111', 'Context7 Docs', true, 'streamable-http',
   'https://mcp.context7.com/mcp', '2026-02-13T08:00:00Z', '2026-02-13T08:00:00Z');

-- MCP 서버 샘플 2: stdio 방식
INSERT INTO mcp_servers (id, name, enabled, transport_type, command, args, created_at, updated_at) VALUES
  ('cccc2222-2222-2222-2222-222222222222', 'Local Dev Server', false, 'stdio',
   'npx', '["@example/mcp-server"]'::jsonb, '2026-02-13T08:30:00Z', '2026-02-13T08:30:00Z');
