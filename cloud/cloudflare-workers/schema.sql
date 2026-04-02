-- 公式数据存储表
CREATE TABLE IF NOT EXISTS formula_data (
  id TEXT PRIMARY KEY DEFAULT 'formula-data',
  data TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT (datetime('now')),
  version_id TEXT NOT NULL,
  comment TEXT DEFAULT ''
);

-- 版本历史表
CREATE TABLE IF NOT EXISTS version_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data_key TEXT NOT NULL,
  version_id TEXT NOT NULL,
  data TEXT NOT NULL,
  saved_at TEXT NOT NULL DEFAULT (datetime('now')),
  comment TEXT DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_version_history_key ON version_history(data_key);
CREATE INDEX IF NOT EXISTS idx_version_history_version ON version_history(version_id);
CREATE INDEX IF NOT EXISTS idx_version_history_saved_at ON version_history(saved_at);
