ALTER TABLE prompt_iq.capture_preferences
  ALTER COLUMN disclosure_version SET DEFAULT '2026-11-19-v3';

ALTER TABLE prompt_iq.drafts
  DROP CONSTRAINT IF EXISTS drafts_platform_check;

ALTER TABLE prompt_iq.drafts
  ADD CONSTRAINT drafts_platform_check CHECK (
    platform IN (
      'chatgpt', 'claude', 'gemini', 'perplexity', 'copilot', 'deepseek',
      'grok', 'mistral', 'meta', 'poe', 'you', 'general'
    )
  );

-- Existing consent rows intentionally keep their previous version. The client
-- asks those users to review the current disclosure before capture resumes.
