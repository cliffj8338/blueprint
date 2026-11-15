# Offline work-scenario coverage

Run manually from the project root (no server, network or sign-in needed):

```sh
npm run report:work-scenarios
node scripts/work-scenario-coverage.mjs --output generated-artifacts/scenario-coverage.md
node scripts/work-scenario-coverage.mjs --format json --output generated-artifacts/scenario-coverage.json
npm run test:work-scenario-coverage
```

The tool reads `public/skills/index-v4.json` and evaluates every row with the actual
`public/work-scenarios.js` matcher in an isolated Node VM. It does not run in app
startup or build hooks and does not load the app, Firebase, or profile data.
Generated reports belong in the ignored `generated-artifacts/` directory, not in
served assets or Git. Commands use repository-relative defaults even when run
from another working directory; explicit file paths are relative to your shell.

## Interpreting results

- `exact_specialist`: reviewed exact label or controlled alias, with existing
  Moderate confidence. This is not demonstrated agent competence.
- `broad_domain`: wording matched a broad template (also Moderate); these skills
  still lack a reviewed specialist scenario. A broad match is not exact coverage.
- `low_confidence_fallback`: no specific library match, Low confidence supporting
  examples, not automation of the underlying skill.

Totals count ontology **rows**, distinguished by source and stable id, not unique
labels. ESCO's `id` and Lightcast's `lcId` supply stable identity. Some other
sources have no stable id; those rows retain `id: null` and are counted explicitly.
For these, a lost alias is marked `identity_unavailable`, never a proven rename or
removal. No identity is inferred from row position or similar wording.
The declared ontology count is not used as a substitute for row counting.
Category counts use the ontology's `c` value, not the scenario template's domain.
JSON includes all skills and match metadata for filtering and review. Markdown
includes category totals, alphabetical fallback/broad samples and alias gaps.
Ordering is fixed, with no timestamps, randomness or locale-dependent sorting.
Counts alone do not establish safety, demand, or the priority of a specialty.

## Detecting label drift

Before replacing the ontology, save a JSON report. After updating it, compare:

```sh
node scripts/work-scenario-coverage.mjs --baseline generated-artifacts/scenario-coverage-before.json --format json --output generated-artifacts/scenario-coverage-after.json
```

`controlledAliases` lists each maintained alias and its current matching ontology
identities. An absent alias is merely **unrepresented** without baseline evidence.
If it had matches in the baseline and now has none, `orphanedFrom` identifies each
prior row and whether its source/id survives with a changed label or was removed.
Renaming one of several duplicate labels does not orphan an alias while another
still matches. Stable ids must be preserved across ontology revisions to
distinguish renaming from removal; this report cannot infer identity from wording.
The first report cannot reconstruct historical renames.

Review gaps with domain expertise and actual tasks, safety boundaries, permissions,
and regulatory constraints. Add aliases or scenarios only through a separate
reviewed change with matcher tests. The report never proposes fuzzy replacements,
edits scenario definitions, or increases confidence.
