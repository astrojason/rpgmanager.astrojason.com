## Bugs

- Admin quest form status dropdown has no "Rumored" option, but quests use `rumored` status; editing one shows it as Active and saving would overwrite it.

## Features

- Hidden quests: `hidden` flag on quests (API filters for players, admin checkbox + chip). Run `sql/015_quests_hidden.sql` before deploying.

## Enhancements