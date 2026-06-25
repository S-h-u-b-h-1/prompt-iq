-- Create survey_responses table
CREATE TABLE IF NOT EXISTS survey_responses (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  q1_reason TEXT,
  q2_tool VARCHAR(100),
  q3_frequency VARCHAR(100),
  q4_value TEXT,
  q5_profession VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create event_logs table
CREATE TABLE IF NOT EXISTS event_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255),
  event_type VARCHAR(100) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance queries
CREATE INDEX IF NOT EXISTS idx_survey_responses_user ON survey_responses(user_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_type ON event_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_event_logs_created ON event_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_event_logs_user_type ON event_logs(user_id, event_type);
