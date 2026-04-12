-- 数据库迁移脚本：添加 version_type 字段
-- 执行时间：2026-04-10
-- 说明：为版本历史表添加版本类型字段，支持固定版本和日期版本双类型管理

-- 添加 version_type 字段（如果不存在）
-- 注意：SQLite 不支持 ADD COLUMN IF NOT EXISTS，需要检查
ALTER TABLE version_history ADD COLUMN version_type TEXT NOT NULL DEFAULT 'auto';

-- 为 version_type 创建索引以加速查询
CREATE INDEX IF NOT EXISTS idx_version_history_type ON version_history(version_type);
CREATE INDEX IF NOT EXISTS idx_version_history_key_type ON version_history(data_key, version_type);
