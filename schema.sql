CREATE TABLE IF NOT EXISTS dialect_terms (
    id TEXT PRIMARY KEY,
    term TEXT NOT NULL,
    meaning TEXT NOT NULL,
    dialect TEXT NOT NULL,
    category TEXT NOT NULL,
    response TEXT NOT NULL,
    understanding TEXT NOT NULL,
    timestamp TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_dialect ON dialect_terms(dialect);
CREATE INDEX IF NOT EXISTS idx_understanding ON dialect_terms(understanding);