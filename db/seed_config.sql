-- SBR Stats — Config seed data
-- Run once on first container boot via docker-entrypoint-initdb.d/
-- Edit this file to add aliases, points structures, and class assignments.
-- Re-running the import script will NOT overwrite anything in this file.

-- ============================================================
-- DRIVER ALIASES
-- Maps raw xlsx names to canonical display names.
-- Multiple raw names can map to the same canonical_player.
-- ============================================================

-- Example: "ARI" in xlsx should display as "Arib Hossain"
-- INSERT INTO canonical_players (display_name) VALUES ('Arib Hossain');
-- INSERT INTO driver_aliases (raw_name, player_id)
--     SELECT 'ARI', id FROM canonical_players WHERE display_name = 'Arib Hossain';
-- If the same person appears as 'Arib' in another season:
-- INSERT INTO driver_aliases (raw_name, player_id)
--     SELECT 'Arib', id FROM canonical_players WHERE display_name = 'Arib Hossain';

-- ============================================================
-- POINTS STRUCTURES
-- Only required for position-type seasons (S1–S6, WEC).
-- Points seasons store raw points in the xlsx and need no structure.
-- ============================================================

-- Example: standard F1-style structure (25-18-15-12-10-8-6-4-2-1)
-- INSERT INTO points_structures (name, description)
-- VALUES ('standard_f1', 'F1-style top 10: 25-18-15-12-10-8-6-4-2-1');
--
-- INSERT INTO points_structure_entries (structure_id, finish_position, points) VALUES
--   ((SELECT id FROM points_structures WHERE name = 'standard_f1'), 1,  25),
--   ((SELECT id FROM points_structures WHERE name = 'standard_f1'), 2,  18),
--   ((SELECT id FROM points_structures WHERE name = 'standard_f1'), 3,  15),
--   ((SELECT id FROM points_structures WHERE name = 'standard_f1'), 4,  12),
--   ((SELECT id FROM points_structures WHERE name = 'standard_f1'), 5,  10),
--   ((SELECT id FROM points_structures WHERE name = 'standard_f1'), 6,   8),
--   ((SELECT id FROM points_structures WHERE name = 'standard_f1'), 7,   6),
--   ((SELECT id FROM points_structures WHERE name = 'standard_f1'), 8,   4),
--   ((SELECT id FROM points_structures WHERE name = 'standard_f1'), 9,   2),
--   ((SELECT id FROM points_structures WHERE name = 'standard_f1'), 10,  1);
--
-- Link to seasons (run after import_xlsx.py so season rows exist):
-- INSERT INTO season_points_structure (season_id, class_id, structure_id)
-- SELECT s.id, NULL, (SELECT id FROM points_structures WHERE name = 'standard_f1')
-- FROM seasons s
-- WHERE s.name IN ('S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'WEC');

-- ============================================================
-- MULTICLASS SETUP
-- Only required for seasons where is_multiclass = TRUE.
-- The import script sets is_multiclass based on SEASON_FLAGS.
-- ============================================================

-- Step 1: define classes
-- INSERT INTO classes (name) VALUES ('DPI'), ('GT3');

-- Step 2: enable multiclass on the season (if not already set by import)
-- UPDATE seasons SET is_multiclass = TRUE WHERE name = 'IMSA';

-- Step 3: assign each driver to their class for that season
-- INSERT INTO driver_season_class (season_id, driver_id, class_id)
-- SELECT s.id, d.id, c.id
-- FROM seasons s, drivers d, classes c
-- WHERE s.name = 'IMSA' AND d.raw_name = 'DRIVER_NAME' AND c.name = 'DPI';

-- ============================================================
-- DROP ROUND FLAGS
-- Set by SEASON_FLAGS in import_xlsx.py, but can also be patched here.
-- ============================================================

-- UPDATE seasons SET has_drop_round = TRUE WHERE name IN ('season_name');
