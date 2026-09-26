# CampusBoard

A hyperlocal campus updates platform — notices, events, clubs, opportunities,
a campus calendar, and a Buy & Sell marketplace with a manual UPI payment +
Admin approval workflow.

## Development

You need Node.js and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
cp .env.example .env   # fill in your Supabase project URL + anon key
npm run dev
```

Run every file in `supabase/migrations/` against your Supabase project, in
order (001 → 020), then optionally `supabase/seed.sql` for demo content.

To remove only the demo content later, run `supabase/seed-remove.sql`.

### Chapters, interest submissions and user removal

- **Chapters** (`018_chapters.sql`) are a separate, student-run content type from Clubs, with their
  own `/chapters` pages and Admin → Chapters management.
- **"Interested to Join"** (`019_community_interests.sql`) replaces the old "Join Club" toggle.
  Students leave an interest submission; Admin reviews them under Admin → Interest. Nothing here
  manages real membership.
- **Removing a user** (`020_admin_user_removal.sql` + the `admin-delete-user` Edge Function) needs
  the Supabase Auth Admin API, so it runs server-side. Deploy the function once:

  ```sh
  supabase functions deploy admin-delete-user
  ```

  The service-role key is injected into the function by Supabase and is never present in the
  browser bundle. The function re-checks that the caller is an Admin and refuses to delete the
  caller's own account; a database trigger refuses to remove the last Admin.

### Admin bulk Excel import

Admin → Notices/Events/Opportunities/Clubs each have a "Bulk import"
button next to "New …": download that content type's `.xlsx` template,
fill in one row per item, and upload it. Rows are imported as
pending/draft records (see `013_bulk_import.sql`) — nothing becomes
public until an Admin opens the imported row in the same Create/Edit
dialog used everywhere else, adds any image, and saves.

### Creating the first Admin account

Every new signup starts as a `student` — there is no client-side or
email-pattern way to become Admin. `public.profiles` is protected by a
trigger (`profiles_guard_role`) that blocks any role change except by an
existing Admin, which creates a bootstrap problem for the very first one.

Use `public.bootstrap_first_admin()` for that one-time step. It's designed
specifically for this: it only works from a service-role/SQL Editor
connection (never from the app itself — it's revoked from `anon` and
`authenticated`), and it refuses to run again once any Admin already
exists.

1. Have the person sign up once in the app as a normal student.
2. In the Supabase SQL Editor (or any script using the service-role key),
   run:

   ```sql
   select public.bootstrap_first_admin('someone@example.edu');
   ```

To promote further admins later, do it as an existing Admin (their session
already satisfies the normal `is_admin()` check the trigger requires), or
again via the SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'someone-else@example.edu';
```

## Built with

- Vite
- React
- React Router
- TypeScript
- Tailwind CSS
- Supabase (Postgres, Auth, Storage, RLS)
- ExcelJS (Admin bulk Excel import)
