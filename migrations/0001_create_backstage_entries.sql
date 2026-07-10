CREATE TABLE backstage_entries (
  id INTEGER PRIMARY KEY,
  type TEXT NOT NULL CHECK (type IN ('reference', 'feedback')),
  url TEXT NOT NULL,
  text TEXT NOT NULL,
  submitted_at TEXT NOT NULL
);
