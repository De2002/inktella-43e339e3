PRAGMA foreign_keys = ON;

-- Sitewide relational tables. app_state remains the canonical JSON snapshot used by
-- the existing UI; these tables provide durable, queryable D1 records and Clerk identity links.

CREATE TABLE IF NOT EXISTS titles (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL CHECK (kind IN ('movie', 'series')),
  name TEXT NOT NULL,
  alt_names TEXT NOT NULL DEFAULT '[]',
  year INTEGER NOT NULL,
  genres TEXT NOT NULL DEFAULT '[]',
  synopsis TEXT NOT NULL,
  runtime TEXT,
  country TEXT,
  language TEXT,
  trailer_url TEXT,
  people TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'unpublished', 'archived')),
  hue REAL NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS titles_status_idx ON titles(status);
CREATE INDEX IF NOT EXISTS titles_name_idx ON titles(name);

CREATE TABLE IF NOT EXISTS discovery_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  aliases TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS title_discovery_tags (
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES discovery_tags(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (title_id, tag_id)
);
CREATE TABLE IF NOT EXISTS intent_links (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  tag_id TEXT NOT NULL REFERENCES discovery_tags(id) ON DELETE CASCADE,
  selected_phrase TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  blurb_version TEXT NOT NULL,
  approval_status TEXT NOT NULL CHECK (approval_status IN ('suggested', 'approved', 'rejected')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  category TEXT NOT NULL CHECK (category IN ('lesson', 'quote', 'moment', 'trailer_thought')),
  body TEXT NOT NULL,
  quote_character TEXT,
  quote_note TEXT,
  spoiler INTEGER NOT NULL DEFAULT 0,
  season INTEGER,
  episode INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  heading TEXT,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  details TEXT,
  spoiler INTEGER NOT NULL DEFAULT 0,
  season INTEGER,
  episode INTEGER,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0,
  helpful INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS replies (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'review', 'answer')),
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  removed INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'review', 'question', 'answer', 'reply')),
  target_id TEXT NOT NULL,
  PRIMARY KEY (user_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  title_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS saved_collections (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  PRIMARY KEY (user_id, collection_id)
);
CREATE TABLE IF NOT EXISTS library (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  state TEXT NOT NULL CHECK (state IN ('watched', 'want')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, title_id)
);
CREATE TABLE IF NOT EXISTS recommendations (
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title_id TEXT NOT NULL REFERENCES titles(id) ON DELETE CASCADE,
  value TEXT NOT NULL CHECK (value IN ('yes', 'no')),
  updated_at TEXT NOT NULL,
  PRIMARY KEY (user_id, title_id)
);
CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('open', 'resolved')),
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS mod_actions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS slug_redirects (
  slug TEXT PRIMARY KEY,
  target_slug TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS posts_user_idx ON posts(user_id);
CREATE INDEX IF NOT EXISTS posts_title_idx ON posts(title_id);
CREATE INDEX IF NOT EXISTS reviews_user_idx ON reviews(user_id);
CREATE INDEX IF NOT EXISTS reviews_title_idx ON reviews(title_id);
CREATE INDEX IF NOT EXISTS questions_user_idx ON questions(user_id);
CREATE INDEX IF NOT EXISTS questions_title_idx ON questions(title_id);
CREATE INDEX IF NOT EXISTS answers_question_idx ON answers(question_id);
CREATE INDEX IF NOT EXISTS collections_user_idx ON collections(user_id);
CREATE INDEX IF NOT EXISTS library_title_idx ON library(title_id);
CREATE INDEX IF NOT EXISTS reports_status_idx ON reports(status);
