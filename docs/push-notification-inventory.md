# Push notification inventory

This is the current notification surface. A row inserted into
`public.notifications` is the durable in-app/activity record. The `push`
Supabase Edge Function receives the insert webhook and sends the same body to
registered Expo tokens. A notification row can therefore exist even when no
device push is delivered.

## Remote pushes

| Kind               | Trigger                                           |          Type | Recipient                      | In-app destination          |
| ------------------ | ------------------------------------------------- | ------------: | ------------------------------ | --------------------------- |
| `review_liked`     | A `likes` row is inserted                         |      2 (user) | Review owner                   | Review/comments route       |
| `review_commented` | A `comments` row is inserted                      |      2 (user) | Review owner                   | Review/comments route       |
| `comment_liked`    | A `comment_likes` row is inserted                 |      2 (user) | Comment author                 | Review/comments route       |
| `user_followed`    | A `followers` row is inserted                     |      2 (user) | Followed member                | Actor profile               |
| `review_created`   | A published review is inserted                    | 1 (followers) | Followers of the reviewer      | Review/place route          |
| `regular_joined`   | Regular membership recalculation adds a member    |      2 (user) | Member who became a Regular    | Place route                 |
| `regular_left`     | Regular membership recalculation removes a member |      2 (user) | Member who lost Regular status | Place route                 |
| `admin_message`    | Admin sends to one member or everyone             |      2 (user) | Selected audience              | Optional admin-supplied URL |

All event-generated rows skip self-notifications where applicable and respect
the actor/recipient block relationship. Event keys make webhook retries and
repeated writes idempotent. `push_tickets` stores Expo ticket/receipt state and
is delivery bookkeeping, not another notification type.

The Activity Center currently displays `user_followed`, `review_liked`,
`review_commented`, and `admin_message`. `comment_liked`, `review_created`,
`regular_joined`, and `regular_left` still use the notification/push ledger but
are not Activity Center rows.

## Local notification

| Kind                 | Trigger                                                               | Delivery                                                             |
| -------------------- | --------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `tini_time_reminder` | Member preference enabled and notification permission already granted | Device-local Friday reminder scheduled by `utils/martiniReminder.ts` |

This reminder never creates a `public.notifications` row and never passes
through Expo's remote push API. The profile setting
`weekly_push_notifications_enabled` controls it.

## Development push guard

Development push delivery is off by default in both layers:

1. The app does not register a development Expo token or schedule local Friday
   reminders unless `EXPO_PUBLIC_ENABLE_DEV_PUSH_NOTIFICATIONS=1` is set.
2. The push Edge Function filters tokens whose `app_environment` is
   `development` unless the server secret
   `ALLOW_DEVELOPMENT_PUSH_NOTIFICATIONS=true` is set.

To explicitly test remote pushes, set both flags, restart the dev client, and
then revert them when finished. The server flag is a Supabase Edge Function
secret; do not commit it to `.env.local` or the app bundle.

`test_push` is recognized by the admin analytics labels but has no active
producer in the repository.
