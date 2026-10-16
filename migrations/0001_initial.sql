PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  clerk_id TEXT UNIQUE,
  username TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  bio TEXT,
  avatar_url TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','banned')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX users_status_idx ON users(status);

CREATE TABLE titles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('movie','series')),
  name TEXT NOT NULL,
  alt_names_json TEXT NOT NULL DEFAULT '[]',
  year INTEGER NOT NULL,
  genres_json TEXT NOT NULL DEFAULT '[]',
  synopsis TEXT NOT NULL DEFAULT '',
  runtime TEXT,
  country TEXT,
  language TEXT,
  trailer_url TEXT,
  poster_url TEXT,
  hue INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published','unpublished','archived')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX titles_kind_status_idx ON titles(kind,status);
CREATE INDEX titles_year_idx ON titles(year DESC);

CREATE TABLE people (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE title_people (
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  person_id TEXT NOT NULL REFERENCES people(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('director','creator','writer','cast')),
  character_name TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (title_id, person_id, role)
);
CREATE INDEX title_people_person_idx ON title_people(person_id);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('lesson','quote','moment','trailer_thought')),
  body TEXT NOT NULL,
  quote_character TEXT,
  quote_note TEXT,
  spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0,1)),
  season INTEGER,
  episode INTEGER,
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX posts_feed_idx ON posts(removed, created_at DESC);
CREATE INDEX posts_title_idx ON posts(title_id, created_at DESC);
CREATE INDEX posts_user_idx ON posts(user_id, created_at DESC);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  heading TEXT,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0,1)),
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT,
  UNIQUE (title_id, user_id)
);
CREATE INDEX reviews_feed_idx ON reviews(removed, created_at DESC);
CREATE INDEX reviews_title_idx ON reviews(title_id, created_at DESC);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  details TEXT,
  spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0,1)),
  season INTEGER,
  episode INTEGER,
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX questions_feed_idx ON questions(removed, created_at DESC);
CREATE INDEX questions_title_idx ON questions(title_id, created_at DESC);

CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0,1)),
  helpful INTEGER NOT NULL DEFAULT 0 CHECK (helpful IN (0,1)),
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT
);
CREATE INDEX answers_question_idx ON answers(question_id, helpful DESC, created_at ASC);

CREATE TABLE replies (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','review','question','answer','reply')),
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0,1)),
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0,1)),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX replies_target_idx ON replies(target_type, target_id, created_at ASC);

CREATE TABLE likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','review','question','answer','reply')),
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, target_type, target_id)
);
CREATE INDEX likes_target_idx ON likes(target_type, target_id);

CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  visibility TEXT NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE collection_titles (
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  added_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (collection_id, title_id)
);
CREATE INDEX collection_titles_order_idx ON collection_titles(collection_id, sort_order);
CREATE TABLE saved_collections (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, collection_id)
);

CREATE TABLE library_entries (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('watched','want')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (user_id, title_id)
);
CREATE INDEX library_user_state_idx ON library_entries(user_id, state, updated_at DESC);

CREATE TABLE reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('post','review','question','answer','reply')),
  target_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open','resolved')),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  resolved_at TEXT,
  resolved_by TEXT REFERENCES users(id) ON DELETE SET NULL
);
CREATE INDEX reports_status_idx ON reports(status, created_at DESC);

CREATE TABLE moderation_actions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX moderation_target_idx ON moderation_actions(target_type, target_id, created_at DESC);

CREATE TABLE slug_redirects (
  old_slug TEXT PRIMARY KEY,
  new_slug TEXT NOT NULL REFERENCES titles(slug) ON UPDATE CASCADE,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX sessions_user_idx ON sessions(user_id);
CREATE INDEX sessions_expiry_idx ON sessions(expires_at);

CREATE TABLE schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
INSERT INTO schema_meta (key, value) VALUES ('schema_version', '1');

CREATE TRIGGER users_updated_at AFTER UPDATE OF display_name, bio, avatar_url, role, status ON users BEGIN UPDATE users SET updated_at = datetime('now') WHERE id = NEW.id; END;
CREATE TRIGGER titles_updated_at AFTER UPDATE OF name, synopsis, status, poster_url, trailer_url ON titles BEGIN UPDATE titles SET updated_at = datetime('now') WHERE id = NEW.id; END;
CREATE TRIGGER collections_updated_at AFTER UPDATE OF name, description, visibility ON collections BEGIN UPDATE collections SET updated_at = datetime('now') WHERE id = NEW.id; END;
CREATE TRIGGER reviews_updated_at AFTER UPDATE OF heading, body, spoiler ON reviews BEGIN UPDATE reviews SET updated_at = datetime('now') WHERE id = NEW.id; END;
CREATE TRIGGER questions_updated_at AFTER UPDATE OF text, details, spoiler, season, episode ON questions BEGIN UPDATE questions SET updated_at = datetime('now') WHERE id = NEW.id; END;
CREATE TRIGGER answers_updated_at AFTER UPDATE OF body, spoiler, helpful ON answers BEGIN UPDATE answers SET updated_at = datetime('now') WHERE id = NEW.id; END;

-- Cursor pagination for an infinite community feed:
-- SELECT p.* FROM posts p JOIN titles t ON t.id = p.title_id
-- WHERE p.removed = 0 AND t.status = 'published'
--   AND (p.created_at < ? OR (p.created_at = ? AND p.id < ?))
-- ORDER BY p.created_at DESC, p.id DESC LIMIT ?;

-- Cleanup expired sessions periodically with a scheduled Worker:
-- DELETE FROM sessions WHERE expires_at <= datetime('now');

-- D1 deployment:
-- npx wrangler d1 migrations apply inktella-db --remote
-- npx wrangler d1 execute inktella-db --remote --file=./migrations/0001_initial.sql
