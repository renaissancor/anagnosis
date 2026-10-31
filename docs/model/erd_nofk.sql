-- ============================================================
-- Anagnosis ERD v3 — Active Tables Only
-- ============================================================
-- Singular table names. No FK enforcement (data has gaps).
--
-- Hierarchy:
--   Civilization → nominal top tier — DEFERRED, not an authored table.
--                  A future computed projection over the graph (see docs/model/civilization.md).
--   Polity   → political entity (e.g., Roman Empire, Tang Dynasty)
--
-- Future tables (create when data is ready):
--   Dynasty  → ruling family (e.g., Bourbon, Borjigin)
--   Polity   → ruling period within a polity (e.g., Julio-Claudian)
--   Culture  → prehistoric/archaeological entities
--   Ideology → government forms and civilization philosophies
--   History panel/column/cell → panel visualization layer
--   Province/province_period → fine-grained GeoJSON
--
-- Years: negative = BCE (e.g., -753 = 753 BCE)
-- ============================================================


-- ─── GEOGRAPHY ──────────────────────────────────────────────

CREATE TABLE territory (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL
);


-- ─── TAXONOMY TREES ─────────────────────────────────────────

CREATE TABLE ethnicity (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   TEXT,
    depth       INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    founded     TEXT,
    status      TEXT
);

CREATE TABLE language (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   TEXT,
    depth       INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    founded     TEXT,
    status      TEXT
);

CREATE TABLE religion (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    parent_id   TEXT,
    depth       INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    founder     TEXT,
    founded     TEXT,
    founded_region TEXT,
    status      TEXT
);


-- ─── POLITICAL HIERARCHY ────────────────────────────────────

CREATE TABLE polity (
    id                TEXT PRIMARY KEY,
    name              TEXT NOT NULL,
    ruling_ethnicity  TEXT,
    cultural_language TEXT,
    religion          TEXT,
    government        TEXT,
    start_year        INTEGER NOT NULL,
    end_year          INTEGER,
    note              TEXT,
    start_basis       TEXT,
    end_basis         TEXT
);


-- ─── POLITY RELATIONSHIPS ───────────────────────────────────

CREATE TABLE polity_territory (
    polity_id    TEXT NOT NULL,
    territory_id TEXT NOT NULL,
    start_year   INTEGER,
    end_year     INTEGER,
    PRIMARY KEY (polity_id, territory_id, start_year)
);

CREATE TABLE polity_policy (
    polity_id TEXT NOT NULL,
    policy    TEXT NOT NULL,
    PRIMARY KEY (polity_id, policy)
);

CREATE TABLE polity_succession (
    id                    INTEGER PRIMARY KEY,
    from_polity_id        TEXT NOT NULL,
    to_polity_id          TEXT NOT NULL,
    type                  TEXT,
    territorial_direction TEXT,
    strength              INTEGER,
    temporal_gap_years    INTEGER DEFAULT 0,
    same_ethnicity        BOOLEAN,
    related_ethnicity     BOOLEAN,
    same_language         BOOLEAN,
    same_religion         BOOLEAN,
    UNIQUE (from_polity_id, to_polity_id)
);

CREATE TABLE polity_succession_territory (
    succession_id INTEGER NOT NULL,
    territory_id  TEXT NOT NULL,
    PRIMARY KEY (succession_id, territory_id)
);


-- ─── FIGURES ────────────────────────────────────────────────

CREATE TABLE figure (
    id           TEXT PRIMARY KEY,
    name         TEXT NOT NULL,
    polity_id    TEXT,
    role         TEXT,
    birth_year   INTEGER,
    death_year   INTEGER,
    significance TEXT
);


-- ─── GOVERNMENT & DYNASTY ───────────────────────────────────

CREATE TABLE government (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    finer_type       TEXT,
    weber_legitimacy TEXT,
    description      TEXT
);

CREATE TABLE dynasty (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    ethnicity     TEXT,
    origin_region TEXT,
    note          TEXT
);

CREATE TABLE polity_dynasty (
    polity_id  TEXT NOT NULL,
    dynasty_id TEXT NOT NULL,
    start_year INTEGER,
    end_year   INTEGER,
    PRIMARY KEY (polity_id, dynasty_id, start_year)
);

-- ─── CITY ───────────────────────────────────────────────────

CREATE TABLE city (
    id               TEXT PRIMARY KEY,
    name             TEXT NOT NULL,
    lat              DOUBLE,
    lon              DOUBLE,
    founding_year    INTEGER,
    abandonment_year INTEGER,
    region           TEXT,
    modern_country   TEXT,
    note             TEXT
);

CREATE TABLE city_name (
    city_id    TEXT NOT NULL,
    name       TEXT NOT NULL,
    language   TEXT,
    start_year INTEGER,
    end_year   INTEGER,
    note       TEXT
);

CREATE TABLE city_succession (
    from_city_id    TEXT NOT NULL,
    to_city_id      TEXT NOT NULL,
    succession_type TEXT,
    year            INTEGER,
    note            TEXT
);

-- ─── PROVENANCE (see source.md) ─────────────────────────────

CREATE TABLE source (
    id        TEXT NOT NULL,
    name      TEXT NOT NULL,
    url       TEXT NOT NULL,
    licence   TEXT NOT NULL,
    version   TEXT NOT NULL,
    retrieved TEXT NOT NULL,
    citation  TEXT NOT NULL,
    note      TEXT
);

CREATE TABLE fact_source (
    entity_table  TEXT NOT NULL,
    entity_id     TEXT NOT NULL,
    field         TEXT,
    source_id     TEXT NOT NULL,
    source_record TEXT,
    note          TEXT
);

-- ─── INDEXES ────────────────────────────────────────────────

CREATE INDEX idx_polity_years ON polity(start_year, end_year);
CREATE INDEX idx_polity_succession_from ON polity_succession(from_polity_id);
CREATE INDEX idx_polity_succession_to ON polity_succession(to_polity_id);
CREATE INDEX idx_polity_territory_territory ON polity_territory(territory_id);
CREATE INDEX idx_figure_polity ON figure(polity_id);
