## Bugs

- Admin quest form status dropdown has no "Rumored" option, but quests use `rumored` status; editing one shows it as Active and saving would overwrite it.

## Features

- Real session numbers on recaps (`session_number`, used by home page chapter + recap pages). Run `sql/016_recap_session_number.sql`, then backfill from the vault.

## Enhancements