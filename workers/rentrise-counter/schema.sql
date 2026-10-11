-- One row per day, state, event and category. Counts only.
CREATE TABLE IF NOT EXISTS counts (
  day   TEXT    NOT NULL,          -- YYYY-MM-DD (UTC)
  state TEXT    NOT NULL,          -- qld | nsw | vic
  event TEXT    NOT NULL,          -- result | reason | message_copied | calendar | share_* | print
  value TEXT    NOT NULL DEFAULT '', -- ok | bad | warn | reason code | ''
  n     INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (day, state, event, value)
);
