-- One row per auditor submission. `body` holds the exact JSON bytes that were
-- stamped, so `body` + `ots` together are a verifiable OpenTimestamps pair.
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  body TEXT NOT NULL,
  ots TEXT,            -- hex-encoded .ots proof; NULL if no calendar answered
  anchor_status TEXT,  -- NULL | 'pending' | 'anchored'
  block_height INTEGER,
  created_at INTEGER NOT NULL,
  checked_at INTEGER   -- last upgrade attempt, so the cron rotates through pending rows
);

CREATE INDEX submissions_pending ON submissions (anchor_status, checked_at);
