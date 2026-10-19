-- Retire the 'rumored' quest status. Valid statuses: active, completed, closed, undiscovered.
UPDATE quests SET status = 'active' WHERE id IN (31, 32, 33, 34) AND status = 'rumored';
UPDATE quests SET status = 'undiscovered' WHERE id = 35 AND status = 'rumored';
UPDATE quests SET status = 'closed' WHERE id = 36 AND status = 'rumored';
