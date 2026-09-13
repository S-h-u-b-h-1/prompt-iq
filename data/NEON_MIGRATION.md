# PromptIQ Neon migration

Status: APPLIED TO PRODUCTION AND VERIFIED on 2026-09-13.

Implementation is isolated on local git branch codex/account-required-prompt-storage, not pushed to the auto-deploying production branch.

## Neon target

- Project display name: prompt-iq (renamed from snowy-queen-83101011).
- Immutable project ID: snowy-queen-83101011.
- Database: neondb.
- Production branch: br-icy-voice-ajpzamoe (main).
- Migration test branch: br-solitary-hall-ajl7bk7g (deleted after successful completion).
- Migration ID: a1ea3531-b6c2-4357-aa67-8be9471d069b.
- SQL: data/20260913_structured_activity.sql.
- No connection-string or authentication changes are needed for the project rename.
- Existing accounts, subscriptions, quotas, feedback, and 17 production optimization records were preserved.

## Organization

| Object | Purpose |
| --- | --- |
| prompt_iq.optimizations | Security-invoker view of existing optimization records, not duplicate text storage |
| public.prompt_history | Original/refined text, scores, intent, platform, mode, engine, source and idempotency UUID |
| prompt_iq.drafts | Latest revision of each account/composer draft, not every keystroke |
| prompt_iq.searches | Committed PromptIQ library queries, category, result count and server timestamp |
| prompt_iq.capture_preferences | Prompt-storage consent, optional search preference, disclosure version, acceptance/update times |
| prompt_iq.schema_migrations | Applied schema version and timestamp |

The project name uses the requested hyphen. The SQL namespace uses prompt_iq so every query does not require quoted identifiers.

## Collection boundaries

An account and affirmative prompt-storage consent are required before the extension reads a supported chat composer. Search storage has a separate optional checkbox. Existing signed-in optimization history continues to sync.

Draft snapshots come only from the supported composer adapter, after a two-second pause. Empty drafts reset the draft identifier. No chat replies, page titles, URL paths, unrelated forms, browser searches, or complete browsing history are collected. Drafts over 6,000 characters are not captured. No offline capture queue is maintained, so failed saves can be retried by further editing but are not guaranteed.

Searches are saved when the library search is committed by Enter or leaving the field, not on each keystroke. Queries are limited to 500 characters. The anonymous website demo remains local-only.

Users can read and copy their saved activity, turn either category off, or delete all drafts/searches and revoke both settings. Turning draft storage off locks the in-page optimizer until consent is restored. Optimization history has its existing separate Clear All action.

## Storage and security

- Parameterized SQL, server-issued authenticated account IDs, no client-chosen owners.
- Foreign keys from new tables to users, cascading account deletion, UTC server timestamps.
- Unique per-account event UUIDs, duplicate-search protection, monotonic draft revision checks.
- Recent-first composite indexes and bounded pagination (100 records per page).
- New tables have RLS owner policies and no PUBLIC grants. Current server credentials may be table-owner credentials, which bypass RLS; API owner predicates are mandatory. A future non-owner application role must have explicit least-privilege grants and app.user_id set transaction-locally.
- No database credentials in the browser or extension.
- Each write locks the consent row, serializing against preference revocation.
- Draft/search entries expire from retrieval after 30 days and are physically pruned on the next saved-activity read/write for that account. There is no unattended cleanup job in this change. Inactive accounts may retain expired bytes until that next request; provider backups have their own retention.
- Signed-in optimization history remains until explicitly cleared.
- No raw prompt/query text in activity API error logs.

## Verification

Run npm test for unit tests. For the actual DB/API tests, use an isolated branch only:

```sh
set -a; source .env; set +a; node scripts/test-activity-branch.mjs <isolated-branch-host>
```

The integration script uses synthetic users on the test branch. Tests cover consent, authentication, forged-owner rejection, isolation, revision ordering, duplicate events, nullable legacy scores, pagination, expiry, and deletion. Test records disappear when the temporary branch is removed; none are migrated to production.

Browser checks: output/playwright/verify-neon-activity.cjs.

## Production gate

The migration was explicitly approved, applied to production branch br-icy-voice-ajpzamoe, and the temporary branch was deleted. Production verification found all four prompt_iq tables/view support objects, all three new prompt_history columns, and the structured_activity_v2 migration marker.

The schema was applied before API deployment because the new history query expects the added columns. Version 1.0.15 was then deployed and passed the live account, consent, draft save/read, login, profile, deletion, revocation, link, API-authentication, and responsive browser smoke tests.

The generated dist.zip is the verified 1.0.15 Chrome Web Store candidate.

## Policy reference

Chrome's data handling guidance requires prominent in-product disclosure and affirmative consent where applicable:
https://developer.chrome.com/docs/webstore/program-policies/user-data-faq
