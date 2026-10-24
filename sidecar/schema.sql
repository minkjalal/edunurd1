-- Connection: sidecar/schema.sql documents the data contract used by the runtime flow in CODEBASE_GUIDE.md.
-- Function: Documents the relational shape for sidecar channels, messages, and presence data.
-- =============================================================================
-- EduNerd / Community Zone - Additive Chat Database Schema
-- =============================================================================
-- CRITICAL CONSTRAINT COMPLIANCE:
-- This schema is 100% additive. It creates new isolated tables and indexes.
-- It DOES NOT modify, alter, drop, or add columns to any existing tables.
-- Compatible with PostgreSQL, MySQL 8+, SQLite, and Cloud SQL.
-- =============================================================================

-- 1. CHAT CHANNELS TABLE
-- Stores text discussion channels within the Community Zone (e.g., #general, #doubts)
CREATE TABLE IF NOT EXISTS chat_channels (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(64) NOT NULL UNIQUE,
    topic VARCHAR(255) DEFAULT '',
    icon VARCHAR(16) DEFAULT '💬',
    position INT DEFAULT 0,
    is_private BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default community channels (Idempotent)
INSERT INTO chat_channels (id, name, topic, icon, position)
VALUES 
    ('chan_general', 'general', 'General discussions, greetings and study banter', '💬', 1),
    ('chan_doubts', 'doubts-and-questions', 'Post your physics, math, and bio doubts here', '❓', 2),
    ('chan_study', 'study-lounge', 'Silent co-studying and pomodoro accountability', '☕', 3),
    ('chan_resources', 'resources-and-notes', 'Share notes, formula sheets, and PDF links', '📚', 4),
    ('chan_exams', 'exam-prep-pyq', 'Target JEE, NEET, UPSC, SSC and board exams', '🏆', 5)
ON CONFLICT (id) DO NOTHING;

-- 2. CHAT MESSAGES TABLE
-- Stores persistent real-time chat messages with markdown and reply support
CREATE TABLE IF NOT EXISTS chat_messages (
    id VARCHAR(64) PRIMARY KEY,
    channel_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(100) NOT NULL DEFAULT 'Student',
    user_avatar TEXT DEFAULT '',
    content TEXT NOT NULL,
    reply_to_id VARCHAR(64) DEFAULT NULL,
    attachments JSON DEFAULT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    edited_at TIMESTAMP NULL DEFAULT NULL,
    
    -- Channel reference constraint (cascades on channel deletion)
    CONSTRAINT fk_chat_messages_channel
        FOREIGN KEY (channel_id) 
        REFERENCES chat_channels(id) 
        ON DELETE CASCADE,
        
    -- Self-referencing constraint for reply threads
    CONSTRAINT fk_chat_messages_reply
        FOREIGN KEY (reply_to_id)
        REFERENCES chat_messages(id)
        ON DELETE SET NULL
);

-- Optimized indexes for sub-millisecond channel message history queries
CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_created 
    ON chat_messages(channel_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_user 
    ON chat_messages(user_id);

-- 3. CHAT USER PRESENCE TABLE
-- Real-time heartbeat tracking showing who is online/idle/offline
CREATE TABLE IF NOT EXISTS chat_user_presence (
    user_id VARCHAR(64) PRIMARY KEY,
    user_name VARCHAR(100) NOT NULL DEFAULT 'Student',
    user_avatar TEXT DEFAULT '',
    status VARCHAR(20) NOT NULL DEFAULT 'offline', -- 'online' | 'idle' | 'dnd' | 'offline'
    custom_status VARCHAR(128) DEFAULT '',
    current_channel_id VARCHAR(64) DEFAULT NULL,
    last_seen_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_chat_presence_status 
    ON chat_user_presence(status, last_seen_at DESC);

-- 4. CHANNEL MEMBERSHIP & UNREAD TRACKING TABLE
-- Tracks when each user last read messages in a channel for unread pill badges
CREATE TABLE IF NOT EXISTS chat_channel_members (
    channel_id VARCHAR(64) NOT NULL,
    user_id VARCHAR(64) NOT NULL,
    last_read_message_id VARCHAR(64) DEFAULT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    PRIMARY KEY (channel_id, user_id),
    
    CONSTRAINT fk_channel_members_chan
        FOREIGN KEY (channel_id) 
        REFERENCES chat_channels(id) 
        ON DELETE CASCADE
);
