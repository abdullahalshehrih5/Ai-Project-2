-- schema.sql
-- جدول المحادثات
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_msg TEXT NOT NULL,
    ai_reply TEXT NOT NULL,
    ai_provider TEXT NOT NULL DEFAULT 'openai',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- جدول مصطلحات اللهجات
CREATE TABLE IF NOT EXISTS dialect_terms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    term TEXT NOT NULL,
    meaning TEXT NOT NULL,
    dialect TEXT NOT NULL,
    understanding TEXT NOT NULL,
    response TEXT,
    ai_provider TEXT DEFAULT 'openai',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- إنشاء فهارس للبحث السريع
CREATE INDEX IF NOT EXISTS idx_dialect_terms_dialect ON dialect_terms(dialect);
CREATE INDEX IF NOT EXISTS idx_dialect_terms_understanding ON dialect_terms(understanding);
CREATE INDEX IF NOT EXISTS idx_messages_provider ON messages(ai_provider);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at);
