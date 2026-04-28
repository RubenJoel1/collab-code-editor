CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS rooms (
  room_id    VARCHAR(100) PRIMARY KEY,
  created_at TIMESTAMPTZ  DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  doc_id     UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id    VARCHAR(100) NOT NULL REFERENCES rooms(room_id) ON DELETE CASCADE,
  content    TEXT         NOT NULL DEFAULT '',
  language   VARCHAR(50)  NOT NULL DEFAULT 'javascript',
  updated_at TIMESTAMPTZ  DEFAULT NOW(),
  UNIQUE (room_id)
);

CREATE TABLE IF NOT EXISTS versions (
  version_id UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  doc_id     UUID        NOT NULL REFERENCES documents(doc_id) ON DELETE CASCADE,
  snapshot   TEXT        NOT NULL,
  language   VARCHAR(50) NOT NULL DEFAULT 'javascript',
  saved_by   VARCHAR(50),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
