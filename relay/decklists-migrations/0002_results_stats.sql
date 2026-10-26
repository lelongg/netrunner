CREATE TABLE tournaments (
  id INTEGER PRIMARY KEY,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  format TEXT NOT NULL,
  players INTEGER NOT NULL,
  top INTEGER NOT NULL
);

CREATE TABLE results (
  tournament INTEGER NOT NULL,
  side TEXT NOT NULL,
  player TEXT NOT NULL,
  identity TEXT NOT NULL,
  swiss INTEGER,
  cut INTEGER,
  place INTEGER NOT NULL,
  legacy INTEGER,
  deck TEXT,
  PRIMARY KEY (tournament, side, player)
);

CREATE INDEX results_deck ON results (deck);
CREATE INDEX results_identity ON results (identity, place);
CREATE INDEX results_legacy ON results (legacy) WHERE deck IS NULL;

CREATE TABLE legacy_ids (
  num INTEGER PRIMARY KEY,
  uuid TEXT
);

CREATE TABLE stats (
  k TEXT PRIMARY KEY,
  v TEXT NOT NULL
);

CREATE VIRTUAL TABLE deck_search USING fts5(id UNINDEXED, words, cards, tokenize = 'unicode61 remove_diacritics 2');
