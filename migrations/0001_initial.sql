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
  hue INTEGER NOT NULL DEFAULT 200,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS titles_slug_idx ON titles(slug);
CREATE INDEX IF NOT EXISTS titles_kind_idx ON titles(kind);

CREATE TABLE IF NOT EXISTS discovery_tags (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  aliases TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS discovery_tags_slug_idx ON discovery_tags(slug);

CREATE TABLE IF NOT EXISTS title_discovery_tags (
  title_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (title_id, tag_id),
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES discovery_tags(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS title_discovery_tags_tag_idx ON title_discovery_tags(tag_id);

CREATE TABLE IF NOT EXISTS intent_links (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL,
  tag_id TEXT NOT NULL,
  selected_phrase TEXT NOT NULL,
  start_offset INTEGER NOT NULL,
  end_offset INTEGER NOT NULL,
  blurb_version TEXT NOT NULL DEFAULT 'seed',
  approval_status TEXT NOT NULL DEFAULT 'suggested' CHECK (approval_status IN ('suggested', 'approved', 'rejected')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES discovery_tags(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS intent_links_title_idx ON intent_links(title_id);

CREATE TABLE IF NOT EXISTS posts (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL CHECK (category IN ('lesson', 'quote', 'moment', 'trailer_thought', 'director_note')),
  body TEXT NOT NULL,
  quote_character TEXT,
  quote_note TEXT,
  spoiler INTEGER NOT NULL DEFAULT 0,
  season INTEGER,
  episode INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS posts_title_idx ON posts(title_id);
CREATE INDEX IF NOT EXISTS posts_user_idx ON posts(user_id);

CREATE TABLE IF NOT EXISTS reviews (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  heading TEXT,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS reviews_title_idx ON reviews(title_id);
CREATE INDEX IF NOT EXISTS reviews_user_idx ON reviews(user_id);

CREATE TABLE IF NOT EXISTS questions (
  id TEXT PRIMARY KEY,
  title_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  text TEXT NOT NULL,
  details TEXT,
  spoiler INTEGER NOT NULL DEFAULT 0,
  season INTEGER,
  episode INTEGER,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS questions_title_idx ON questions(title_id);
CREATE INDEX IF NOT EXISTS questions_user_idx ON questions(user_id);

CREATE TABLE IF NOT EXISTS answers (
  id TEXT PRIMARY KEY,
  question_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0,
  helpful INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT,
  removed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (question_id) REFERENCES questions(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS answers_question_idx ON answers(question_id);
CREATE INDEX IF NOT EXISTS answers_user_idx ON answers(user_id);

CREATE TABLE IF NOT EXISTS replies (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'review', 'answer')),
  target_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  body TEXT NOT NULL,
  spoiler INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  removed INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS replies_target_idx ON replies(target_type, target_id);
CREATE INDEX IF NOT EXISTS replies_user_idx ON replies(user_id);

CREATE TABLE IF NOT EXISTS likes (
  user_id TEXT NOT NULL,
  target_type TEXT NOT NULL CHECK (target_type IN ('post', 'review', 'question', 'answer', 'reply')),
  target_id TEXT NOT NULL,
  PRIMARY KEY (user_id, target_type, target_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS likes_target_idx ON likes(target_type, target_id);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  title_ids TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS collections_user_idx ON collections(user_id);
CREATE INDEX IF NOT EXISTS collections_slug_idx ON collections(slug);

CREATE TABLE IF NOT EXISTS saved_collections (
  user_id TEXT NOT NULL,
  collection_id TEXT NOT NULL,
  PRIMARY KEY (user_id, collection_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (collection_id) REFERENCES collections(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS library (
  user_id TEXT NOT NULL,
  title_id TEXT NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('watched', 'want')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, title_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS library_user_idx ON library(user_id);

CREATE TABLE IF NOT EXISTS recommendations (
  user_id TEXT NOT NULL,
  title_id TEXT NOT NULL,
  value TEXT NOT NULL CHECK (value IN ('yes', 'no')),
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, title_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS reports (
  id TEXT PRIMARY KEY,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  reporter_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'resolved')),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (reporter_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS mod_actions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  note TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS trail (
  user_id TEXT NOT NULL,
  title_id TEXT NOT NULL,
  visited_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, title_id, visited_at),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (title_id) REFERENCES titles(id) ON DELETE CASCADE
);

INSERT OR IGNORE INTO app_state (id, version, payload) VALUES (1, 1, '{"version":1,"users":[],"titles":[],"discoveryTags":[],"titleDiscoveryTags":[],"intentLinks":[],"posts":[],"reviews":[],"questions":[],"answers":[],"replies":[],"likes":[],"collections":[],"savedCollections":[],"library":[],"recommendations":[],"reports":[],"modActions":[],"slugRedirects":{},"sessionUserId":null}');
