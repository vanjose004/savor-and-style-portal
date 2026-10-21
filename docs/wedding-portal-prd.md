# PRD — Savor & Style Client Event Portal ("My Event")

> **For Claude Code:** This is a new module inside the existing Savor & Style portal (`savorandstylecatering.com`, React + Vite + Supabase + Vercel). **Before writing code, inspect the existing project** — booking tables, booking code generator, auth (staff username login with synthetic internal emails), notification bell, Telegram admin bot, photo gallery uploads, `constants.js`, and the Supabase migrations folder (currently around `000028`). Reuse existing patterns, components, and tables wherever possible. Do **not** duplicate the bookings table — extend it. Build in the phases listed at the end, and stop after each phase for review.

---

## 1. Vision

When a client books Savor & Style (especially an **All-In Package**), they get their own private event-planning portal — an **"ultimate event planner"** where they plan everything for their wedding, debut, or birthday: guest list, budget and expenses, checklists, entourage, program, vendors, documents, payments, and messages to our coordinator.

**Goal:** the client "tambays" in the portal instead of scattered Messenger chats, notebooks, and spreadsheets. It becomes a major selling point of the All-In Package and reduces coordinator workload.

**Tagline:** *"Your event, planned in one place."*

### Supported event types (v1)
| Event type | Key extras |
|---|---|
| **Wedding** | Entourage & sponsors, church/civil requirements, couple profiles, wedding program |
| **Debut (18th)** | 18 Roses / 18 Candles / 18 Treasures / 18 Bills, cotillion, escort |
| **Birthday** | Kiddie party (theme, games, prizes, loot bags) or Adult/Milestone (1st, 7th, 18th-male, 21st, 50th, 60th, etc.) |

Design the event type system so more types can be added later (Christening, Anniversary, Corporate) without schema changes — use an `event_type` enum/lookup + template tables.

---

## 2. Core Principle: Admin Decides What Each Client Gets

Van (admin) controls everything per booking. Some clients avail a standard All-In Package, others are customized.

### 2.1 Package modes
- **All-In Package (template):** admin picks a package template — inclusions, enabled modules, and default deadlines are auto-filled.
- **Custom:** admin starts from a template (or blank) and edits freely — add/remove inclusions, toggle modules, set custom deadlines and notes.
- Either way, **every booking has its own copy** of inclusions and module settings (editing a template never changes existing bookings).

### 2.2 Module toggles (per booking)
Admin can enable/disable each module for a booking. Disabled modules are hidden from the client.

| Module | Default (All-In) | Notes |
|---|---|---|
| Dashboard | Always on | — |
| Guest List & RSVP | On | |
| Seating Planner | On | |
| Budget & Expenses | On | |
| Payments (Savor & Style) | Always on | |
| Checklist & Timeline | On | |
| Menu | On | Locked/read-only option |
| Styling & Mood Board | On | |
| Entourage / Roles | On for Wedding & Debut | Event-type specific |
| Program / Rundown | On | |
| Vendors & Contacts | On | |
| Documents Vault | Always on | |
| Requirements Tracker | On for Wedding | Church/civil docs |
| Music & Song List | On | |
| Gifts & Thank-You Tracker | On | |
| Messages | Always on | |
| Add-On Requests | On | Upsell |
| Memory Gallery | Unlocks after event | |
| Feedback & Review | Unlocks after event | |

### 2.3 Inclusions
Each booking has a list of **inclusions** (line items) the client can see: e.g., "Buffet for 150 pax", "Backdrop & stage styling", "Host/Emcee", "Lights & sounds", "Cake (3-tier)", "Photo booth 2 hrs". Each inclusion has: name, category, qty/unit, notes, `is_custom` flag, and status (`pending`, `confirmed`, `delivered`). Admin can also mark an inclusion as **"client to provide"** so it shows up in the client's own checklist/budget.

### 2.4 Admin-editable deadlines
Admin sets (or accepts template defaults for) key deadlines per booking:
- Final guest count / headcount lock
- Menu finalization
- Styling / mood board submission
- Entourage & program submission
- Payment schedule dates
- Song list submission

---

## 3. Access & Authentication

### 3.1 Credential generation (automatic)
- Triggered when admin sets a booking to **Confirmed** (or clicks "Generate Portal Access").
- **Username = booking code** (reuse the existing booking code generator).
- **Temporary password/PIN:** random, 8+ chars, shown once to admin and sent to client. Store only via Supabase Auth (never plain text in our tables).
- **Reuse the existing staff pattern:** synthetic internal email (e.g., `{booking_code}@clients.internal` or similar — match existing convention) so login works with booking code + password.
- **First login forces password change.**
- Admin actions: "Resend credentials", "Reset password", "Disable access", "Preview as client" (read-only impersonation view, no actual login).

### 3.2 Sending credentials
- Generate a ready-to-send message (copy button) in Filipino-English for Messenger/SMS, including portal link, booking code, and temp password.
- Optional: email via Resend if client email exists; SMS gateway (e.g., Semaphore) as a later phase — design a `notifications` abstraction so channels can be added.
- Telegram admin bot: notify Van when a client logs in for the first time.

### 3.3 Multiple people per event
Weddings/debuts are often planned by several people (bride + groom, debutante + mom).
- `booking_members` table: primary client (owner) can invite co-planners.
- Roles: **Owner** (full access), **Co-planner** (edit all except payments/settings), **Viewer** (read-only).
- Each member gets their own login (booking code + suffix, e.g., `SS-XXXX-2`, or their own email — pick whichever fits existing auth).
- Activity log shows who changed what.

### 3.4 Lifecycle
- Access active from confirmation until **90 days after event** (gallery download window), then read-only, then archive. Admin can extend.

### 3.5 Security (must-have)
- Supabase **RLS on every client table**: a user can only access rows where `booking_id` belongs to a booking they're a member of.
- Admin/staff roles bypass via existing role checks.
- Rate-limit login attempts; lock after repeated failures.
- Storage buckets: private, signed URLs only, path-scoped per booking.
- Guest PII (names, phones) visible only to booking members and admin.

---

## 4. Client-Facing Modules (Detailed)

### 4.1 Dashboard (Home)
- Hero: event title (e.g., "Juan & Maria's Wedding", "Sofia's 18th", "Liam's 7th Birthday"), date, venue, event-type-themed header.
- **Countdown** (days / hours) — reuse existing countdown badge logic.
- **Planning progress %** (checklist completion).
- Cards: Guests confirmed vs. invited, budget spent vs. planned, Savor balance due + next due date, next 3 deadlines, unread messages, latest announcement from coordinator.
- **"What to do this week"** smart list pulled from checklist + deadlines.
- Assigned coordinator card (name, photo, contact, response-time note).
- Status tracker: `Booked → Planning → Finalizing → Event Week → Event Day → Completed`.

### 4.2 Guest List & RSVP
**Guest fields:** full name, nickname, side/group (Bride/Groom/Celebrant/Family/Friends/Work/VIP — configurable), relationship, phone, email, age group (adult / kid / senior / infant), plus-one allowed + plus-one name, meal preference, dietary restrictions/allergies, table assignment, RSVP status (`not_invited`, `invited`, `confirmed`, `declined`, `maybe`), invitation sent (yes/no + method: printed/digital/hand-delivered), notes, needs transport, needs accommodation, special assistance (PWD/senior).

**Features:**
- Add one / bulk add (paste list) / import CSV / export CSV & PDF.
- Households/families: group guests (e.g., "Dela Cruz Family — 5 pax").
- Live counts: total invited, confirmed, declined, pending, kids vs adults, by side, by meal preference.
- **Headcount vs package pax warning:** e.g., "You have 168 confirmed; your package covers 150 pax. Extra pax may incur additional charges." (Admin sets per-head extra rate per booking; shows estimate only.)
- **Headcount lock** on admin deadline — client can't add guests after; must request via Messages.
- **Public RSVP page (optional, toggle):** shareable link `/rsvp/{event-slug}` — guests search their name, confirm/decline, choose meal, add note. Tokenized; no login. Rate-limited.
- Invitation tracker: who has/hasn't received an invite; reminder list for follow-up.
- **Day-of check-in:** QR per guest (Phase 3) or searchable checklist for the reception table, usable by staff on phone. Reuse the existing staff QR system patterns.
- Printables: alphabetical guest list with table numbers (for the reception table), per-table list.

### 4.3 Seating Planner
- Create tables (name/number, shape round/rectangle, capacity).
- Drag-and-drop guests to tables (mobile: tap-to-assign fallback).
- Warnings: over capacity, unassigned confirmed guests.
- Special tables: Presidential/Couple's table, Family, Sponsors, Kids table.
- Export printable seating chart + table cards.
- Admin/team can view final layout for floor planning.

### 4.4 Budget & Expenses Tracker (the "gastos" center)
The client tracks the **entire event budget** — not just Savor & Style.

- **Total budget** set by client.
- **Categories** (pre-filled by event type, editable):
  - Wedding: Church/Ceremony, Reception/Catering, Venue, Attire (Bride/Groom/Entourage), Hair & Makeup, Photo & Video, Invitations & Stationery, Flowers, Rings, Cake, Souvenirs/Giveaways, Transportation, Accommodation, Honeymoon, Fees & Permits, Misc
  - Debut: Venue/Catering, Gown & Attire, HMUA, Photo & Video, Cotillion/Choreographer, 18 Treasures/Giveaways, Invitations, Cake, Souvenirs, Lights & Sounds, Misc
  - Birthday: Venue/Catering, Theme & Decor, Cake & Dessert table, Host/Mascot/Entertainment, Games & Prizes, Loot Bags, Invitations, Photo & Video, Misc
- **Each expense:** item, category, vendor (link to Vendors), estimated cost, actual cost, amount paid, balance, due date, payment method, status (`planned`, `booked`, `partially_paid`, `fully_paid`), receipt upload, notes.
- **Savor & Style package auto-appears as a locked line item** synced from our booking (total, paid, balance) — client can't edit it.
- Inclusions marked "client to provide" auto-suggest as budget items.
- Summary: budget vs estimated vs actual, remaining budget, over-budget alerts per category.
- Charts: spending by category (donut), paid vs unpaid (bar).
- Upcoming payments (all vendors) list with due dates + reminders.
- Export to CSV/PDF.
- Optional: **Cash gifts / contributions received** (e.g., "Ninong contribution") to offset budget (wedding/debut common).

### 4.5 Payments (Savor & Style)
- Contract total, discounts, add-ons, extra pax charges → grand total.
- Payment schedule (reservation, downpayment, balance) with due dates and statuses.
- **Upload proof of payment** (GCash/Maya/bank screenshot) with amount + reference no. → status `pending_verification` → admin verifies in admin panel → becomes `verified` → syncs to existing accounting/payment records and Telegram bot.
- Payment history, running balance.
- Downloadable acknowledgment receipt after verification (reuse quotation/receipt PDF style).
- Payment instructions panel (GCash/bank details from admin settings).

### 4.6 Checklist & Timeline
- **Auto-generated from a template per event type**, with due dates computed relative to event date (e.g., `-180d`, `-90d`, `-30d`, `-7d`, `-1d`).
- If booking is close to event date, overdue-at-creation items are flagged "Do ASAP" instead of spamming as overdue.
- Task fields: title, description, category, due date, assignee (any booking member, or "Savor & Style team"), status (`todo`, `in_progress`, `done`, `skipped`), priority, linked module (e.g., "Finalize guest list" links to Guests).
- Two task owners: **client tasks** and **Savor team tasks** (client can see our progress, e.g., "Tasting scheduled ✅", "Backdrop design approved ✅").
- Client can add custom tasks.
- Views: list by month-before, calendar view, "this week".
- Progress % feeds the dashboard.

**Sample template tasks (seed data):**
- *Wedding:* set budget, choose church & book date, book civil/church requirements, list principal sponsors, finalize guest list draft, choose motif/colors, book photo/video, book HMUA, order gown/barong, send invitations, attend pre-Cana/seminar, finalize menu, submit entourage list, submit program & songs, final headcount, final payment, rehearsal, prepare envelopes for fees, pack wedding-day kit.
- *Debut:* set budget, choose theme, list 18 Roses / Candles / Treasures, choose escort, book cotillion choreographer, schedule cotillion practice, gown fitting, book HMUA & photo/video, invitations, finalize program, final headcount, final payment, rehearsal.
- *Birthday:* set budget, pick theme, guest list (kids/adults), book host/mascot/entertainment, plan games & prizes, order cake, prepare loot bags, invitations, final headcount, final payment.

### 4.7 Menu
- Shows the package menu (pulled from existing menu/package data and the Event Menu & Costing records).
- If admin allows: choose dishes within package rules (e.g., "Choose 2 Beef, 1 Pasta") using existing menu categories.
- Food tasting schedule & notes (if included).
- Dietary summary auto-computed from guest list (e.g., "6 no pork, 2 seafood allergy, 14 kids meals").
- **Menu lock** at deadline; after that, changes via message request.
- Admin sees client selections and approves → feeds Chef Portal / Kitchen Order Sheet.

### 4.8 Styling & Mood Board
- Choose motif / color palette (pick from presets + custom hex).
- Theme (event-type specific presets: Rustic, Elegant White & Gold, Garden, Boho, Modern Minimalist, Princess, Hollywood, Kids character-*generic* themes, etc.).
- Select from Savor & Style backdrop/styling catalog (link to existing photo gallery / backdrop design portfolio).
- Upload inspiration photos with notes (private storage).
- Pinterest/link URLs.
- "Submit for review" → coordinator comments → status `draft`, `submitted`, `approved`, `revision_requested`.
- Admin can upload the **final approved design/mockup** for client confirmation.

### 4.9 Entourage & Special Roles (event-type specific)
Generic structure: `roles` with name, person, contact, attire/color, assigned segment, confirmed (yes/no), notes, order/sequence.

**Wedding:**
- Principal Sponsors (Ninong/Ninang pairs)
- Secondary Sponsors: Candle, Veil, Cord
- Best Man, Maid/Matron of Honor
- Groomsmen & Bridesmaids
- Bible bearer, Ring bearer, Coin/Arrhae bearer, Flower girls
- Parents of bride & groom
- Officiant/Priest, Readers/Lectors, Offertory
- Entrance/processional order builder (drag to reorder) → printable processional list

**Debut:**
- **18 Roses** (name, relationship, song optional, order)
- **18 Candles** (name, short message prompt, order)
- **18 Treasures / Gifts**
- **18 Bills** or **18 Shots/Wishes** (toggle — family preference)
- Escort, Cotillion pairs (cotillion de honor), Father-daughter dance
- Parents, special guests
- Each "18" list shows a counter (e.g., "14 / 18") and a printable list for the host.

**Birthday:**
- Host/Emcee info, Mascot/Entertainer, Cake-cutting & candle blowing participants, Game facilitators
- Milestone (e.g., 60th): tribute speakers, AVP presenters

### 4.10 Program / Rundown Builder
- Time-blocked rundown: time, segment, duration, people involved, song, notes, responsible party (client/host/Savor team/coordinator).
- **Templates per event type:**
  - Wedding reception: guest arrival & cocktails → entrance of entourage → couple's grand entrance → welcome/prayer → dinner → toast & speeches → cake cutting → first dance → parents' dance → money dance (optional) → games (bouquet & garter toss) → AVP/SDE → thank-you speech → send-off
  - Debut: arrival → opening/prayer → debutante's entrance → cotillion → dinner → 18 Candles → 18 Treasures → 18 Roses → father-daughter dance → messages/AVP → debutante speech → party/after-program
  - Birthday (kids): arrival & registration → opening/prayer → games → magic/mascot show → meal → cake & candle blowing → photo op → giveaways/loot bags → closing
- Drag-to-reorder, auto-recompute times from durations.
- Lock/approve by coordinator; final rundown shared with host, coordinator, team (printable + PDF).
- Unlock "Day-of Rundown" view 1 week before.

### 4.11 Music & Song List
- Songs per segment: processional, bridal entrance, first dance, 18 roses, cake cutting, background/dinner, party.
- Fields: title, artist, segment, link (YouTube/Spotify), notes, "must play" / "do not play".
- Shared with lights & sounds / host.

### 4.12 Vendors & Contacts
- Directory of all vendors for the event (ours and theirs): category, name, contact person, phone, FB page, email, contract amount (links to Budget), booking status, arrival time on event day, notes, uploaded contract.
- Savor & Style team auto-listed (coordinator, head captain contact for event day).
- **Optional (later):** "Recommended suppliers" from SupplierSpot PH / CESA network — admin-curated.
- **Day-of Contact Sheet** printable: all vendors + key people + call times.

### 4.13 Requirements Tracker (Wedding; toggle for others)
A document checklist with status (`not_started`, `processing`, `submitted`, `done`), due date, where to get it, notes, and file upload.

**Church wedding (Catholic) — default template:**
- Baptismal certificate (marked "for marriage purposes", recent issue)
- Confirmation certificate
- PSA Birth Certificate (both)
- PSA CENOMAR (both)
- Marriage License (from Local Civil Registrar)
- Pre-Cana / Marriage preparation seminar certificate
- Canonical interview
- Marriage banns (posted in both parishes)
- List of sponsors
- Permit/letter if marrying outside home parish
- Wedding fee / donation schedule

**Civil wedding — default template:**
- PSA Birth Certificates, CENOMAR, valid IDs
- Marriage license application + pre-marriage counseling / family planning seminar
- Parental consent (if 18–21) / parental advice (if 21–25)
- Judge/Mayor schedule

**Debut/Birthday:** venue permits, barangay permit (if needed), etc. — mostly blank/custom.

> Display a note: *"Requirements vary per parish and LGU. Please confirm with your parish office / Local Civil Registrar."* Admin can edit templates.

### 4.14 Documents Vault
- From Savor & Style (uploaded by admin): contract, quotation, event order form, receipts, approved styling mockup, final rundown, floor plan.
- From client: signed contract, IDs (if needed), requirements files, vendor contracts, inspiration.
- Version history; admin can mark documents "Action required: sign & upload".
- Generated PDFs: guest list, seating chart, rundown, entourage list, day-of contact sheet, budget report.

### 4.15 Gifts & Thank-You Tracker
- Log gifts/cash gifts received: from whom (link to guest), item/amount, received date, thank-you sent (yes/no).
- Wedding: "money dance" and envelope tally; debut: 18 Treasures; birthday: gifts.
- Post-event: thank-you checklist + templated thank-you message the client can copy.

### 4.16 Messages (Direct Line to Coordinator)
- Threaded chat between booking members and assigned coordinator (e.g., Joy).
- Tags: General, Menu, Styling, Payment, Guests, Program, Urgent.
- Attachments (images/PDF).
- Read receipts; unread badges.
- New client messages → existing admin notification bell + Telegram bot alert.
- Coordinator **Announcements** (pinned posts visible on dashboard).
- Optional later: Stella (existing AI chat widget) answers FAQs inside the portal with booking context, and hands off to a human.

### 4.17 Add-On Requests (Upsell)
- Catalog of add-ons managed by admin (photo booth, grazing table, dessert bar, extra pax, upgraded backdrop, LED wall, mobile bar, etc.) with "starting at" price or "request quote".
- Client clicks "Request" → admin approves with final price → added to contract total and payment schedule.
- Statuses: `requested`, `quoted`, `accepted`, `declined`.

### 4.18 Memory Gallery & Feedback (Post-Event)
- Unlocks automatically after event date.
- Admin uploads event photos (reuse existing gallery upload); client views/downloads (zip download if feasible).
- Feedback form: star ratings (food, service, styling, coordination, overall) + comment + permission to feature as testimonial (checkbox) → feeds landing page testimonials after admin approval.
- CTA buttons to leave a Facebook/Google review.
- Thank-you message from Savor & Style.

### 4.19 Notifications & Reminders
- In-portal notification center (reuse notification bell + read-tracking pattern).
- Triggers: upcoming/overdue deadlines, payment due (7d, 3d, 1d), payment verified, new message, mood board feedback, headcount lock approaching, rundown ready, gallery ready.
- Channels: in-app (v1), email (v1 if email available), SMS (later), Messenger (later).
- Scheduled job: Vercel cron / Supabase scheduled function runs daily (Asia/Manila time).

---

## 5. Admin Side (inside existing admin portal)

### 5.1 Booking → "Client Portal" tab
On the existing booking detail drawer/page, add a **Client Portal** tab:
- Event type, package template, mode (All-In / Custom)
- Module toggles (Section 2.2)
- Inclusions editor (Section 2.3)
- Deadlines editor (Section 2.4)
- Extra pax rate
- Assigned coordinator
- Portal access: generate / resend / reset / disable / extend; show last login
- "Preview as client" (read-only)
- Activity feed (what the client changed, when)

### 5.2 Admin overview pages
- **Portal Activity board:** all active client portals with event date, planning %, unread messages, overdue client tasks, pending payment verifications, pending mood board reviews, pending add-on requests.
- **Payment verification queue** (approve/reject proof with reason).
- **Add-on requests queue.**
- **Templates manager:** package templates, checklist templates, program templates, budget categories, requirement templates, add-on catalog — per event type.

### 5.3 Integrations with existing systems
- Guest count, menu selections, dietary summary → Event Menu & Costing + Chef Portal Kitchen Order Sheet.
- Verified payments → existing payment records / accounting tracker.
- Final rundown, floor plan, vendor call times → staff/TL view for the event.
- Telegram bot: new message alerts, payment proof uploaded, add-on requested, first login; optionally command `/portal <booking code>` for a quick status.

---

## 6. Data Model (Supabase — suggested; adapt to existing schema)

> Extend existing `bookings`; add new tables with `booking_id` FK and RLS. Use sequential migrations continuing from the current number.

**Config / templates**
- `event_types` (id, key: wedding/debut/birthday, label)
- `package_templates` (id, name, event_type_id, description, default_modules jsonb, default_deadlines jsonb, active)
- `package_template_inclusions` (template_id, name, category, qty, unit, sort)
- `checklist_templates` (id, event_type_id, title, description, category, offset_days, owner: client/team, linked_module, sort)
- `program_templates` (id, event_type_id, segment, default_duration_min, sort)
- `budget_category_templates` (event_type_id, name, sort)
- `requirement_templates` (id, event_type_id, variant: church/civil/other, title, description, where_to_get, sort)
- `role_templates` (event_type_id, role_group, role_name, max_count, sort) — e.g., debut "18 Roses" max 18
- `addon_catalog` (id, name, description, starting_price, image, active)

**Per booking**
- `booking_portal_settings` (booking_id PK, event_type_id, package_template_id, mode, modules jsonb, deadlines jsonb, extra_pax_rate, coordinator_id, headcount_locked, menu_locked, access_expires_at, rsvp_public_enabled, rsvp_slug)
- `booking_members` (id, booking_id, auth_user_id, display_name, role: owner/co_planner/viewer, phone, email, must_change_password, last_login_at, active)
- `booking_inclusions` (id, booking_id, name, category, qty, unit, notes, is_custom, client_provides, status, sort)
- `guests` (id, booking_id, household_id, full_name, nickname, side_group, relationship, phone, email, age_group, plus_one_allowed, plus_one_name, meal_pref, dietary_notes, table_id, rsvp_status, invite_sent, invite_method, needs_transport, needs_accommodation, special_assistance, checked_in_at, qr_token, notes, created_by)
- `guest_households` (id, booking_id, name)
- `seating_tables` (id, booking_id, label, shape, capacity, table_type, pos_x, pos_y)
- `budget` (booking_id PK, total_budget)
- `budget_categories` (id, booking_id, name, planned_amount, sort)
- `expenses` (id, booking_id, category_id, vendor_id, item, estimated, actual, paid, due_date, method, status, receipt_path, is_savor_locked, notes)
- `contributions` (id, booking_id, from_name, amount, date, notes)
- `payment_submissions` (id, booking_id, amount, method, reference_no, proof_path, submitted_by, status, reviewed_by, reviewed_at, reject_reason) — on verify, write to existing payments table
- `tasks` (id, booking_id, template_id, title, description, category, due_date, owner: client/team, assignee_member_id, status, priority, linked_module, completed_at)
- `menu_selections` (id, booking_id, category, item, notes, status)
- `mood_board` (booking_id PK, palette jsonb, theme, catalog_selections jsonb, status, admin_notes, final_design_path)
- `mood_board_items` (id, booking_id, image_path, url, note)
- `event_roles` (id, booking_id, role_group, role_name, person_name, contact, attire, segment, sequence, confirmed, notes)
- `program_items` (id, booking_id, start_time, duration_min, segment, people, song, responsible, notes, sort, approved)
- `songs` (id, booking_id, segment, title, artist, link, must_play, do_not_play, notes)
- `vendors` (id, booking_id, category, name, contact_person, phone, fb_page, email, contract_amount, status, call_time, contract_path, notes, is_savor)
- `requirements` (id, booking_id, title, description, where_to_get, due_date, status, file_path, notes, sort)
- `documents` (id, booking_id, title, type, file_path, uploaded_by, source: admin/client, action_required, version, created_at)
- `gifts` (id, booking_id, guest_id, from_name, description, amount, received_at, thank_you_sent)
- `message_threads` / `messages` (id, booking_id, sender_member_id or staff_id, body, tag, attachments jsonb, read_by jsonb, created_at)
- `announcements` (id, booking_id, title, body, pinned, created_by)
- `addon_requests` (id, booking_id, addon_id, notes, status, quoted_price, responded_at)
- `feedback` (id, booking_id, ratings jsonb, comment, allow_testimonial, approved)
- `portal_activity_log` (id, booking_id, actor, action, entity, entity_id, diff jsonb, created_at)
- `notifications` — reuse existing table if suitable; add `booking_id` + `audience: client/admin`

**Storage buckets (private):** `portal-docs`, `portal-payments`, `portal-moodboard`, `portal-gallery` — path `{booking_id}/...`.

**RLS helper:** SQL function `is_booking_member(booking_id)` and `is_staff()`; use in every policy.

---

## 7. Routes

```
/my-event/login                     Client login (booking code + password)
/my-event/change-password           Forced on first login
/my-event                           Dashboard
/my-event/guests                    Guest list & RSVP
/my-event/seating                   Seating planner
/my-event/budget                    Budget & expenses
/my-event/payments                  Savor & Style payments
/my-event/checklist                 Checklist & timeline
/my-event/menu                      Menu
/my-event/styling                   Mood board
/my-event/entourage                 Entourage / 18s / roles (label adapts to event type)
/my-event/program                   Program / rundown
/my-event/music                     Song list
/my-event/vendors                   Vendors & contacts
/my-event/requirements              Requirements tracker
/my-event/documents                 Documents vault
/my-event/gifts                     Gifts & thank-yous
/my-event/messages                  Messages
/my-event/add-ons                   Add-on requests
/my-event/gallery                   Memory gallery (post-event)
/my-event/feedback                  Feedback (post-event)
/my-event/settings                  Members/co-planners, password
/rsvp/:slug                         Public RSVP page (optional)

Admin:
/admin/bookings/:id  → "Client Portal" tab
/admin/portals                      Portal activity board
/admin/portals/payments             Payment verification queue
/admin/portals/addons               Add-on requests queue
/admin/portals/templates            Templates manager
```
(Adjust to match the existing router structure and admin paths.)

---

## 8. UI / UX Notes

- **Mobile-first.** Most clients will use phones. Bottom nav on mobile: Home, Guests, Budget, Checklist, More.
- Premium, warm, celebratory feel consistent with Savor & Style branding; event-type accent theming (Wedding: ivory/gold; Debut: blush/rose; Birthday: playful brights) — keep it tasteful.
- Language: English UI with friendly Taglish microcopy where natural (e.g., "Kumusta, Maria & Juan! 128 days to go 🎉"). Keep labels clear.
- Empty states that teach ("Add your first guest — or paste your whole list at once").
- Auto-save forms (reuse `useFormDraft` pattern) and optimistic updates.
- Locked items show a lock icon + "Contact your coordinator to change this."
- Every list is printable/exportable (PDF/CSV).
- Accessibility: big tap targets, readable font sizes (many users are parents/titas).
- Fast: paginate/virtualize guest lists (300+ guests).

---

## 9. Build Phases

**Phase 1 — Foundation (MVP)**
1. Migrations: portal settings, members, inclusions, templates (event types, package templates), RLS helpers.
2. Client auth: credential generation (booking code + temp password), login, forced password change, admin resend/reset/disable.
3. Admin "Client Portal" tab: event type, template/custom mode, module toggles, inclusions, deadlines.
4. Client Dashboard + layout/nav that hides disabled modules.
5. Guest List (CRUD, groups, RSVP status, counts, CSV import/export, pax warning).
6. Payments (view schedule/balance, upload proof, admin verification queue → existing payments).
7. Documents vault (admin uploads, client downloads/uploads).
8. Messages (basic threaded chat + admin bell + Telegram alert).

**Phase 2 — Planner Core**
9. Checklist & timeline with templates per event type (+ seed data for Wedding/Debut/Birthday).
10. Budget & expenses (categories templates, Savor locked line, charts, upcoming payments).
11. Vendors & contacts + day-of contact sheet PDF.
12. Entourage/roles with event-type templates (Wedding entourage, Debut 18s, Birthday roles) + printable lists.
13. Program/rundown builder with templates + PDF.
14. Menu module (view/select/lock → Chef Portal integration).
15. Notifications & daily reminder job.

**Phase 3 — Delight & Upsell**
16. Styling & mood board with review workflow.
17. Seating planner (drag & drop + printables).
18. Requirements tracker (wedding church/civil templates).
19. Music & song list.
20. Add-on catalog & requests.
21. Public RSVP page.
22. Co-planner invites & activity log.
23. Gifts & thank-you tracker.
24. Post-event gallery, feedback & testimonial pipeline.
25. Guest QR check-in for event day.

---

## 10. Acceptance Criteria (high level)

- A client can only see their own booking's data (verified by RLS tests with two test bookings).
- Admin can create a booking, choose Wedding/Debut/Birthday, pick All-In template or Custom, toggle modules, and the client portal reflects it immediately.
- Credentials are generated on confirmation; temp password works once and forces a change.
- Guest counts, budget totals, and payment balances always match their source rows.
- Savor & Style payment line in the client budget always matches the admin booking record.
- Verified payment proofs appear in the existing payments/accounting records exactly once.
- Locked items (headcount, menu, approved program) cannot be edited by clients via UI or API.
- All pages usable at 360px width.
- Every printable (guest list, seating, rundown, entourage, contact sheet, budget) exports to clean PDF.

---

## 11. Open Questions for Van (answer before/while building)

1. Client login: booking code + password only, or also allow email magic link?
2. Should co-planners be in Phase 1 (bride + groom both logging in) or later?
3. Extra pax charge: show estimate automatically, or only "may incur additional charges"?
4. Menu: can All-In clients choose dishes themselves, or is it coordinator-only with client viewing?
5. Which payment methods to show (GCash, Maya, BDO/BPI, cash)?
6. Should Budget Feast PH bookings also get a lighter version of this portal later?
7. Portal access duration after the event (default 90 days)?
8. SMS provider for credentials/reminders, or Messenger copy-paste only for now?
