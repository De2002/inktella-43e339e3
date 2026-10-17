PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  clerk_id TEXT UNIQUE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  is_pro INTEGER NOT NULL DEFAULT 0,
  bio TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS users_clerk_id_idx ON users(clerk_id);
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT,
  r2_key TEXT NOT NULL UNIQUE,
  content_type TEXT NOT NULL,
  byte_size INTEGER NOT NULL,
  original_name TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS media_owner_idx ON media(owner_user_id);

-- The application snapshot keeps the existing store contract intact while the
-- normalized account/media tables provide durable identity and asset metadata.
-- Follow-up migrations can split individual content collections without a UI rewrite.
INSERT OR IGNORE INTO app_state (id, version, payload) VALUES (1, 1, '{"version":1,"users":[],"titles":[],"discoveryTags":[],"titleDiscoveryTags":[],"intentLinks":[],"posts":[],"reviews":[],"questions":[],"answers":[],"replies":[],"likes":[],"collections":[],"savedCollections":[],"library":[],"recommendations":[],"reports":[],"modActions":[],"slugRedirects":{},"sessionUserId":null}');
