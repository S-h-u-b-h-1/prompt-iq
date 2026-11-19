ALTER TABLE prompt_iq.capture_preferences
  ALTER COLUMN disclosure_version SET DEFAULT '2026-11-19-v3';

-- Existing consent rows intentionally keep their previous version. The client
-- asks those users to review the current disclosure before capture resumes.
