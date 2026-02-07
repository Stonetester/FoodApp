-- ============================================================================
-- Idempotent migration: fix friend_requests & friendships schema
-- Safe to run multiple times. Uses information_schema checks. No DROPs.
-- Run against the `foodapp` database:
--   mysql -u foodapp_user -p foodapp < migrate_friends_schema.sql
-- ============================================================================

-- Verify which database we're operating on
SELECT DATABASE() AS current_database;

-- ---- friend_requests table --------------------------------------------------

-- Add `id` primary key if missing
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'friend_requests' AND column_name = 'id');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE friend_requests ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST',
    'SELECT "friend_requests.id already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add `requester_id`
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'friend_requests' AND column_name = 'requester_id');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE friend_requests ADD COLUMN requester_id INT NOT NULL',
    'SELECT "friend_requests.requester_id already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add `recipient_id`
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'friend_requests' AND column_name = 'recipient_id');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE friend_requests ADD COLUMN recipient_id INT NOT NULL',
    'SELECT "friend_requests.recipient_id already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add `status`
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'friend_requests' AND column_name = 'status');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE friend_requests ADD COLUMN status VARCHAR(20) NOT NULL DEFAULT ''pending''',
    'SELECT "friend_requests.status already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add `created_at`
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'friend_requests' AND column_name = 'created_at');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE friend_requests ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
    'SELECT "friend_requests.created_at already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Indexes for friend_requests
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'friend_requests' AND index_name = 'ix_friend_requests_requester_id');
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE friend_requests ADD INDEX ix_friend_requests_requester_id (requester_id)',
    'SELECT "ix_friend_requests_requester_id already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'friend_requests' AND index_name = 'ix_friend_requests_recipient_id');
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE friend_requests ADD INDEX ix_friend_requests_recipient_id (recipient_id)',
    'SELECT "ix_friend_requests_recipient_id already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'friend_requests' AND index_name = 'ix_friend_requests_status');
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE friend_requests ADD INDEX ix_friend_requests_status (status)',
    'SELECT "ix_friend_requests_status already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'friend_requests' AND index_name = 'unique_friend_request');
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE friend_requests ADD CONSTRAINT unique_friend_request UNIQUE (requester_id, recipient_id)',
    'SELECT "unique_friend_request already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ---- friendships table ------------------------------------------------------

-- Add `id` primary key if missing
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'friendships' AND column_name = 'id');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE friendships ADD COLUMN id INT AUTO_INCREMENT PRIMARY KEY FIRST',
    'SELECT "friendships.id already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add `user_id`
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'friendships' AND column_name = 'user_id');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE friendships ADD COLUMN user_id INT NOT NULL',
    'SELECT "friendships.user_id already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add `friend_id`
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'friendships' AND column_name = 'friend_id');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE friendships ADD COLUMN friend_id INT NOT NULL',
    'SELECT "friendships.friend_id already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Add `created_at`
SET @col_exists = (SELECT COUNT(*) FROM information_schema.columns
    WHERE table_schema = DATABASE() AND table_name = 'friendships' AND column_name = 'created_at');
SET @sql = IF(@col_exists = 0,
    'ALTER TABLE friendships ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP',
    'SELECT "friendships.created_at already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- Indexes for friendships
SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'friendships' AND index_name = 'ix_friendships_user_id');
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE friendships ADD INDEX ix_friendships_user_id (user_id)',
    'SELECT "ix_friendships_user_id already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'friendships' AND index_name = 'ix_friendships_friend_id');
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE friendships ADD INDEX ix_friendships_friend_id (friend_id)',
    'SELECT "ix_friendships_friend_id already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @idx_exists = (SELECT COUNT(*) FROM information_schema.statistics
    WHERE table_schema = DATABASE() AND table_name = 'friendships' AND index_name = 'unique_friendship');
SET @sql = IF(@idx_exists = 0,
    'ALTER TABLE friendships ADD CONSTRAINT unique_friendship UNIQUE (user_id, friend_id)',
    'SELECT "unique_friendship already exists" AS info');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;


-- ---- Verification -----------------------------------------------------------
SELECT 'friend_requests columns:' AS label;
SELECT column_name, column_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'friend_requests'
 ORDER BY ordinal_position;

SELECT 'friendships columns:' AS label;
SELECT column_name, column_type, is_nullable, column_default
  FROM information_schema.columns
 WHERE table_schema = DATABASE() AND table_name = 'friendships'
 ORDER BY ordinal_position;

SELECT 'Row counts:' AS label;
SELECT 'friend_requests' AS tbl, COUNT(*) AS cnt FROM friend_requests
UNION ALL
SELECT 'friendships', COUNT(*) FROM friendships;
