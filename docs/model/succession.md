# Computed succession candidates

`derived/polity_succession.csv` holds computed candidates. They are **evidence and never decide a succession**. `code/generate-successions.js` writes the file on every `make:all`; nobody edits it by hand.

- [`graph.md`](./graph.md) section 1 describes how candidates are computed, their columns, and what they can and cannot claim.
- [`inheritance.md`](./inheritance.md) defines the curated claims that decide succession.

The older A/B/C/D letter types are retired. Their text was removed on 2026-11-01 and remains in git history.

## Reading a candidate

A candidate can show that two polities held the same territory, shared a people, language or religion, and how far apart they were in time. It cannot show any of these:

- how power passed
- whether the heir claimed the predecessor
- whether anyone recognised the claim

**Cases a curator should expect:**

- **Collapse:** a large polity with several partial heirs has several candidates and no single true successor.
- **Long gaps:** a shared people separated by unrelated rulers is a candidate only within the generator's window. A real claim can exist with no candidate.
- **Reconquest:** a related polity retaking lost land shares people, not continuous territory.
