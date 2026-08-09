-- Session number is now calculated from session-recap count, so the free-text
-- "subtitle" column only needs to hold the arc name.
ALTER TABLE campaign_chapter RENAME COLUMN subtitle TO arc;
