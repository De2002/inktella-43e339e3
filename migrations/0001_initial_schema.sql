-- Inktella: complete initial schema for an empty Cloudflare D1 database.
-- Every table and column below is read or written by src/lib/cloudflare.ts,
-- src/lib/d1.ts or src/server.ts. JSON arrays are stored as TEXT.
-- Clerk owns sign-in; users.clerk_id only links a Clerk account to its profile.

PRAGMA foreign_keys = ON;

-- Whole-app snapshot. writeState() runs UPDATE ... WHERE id = 1, so the row must exist.
CREATE TABLE app_state (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  version INTEGER NOT NULL DEFAULT 1,
  payload TEXT NOT NULL DEFAULT '{}',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO app_state (id, version, payload) VALUES (1, 1, '{}');

CREATE TABLE users (
  id TEXT PRIMARY KEY,
  clerk_id TEXT UNIQUE,
  username TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'banned')),
  is_pro INTEGER NOT NULL DEFAULT 0 CHECK (is_pro IN (0, 1)),
  bio TEXT,
  avatar_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE titles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('movie', 'series')),
  name TEXT NOT NULL,
  alt_names TEXT NOT NULL DEFAULT '[]',
  year INTEGER NOT NULL,
  genres TEXT NOT NULL DEFAULT '[]',
  synopsis TEXT NOT NULL DEFAULT '',
  runtime TEXT,
  country TEXT,
  language TEXT,
  trailer_url TEXT,
  people TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'unpublished', 'archived')),
  hue INTEGER NOT NULL DEFAULT 0,
  poster_key TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_titles_status_kind_year ON titles (status, kind, year DESC);

CREATE TABLE posts (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('lesson', 'quote', 'moment', 'trailer_thought', 'director_note')),
  body TEXT NOT NULL,
  quote_character TEXT,
  quote_note TEXT,
  spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0, 1)),
  season INTEGER,
  episode INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0, 1))
);
CREATE INDEX idx_posts_title ON posts (title_id, removed, created_at DESC);
CREATE INDEX idx_posts_user ON posts (user_id, created_at DESC);

CREATE TABLE reviews (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  heading TEXT,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0, 1))
);
-- One live review per person per title (removed reviews don't block a new one).
CREATE UNIQUE INDEX uq_reviews_user_title ON reviews (user_id, title_id) WHERE removed = 0;
CREATE INDEX idx_reviews_title ON reviews (title_id, removed, created_at DESC);

CREATE TABLE questions (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  details TEXT,
  spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0, 1)),
  season INTEGER,
  episode INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0, 1))
);
CREATE INDEX idx_questions_title ON questions (title_id, removed, created_at DESC);
CREATE INDEX idx_questions_user ON questions (user_id);

CREATE TABLE answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions (id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0, 1)),
  helpful INTEGER NOT NULL DEFAULT 0 CHECK (helpful IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0, 1))
);
CREATE INDEX idx_answers_question ON answers (question_id, removed, created_at);
CREATE INDEX idx_answers_user ON answers (user_id);

-- Replies and likes point at several content types, so target_id has no FK.
CREATE TABLE replies (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'review', 'answer')),
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0 CHECK (spoiler IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed INTEGER NOT NULL DEFAULT 0 CHECK (removed IN (0, 1))
);
CREATE INDEX idx_replies_target ON replies (target_type, target_id, created_at);

CREATE TABLE likes (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'review', 'question', 'answer', 'reply')),
  target_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, target_type, target_id)
);
CREATE INDEX idx_likes_target ON likes (target_type, target_id);

CREATE TABLE collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  title_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_collections_user ON collections (user_id);
CREATE INDEX idx_collections_updated ON collections (updated_at DESC);

CREATE TABLE saved_collections (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections (id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, collection_id)
);
CREATE INDEX idx_saved_collections_collection ON saved_collections (collection_id);

CREATE TABLE library (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title_id TEXT NOT NULL REFERENCES titles (id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('watched', 'want')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, title_id)
);
CREATE INDEX idx_library_title ON library (title_id, state);

-- Recometer: one Yes/No per person per title, changeable via upsert.
CREATE TABLE recommendations (
  user_id TEXT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title_id TEXT NOT NULL REFERENCES titles (id) ON DELETE CASCADE,
  value TEXT NOT NULL CHECK (value IN ('yes', 'no')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, title_id)
);
CREATE INDEX idx_recommendations_title ON recommendations (title_id, value);

-- Discovery tags + Intent Links.
CREATE TABLE discovery_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  aliases TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE title_discovery_tags (
  title_id TEXT NOT NULL REFERENCES titles (id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES discovery_tags (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (title_id, tag_id)
);
CREATE INDEX idx_title_discovery_tags_tag ON title_discovery_tags (tag_id);

CREATE TABLE intent_links (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles (id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES discovery_tags (id) ON DELETE CASCADE,
  selected_phrase TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  blurb_version TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'suggested' CHECK (approval_status IN ('suggested', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CHECK (end_offset >= start_offset)
);
CREATE INDEX idx_intent_links_title ON intent_links (title_id, approval_status);
CREATE INDEX idx_intent_links_tag ON intent_links (tag_id);
