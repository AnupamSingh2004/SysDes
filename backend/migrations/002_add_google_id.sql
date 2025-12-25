-- Migration: Add google_id column to users table
-- Run this if you already have an existing database

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(100) UNIQUE;
