-- Additive migration: preserve existing accounts, billing, and optimization rows.
CREATE SCHEMA IF NOT EXISTS prompt_iq;
REVOKE ALL ON SCHEMA prompt_iq FROM PUBLIC;

CREATE TABLE IF NOT EXISTS prompt_iq.schema_migrations (
  version text PRIMARY KEY,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prompt_iq.capture_preferences (
  user_id integer PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  save_drafts boolean NOT NULL DEFAULT false,
  save_searches boolean NOT NULL DEFAULT false,
  disclosure_version text NOT NULL DEFAULT '2026-09-13-v2',
  accepted_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE prompt_iq.capture_preferences ADD COLUMN IF NOT EXISTS accepted_at timestamptz;
ALTER TABLE prompt_iq.capture_preferences ALTER COLUMN disclosure_version SET DEFAULT '2026-09-13-v2';

CREATE TABLE IF NOT EXISTS prompt_iq.drafts (
  user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  prompt_text text NOT NULL CHECK (char_length(prompt_text) BETWEEN 1 AND 6000),
  platform text NOT NULL CHECK (platform IN ('chatgpt','claude','gemini','perplexity','copilot','deepseek','general')),
  source text NOT NULL DEFAULT 'extension_composer' CHECK (source = 'extension_composer'),
  mode text NOT NULL CHECK (mode IN ('standard','concise','detailed','creative','technical')),
  client_revision integer NOT NULL CHECK (client_revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_id)
);

CREATE TABLE IF NOT EXISTS prompt_iq.searches (
  user_id integer NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  client_id uuid NOT NULL,
  query_text text NOT NULL CHECK (char_length(query_text) BETWEEN 1 AND 500),
  source text NOT NULL DEFAULT 'prompt_library' CHECK (source = 'prompt_library'),
  category text NOT NULL DEFAULT 'all' CHECK (char_length(category) BETWEEN 1 AND 100),
  result_count integer NOT NULL CHECK (result_count BETWEEN 0 AND 10000),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, client_id)
);

CREATE INDEX IF NOT EXISTS drafts_user_updated ON prompt_iq.drafts(user_id, updated_at DESC, client_id);
CREATE INDEX IF NOT EXISTS drafts_retention ON prompt_iq.drafts(updated_at);
CREATE INDEX IF NOT EXISTS searches_user_created ON prompt_iq.searches(user_id, created_at DESC, client_id);
CREATE INDEX IF NOT EXISTS searches_retention ON prompt_iq.searches(created_at);

-- Existing clients continue using prompt_history. The namespaced view avoids a second text copy.
ALTER TABLE public.prompt_history ADD COLUMN IF NOT EXISTS client_event_id uuid;
ALTER TABLE public.prompt_history ADD COLUMN IF NOT EXISTS engine text;
ALTER TABLE public.prompt_history ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'extension_optimizer';
CREATE UNIQUE INDEX IF NOT EXISTS prompt_history_user_event
  ON public.prompt_history(user_id, client_event_id) WHERE client_event_id IS NOT NULL;

CREATE OR REPLACE VIEW prompt_iq.optimizations WITH (security_invoker = true) AS
SELECT id, user_id, client_event_id, original AS original_prompt,
       optimized AS optimized_prompt, platform, source, engine, intent, mode,
       score_original, score_optimized, score_delta, feedback, created_at
FROM public.prompt_history;

-- API queries also bind the authenticated user explicitly. RLS supports a future non-owner runtime role.
ALTER TABLE prompt_iq.capture_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_iq.drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE prompt_iq.searches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS owner_only ON prompt_iq.capture_preferences;
CREATE POLICY owner_only ON prompt_iq.capture_preferences
  USING (user_id = nullif(current_setting('app.user_id', true), '')::integer)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::integer);
DROP POLICY IF EXISTS owner_only ON prompt_iq.drafts;
CREATE POLICY owner_only ON prompt_iq.drafts
  USING (user_id = nullif(current_setting('app.user_id', true), '')::integer)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::integer);
DROP POLICY IF EXISTS owner_only ON prompt_iq.searches;
CREATE POLICY owner_only ON prompt_iq.searches
  USING (user_id = nullif(current_setting('app.user_id', true), '')::integer)
  WITH CHECK (user_id = nullif(current_setting('app.user_id', true), '')::integer);

REVOKE ALL ON ALL TABLES IN SCHEMA prompt_iq FROM PUBLIC;
INSERT INTO prompt_iq.schema_migrations(version)
VALUES ('20260913_structured_activity_v2') ON CONFLICT DO NOTHING;
