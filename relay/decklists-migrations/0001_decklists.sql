CREATE TABLE decklists (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  user TEXT NOT NULL,
  side TEXT NOT NULL,
  faction TEXT NOT NULL,
  identity TEXT NOT NULL,
  created TEXT NOT NULL,
  updated TEXT NOT NULL,
  cards TEXT NOT NULL
);

CREATE INDEX decklists_side ON decklists (side, created DESC);
CREATE INDEX decklists_side_faction ON decklists (side, faction, created DESC);

CREATE TABLE deck_formats (
  format TEXT NOT NULL,
  id TEXT NOT NULL,
  side TEXT NOT NULL,
  faction TEXT NOT NULL,
  created TEXT NOT NULL,
  PRIMARY KEY (format, id)
);

CREATE INDEX deck_formats_side ON deck_formats (format, side, created DESC);
CREATE INDEX deck_formats_side_faction ON deck_formats (format, side, faction, created DESC);
CREATE INDEX deck_formats_id ON deck_formats (id);

CREATE TABLE index_meta (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);
