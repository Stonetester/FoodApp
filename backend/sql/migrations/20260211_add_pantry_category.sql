-- Add category support to pantry items.
-- Run this manually against your DB (schema mutation is disabled in app runtime).

ALTER TABLE pantry_items
    ADD COLUMN category VARCHAR(64) NOT NULL DEFAULT 'Other';

CREATE INDEX idx_pantry_items_category ON pantry_items (category);
