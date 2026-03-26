-- SBR Stats Database Schema
-- Run once on first container boot via docker-entrypoint-initdb.d/
-- Safe to re-run (all CREATE TABLE IF NOT EXISTS).

-- ============================================================
-- CONFIG TABLES  (seeded manually via seed_config.sql)
--                Never truncated by the import script.
-- ============================================================

-- Real people — canonical display identities.
-- Multiple raw xlsx names can map to one canonical_player.
CREATE TABLE IF NOT EXISTS canonical_players (
    id           INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    display_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Maps raw xlsx driver names to canonical players.
-- If a raw_name has no row here it is shown as-is.
CREATE TABLE IF NOT EXISTS driver_aliases (
    raw_name     VARCHAR(100) NOT NULL PRIMARY KEY,
    player_id    INT UNSIGNED NOT NULL,
    CONSTRAINT fk_alias_player FOREIGN KEY (player_id)
        REFERENCES canonical_players(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Named classes for multiclass seasons (e.g. "DPI", "GT3").
CREATE TABLE IF NOT EXISTS classes (
    id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Named points structures (only required for position-type seasons).
CREATE TABLE IF NOT EXISTS points_structures (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Points awarded per finish position within a structure.
CREATE TABLE IF NOT EXISTS points_structure_entries (
    structure_id    INT UNSIGNED NOT NULL,
    finish_position TINYINT UNSIGNED NOT NULL,
    points          DECIMAL(6,2) NOT NULL,
    PRIMARY KEY (structure_id, finish_position),
    CONSTRAINT fk_pse_struct FOREIGN KEY (structure_id)
        REFERENCES points_structures(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================
-- DATA TABLES  (truncated/reloaded on every import run)
-- ============================================================

-- Every unique raw name ever seen in the xlsx.
CREATE TABLE IF NOT EXISTS drivers (
    id       INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    raw_name VARCHAR(100) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per season/series sheet.
CREATE TABLE IF NOT EXISTS seasons (
    id             INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name           VARCHAR(100) NOT NULL UNIQUE,   -- sheet name e.g. "S1", "WEC"
    display_name   VARCHAR(100) NOT NULL,
    score_type     ENUM('points','position') NOT NULL,
    race_format    ENUM('single','double') NOT NULL,
    sort_order     SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    champion       VARCHAR(100),                   -- raw_name of champion from xlsx POS col
    has_drop_round BOOLEAN NOT NULL DEFAULT FALSE,
    is_multiclass  BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Explicit round rows so we have a stable round count even with no results.
CREATE TABLE IF NOT EXISTS rounds (
    season_id    INT UNSIGNED NOT NULL,
    round_number TINYINT UNSIGNED NOT NULL,
    label        VARCHAR(100),           -- NULL → display as "R{n}"
    PRIMARY KEY (season_id, round_number),
    CONSTRAINT fk_round_season FOREIGN KEY (season_id)
        REFERENCES seasons(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One row per (season, driver, round, sub_race).
-- sub_type: 'single' for single-format, 'feature'/'reverse' for double-format.
-- Cell value is decomposed: value_numeric holds the number, value_flag holds the
-- sentinel string (dns/dnf/dnp), is_asterisked records the trailing * marker.
CREATE TABLE IF NOT EXISTS race_results (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    season_id     INT UNSIGNED NOT NULL,
    driver_id     INT UNSIGNED NOT NULL,
    round_number  TINYINT UNSIGNED NOT NULL,
    sub_type      ENUM('single','feature','reverse') NOT NULL DEFAULT 'single',
    value_numeric DECIMAL(8,2),
    value_flag    ENUM('dns','dnf','dnp'),
    is_asterisked BOOLEAN NOT NULL DEFAULT FALSE,
    UNIQUE KEY uq_result (season_id, driver_id, round_number, sub_type),
    CONSTRAINT fk_rr_season FOREIGN KEY (season_id)
        REFERENCES seasons(id) ON DELETE CASCADE,
    CONSTRAINT fk_rr_driver FOREIGN KEY (driver_id)
        REFERENCES drivers(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Class assignment per driver per season (only for is_multiclass seasons).
CREATE TABLE IF NOT EXISTS driver_season_class (
    season_id INT UNSIGNED NOT NULL,
    driver_id INT UNSIGNED NOT NULL,
    class_id  INT UNSIGNED NOT NULL,
    PRIMARY KEY (season_id, driver_id),
    CONSTRAINT fk_dsc_season FOREIGN KEY (season_id)
        REFERENCES seasons(id) ON DELETE CASCADE,
    CONSTRAINT fk_dsc_driver FOREIGN KEY (driver_id)
        REFERENCES drivers(id) ON DELETE CASCADE,
    CONSTRAINT fk_dsc_class  FOREIGN KEY (class_id)
        REFERENCES classes(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Which points structure applies to a season.
-- class_id NULL means applies to all classes (or non-multiclass season).
CREATE TABLE IF NOT EXISTS season_points_structure (
    season_id    INT UNSIGNED NOT NULL,
    class_id     INT UNSIGNED,
    structure_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (season_id, class_id),
    CONSTRAINT fk_sps_season FOREIGN KEY (season_id)
        REFERENCES seasons(id) ON DELETE CASCADE,
    CONSTRAINT fk_sps_struct FOREIGN KEY (structure_id)
        REFERENCES points_structures(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
