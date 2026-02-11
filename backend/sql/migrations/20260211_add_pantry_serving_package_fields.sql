ALTER TABLE pantry_items
  ADD COLUMN serving_size_text VARCHAR(255) NULL,
  ADD COLUMN servings_per_container VARCHAR(64) NULL,
  ADD COLUMN package_size_text VARCHAR(255) NULL;
