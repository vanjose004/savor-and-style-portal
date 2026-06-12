# Savor and Style Catering Services — Business Management Portal
## Full Stack Web Application Blueprint

---

## 1. PROJECT OVERVIEW

**Business Name:** Savor and Style Catering Services
**Legal Name:** V&A Estrella Catering Services
**DTI/BIR Registered Address:** 1185 Tabing Ilog, Sta. Clara, Santa Maria, Bulacan
**Display Location (for clients):** Sta. Maria, Bulacan | Serving Metro Manila & Nearby Areas
**Phone:** 0948-599-2866
**Facebook:** Savor and Style Catering Services
**Email:** (to be added after hosting setup)
**Industry:** Catering & Events

### What This App Is
A full-stack web application that serves as the central business management system for Savor and Style Catering Services. It has three user roles — Admin, Client, and Staff — each with their own dashboard and access level.

### Goals
- Eliminate repetitive manual work (copy-paste contracts, manual receipts, paper checklists)
- Centralize all booking information in one place
- Give clients visibility into their own booking without needing to message the admin
- Give staff clear event instructions without needing a personal briefing every time
- Auto-generate contracts and acknowledgement receipts from booking data
- Track all payments, balances, and payment history per booking
- Menu builder: client suggests dishes, admin confirms final menu

### Critical Privacy Rule
**NEVER show or hint to clients that the business handles multiple events on the same day.**
The client portal must only show their own event. No dates, availability indicators, or any information that reveals other bookings on the same date.

---

## 2. TECH STACK

- **Frontend:** React (with Vite)
- **Styling:** Tailwind CSS
- **Backend:** Supabase (PostgreSQL database + Authentication + Storage)
- **PDF Generation:** jsPDF + jspdf-autotable
- **Email Notifications:** Supabase Edge Functions + Resend API
- **Hosting:** Vercel (frontend) + Supabase (backend)
- **Language:** English (default UI language)

---

## 3. BRAND & DESIGN SYSTEM

### Colors
| Name | Hex | Usage |
|------|-----|-------|
| Wine Red (Primary) | `#722F37` | Buttons, headers, accents, nav |
| Deep Wine (Dark) | `#4A1A20` | Hover states, dark backgrounds |
| Cream Yellow (Secondary) | `#F5F0DC` | Page backgrounds, card fills |
| Warm White | `#FDFAF4` | Content backgrounds |
| Gold Accent | `#C9A84C` | Borders, dividers, highlights |
| Dark Text | `#1A1A1A` | Body text |
| Muted Text | `#6B6B6B` | Labels, secondary text |
| Success Green | `#2D6A4F` | Paid, confirmed status |
| Warning Amber | `#B5770D` | Pending, partial payment |
| Danger Red | `#8B1A1A` | Cancelled, overdue |

### Typography
- **Headings:** Playfair Display (Google Fonts) — elegant, serif
- **Body:** Inter (Google Fonts) — clean, modern, readable

### Design Principles
- Elegant but approachable — not intimidating
- Clean white/cream surfaces with wine red accents
- No harsh colors, no neon, no gradients
- Generous whitespace
- Mobile-responsive (clients will often view on phone)
- Professional enough for corporate clients, warm enough for family events

---

## 4. USER ROLES

### 4.1 Admin (Business Owner)
- Full access to everything
- Can create, edit, delete bookings
- Can generate contracts and acknowledgement receipts (AR only — no Official Receipt/OR)
- Can add payment records
- Can post updates to client timelines
- Can manage staff assignments
- Can view all reports and summaries
- Login: email + password via Supabase Auth

### 4.2 Client
- Can only see their own booking
- Access via unique booking link (portal.savorandstyle.com/booking/[access_token])
- Can view: event details, menu, payment history, balance, updates/timeline
- Can submit: menu suggestions and change requests
- Cannot see any other bookings or events
- Cannot see how many events the business handles per day
- Receives email notifications for updates

### 4.3 Staff / Team Leader
- Can see their assigned events only
- Can view: event details, venue, headcount, menu, special requests, checklist
- Can mark checklist items as done
- Cannot see payment information
- Cannot see other staff assignments or other events they are not assigned to
- Login: email + password via Supabase Auth

---

## 5. DATABASE SCHEMA

### Table: `bookings`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique booking ID |
| booking_code | text | Human-readable code e.g. SS-2026-001 |
| client_id | uuid (FK) | Reference to clients table |
| event_type | text | Adult Birthday, Debut, Kiddie Party, Christening/Dedication, Wedding, House Blessing, Corporate, Others |
| event_date | date | Date of the event |
| event_time | time | Start time of event |
| venue | text | Event venue/address |
| pax | integer | Number of guests |
| status | enum | pending, confirmed, completed, cancelled |
| menu_confirmed | boolean | Whether admin has confirmed the final menu |
| special_requests | text | Extra requests from client |
| total_amount | decimal | Total contract price |
| reservation_fee | decimal | ₱5,000 reservation fee (fixed) |
| balance | decimal | Computed: total - total payments made |
| contract_signed | boolean | Whether contract has been signed |
| contract_signed_at | timestamp | When contract was signed |
| notes | text | Internal admin notes (NOT visible to client) |
| service_hours | integer | Default 5, extra hours charged at ₱100/staff/hour |
| lechon_chopping | boolean | ₱300 fee if applicable |
| created_at | timestamp | When booking was created |
| updated_at | timestamp | Last updated |
| access_token | text | Unique token for client portal link |

### Table: `clients`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Unique client ID |
| name | text | Full name |
| phone | text | Contact number |
| email | text | Email address |
| address | text | Home address (optional) |
| created_at | timestamp | First booking date |

### Table: `booking_menu_items`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | ID |
| booking_id | uuid (FK) | Reference to booking |
| dish_name | text | Name of dish |
| category | text | Pork, Chicken, Pasta, Beef, Vegetable, Fish, Juice, Dessert |
| suggested_by | text | 'client' or 'admin' |
| status | enum | suggested, confirmed, rejected |
| notes | text | Any notes on this dish |

### Table: `payments`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Payment ID |
| booking_id | uuid (FK) | Reference to booking |
| amount | decimal | Amount paid |
| payment_type | text | reservation_fee, downpayment, partial, balance |
| payment_method | text | GCash, Maya, Cash, Bank Transfer, Credit Card, Check |
| reference_number | text | GCash ref, bank ref, check number |
| credit_card_fee | decimal | 5% terminal fee if credit card (auto-computed) |
| paid_at | timestamp | Date/time of payment |
| notes | text | Additional notes |
| ar_number | text | Acknowledgement Receipt number |
| ar_generated | boolean | Whether AR has been generated |

### Table: `booking_updates`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Update ID |
| booking_id | uuid (FK) | Reference to booking |
| update_type | text | payment_update, menu_update, headcount_change, general_update, confirmation, reminder, contract_update |
| message | text | Update message visible to client |
| internal_note | text | Admin-only note (NOT visible to client) |
| created_at | timestamp | When update was posted |
| created_by | text | Admin name |

### Table: `change_requests`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Request ID |
| booking_id | uuid (FK) | Reference to booking |
| request_type | text | menu_suggestion, headcount_change, venue_change, special_request, other |
| details | text | Client's request details |
| status | enum | pending, approved, rejected |
| submitted_at | timestamp | When client submitted |
| resolved_at | timestamp | When admin resolved |
| admin_response | text | Admin reply to client |

### Table: `staff`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Staff ID |
| name | text | Full name |
| role | text | waiter, team_leader, cook, driver |
| phone | text | Contact number |
| email | text | Login email |
| is_active | boolean | Active or inactive |

### Table: `event_assignments`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Assignment ID |
| booking_id | uuid (FK) | Reference to booking |
| staff_id | uuid (FK) | Reference to staff |
| role_for_event | text | Their specific role for this event |

### Table: `checklists`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Checklist item ID |
| booking_id | uuid (FK) | Reference to booking |
| item | text | Checklist item description |
| assigned_to | uuid (FK) | Staff responsible |
| is_done | boolean | Completed or not |
| done_at | timestamp | When marked done |
| category | text | setup, food_prep, equipment, service, cleanup |

### Table: `menu_master`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Dish ID |
| dish_name | text | Name of dish |
| category | text | Pork, Chicken, Pasta, Beef, Vegetable, Fish, Juice, Dessert |
| is_available | boolean | Currently available or not |
| notes | text | Any notes (e.g. "by request only") |

---

## 6. MASTER MENU LIST

Pre-populate the `menu_master` table with these dishes on first setup:

### PORK DISHES
- Pork Hamonado
- Pork Asado
- Creamy Menudo in Butter
- Filipino Menudo
- Hickory Pork
- Crispy Pork Kare-Kare
- Pork Asado (Bulacan)

### CHICKEN DISHES
- Chicken Alexander
- Creamy Chicken with Pineapples
- Chicken Pastel
- Chinese Style Roasted Chicken
- Chicken Afritada
- Chicken Buffalo
- Chicken BBQ
- Chicken Hamonado
- Hickory Chicken

### PASTA DISHES
- Filipino Spaghetti
- Italian Spaghetti (Bit Sour)
- Carbonara
- Tuna Carbonara
- Chicken Alfredo
- Pancit Grande (all kinds by request)
- Pesto Pasta
- Charlie Chan Pasta

### BEEF DISHES
- Beef Broccoli
- Beef Caldereta
- Creamy Beef in Mushroom
- Beef Salpicao
- Beef Kare-Kare
- Beef Pares (Chinese Spice)

### VEGETABLE DISHES
- Mixed Veggies
- Chopsuey (Creamy or Original)
- Cesar Salad
- Lumpiang Gulay
- Stir Fry Mongolian Vegetables
- Tofu with Beans in Oyster Sauce
- Pochero

### FISH DISHES
- Fish Fillet in White Sauce
- Fish Fillet in Sweet and Sour Sauce
- Fish Fillet in Sweet Lemon Sauce
- Fish Fillet in Thousand Island Sauce
- Fish Fillet and Tofu in Oyster Sauce

### JUICE FLAVORS
- Blue Lemonade
- Red Tea
- Lemon Iced Tea
- Cucumber Lemonade
- Black Gulaman

### DESSERTS
- Panna Cotta
- Buko Pandan
- Mango Tapioca
- Coffee Jelly
- Fruit Salad
- Ube Jelly Tapioca
- Strawberry Jelly Tapioca
- Choco Jelly Tapioca

---

## 7. FEATURES — DETAILED

### 7.1 Admin Dashboard (Home)
- Summary metrics: Total bookings, Upcoming events this month, Total revenue collected, Pending balances
- Upcoming events list (next 30 days) sorted by date
- Recent activity feed (latest bookings, payments, change requests, menu suggestions)
- Quick action buttons: New Booking, Record Payment, Add Update
- Pending change requests alert badge
- Pending menu confirmations alert badge

### 7.2 Booking Management
- List view of all bookings with filters: status, event type, date range, search by name
- Each booking card shows: client name, event type, date, pax, status badge, payment progress bar
- Create new booking form — all fields in one page
- Edit booking — all fields editable
- Delete booking with confirmation

### 7.3 Booking Detail Page (Admin View)
Sections:
1. **Client Information** — name, phone, email
2. **Event Details** — type, date, time, venue, pax, special requests
3. **Menu** — confirmed dishes listed by category. Button to open menu builder/editor. Pending client suggestions shown with approve/reject buttons.
4. **Payment Summary** — total, paid, balance, payment progress bar, full payment history, Record Payment button
5. **Contract** — status (signed/unsigned), Generate Contract PDF button, Mark as Signed button
6. **Acknowledgement Receipts** — list of generated ARs per payment, Generate AR button
7. **Updates Timeline** — all updates, form to add new update (visible to client) and internal note (admin only)
8. **Change Requests** — pending client requests with approve/reject
9. **Staff Assignments** — assigned staff, add/remove
10. **Checklist** — event checklist items with categories and status
11. **Internal Notes** — admin-only, never shown to client

### 7.4 Menu Builder
- Admin side: select dishes from master menu list per category, set as confirmed
- Client side: browse full menu list organized by category, select preferred dishes, submit as suggestion
- Admin receives notification of client menu suggestion
- Admin can approve, reject, or modify suggestions
- Final confirmed menu is what appears on contract and client portal
- Menu confirmation status shown clearly: "Menu Confirmed" or "Pending Menu Confirmation"

### 7.5 Payment Recording
Payment types accepted:
- GCash / Maya (with reference number field)
- Cash
- Bank Transfer (with reference number)
- Credit Card — straight payment only, auto-compute +5% terminal fee
- Check — payable to V&A Estrella Catering Services or Van Joseph Estrella

Payment flow:
1. Admin records payment with amount, type, method, reference
2. System auto-computes new balance
3. System auto-generates AR number (AR-YYYY-XXXX)
4. Admin can generate and download Acknowledgement Receipt PDF
5. Update posted to client timeline automatically

**Note: System generates Acknowledgement Receipts (AR) ONLY. No Official Receipt (OR) generation. OR is handled separately outside the system.**

### 7.6 Auto-Generate Contract PDF
When admin clicks "Generate Contract":
- Pull all booking data automatically
- Generate professional PDF with exact contract template below
- PDF downloadable and emailable to client

**CONTRACT TEMPLATE — use this exact content:**

---
CATERING SERVICE CONTRACT AND AGREEMENT

This Catering Service Contract ("Agreement") is entered into between:
Savor and Style Catering Services
1185 Tabing Ilog, Sta. Clara, Santa Maria, Bulacan
📞 0948-599-2866

And

Client Name: [AUTO-FILL from booking]
Contact No.: [AUTO-FILL from booking]
Event Date: [AUTO-FILL from booking]
Event Type / Venue: [AUTO-FILL from booking]

RESERVATION & BOOKING
• A ₱5,000 Reservation Fee is required upon signing of this contract to secure the event date.
• The reservation fee is non-refundable but deductible from the total contract cost.
• Booking is not confirmed without payment.

TERMS OF PAYMENT
• 50% Downpayment – Due 2–3 weeks before the event date
• Full Payment – Must be settled on or before the event day
Important: Once the food has been served and consumed, the Client is fully obligated to pay the entire contract amount, regardless of any remaining balance. The Caterer reserves the right not to proceed with setup or service if payment terms are not complied with.

MODES OF PAYMENT
We accept the following:
• Bank Transfer (any bank)
• GCash or Maya
• Credit Card (straight payment only, +5% terminal fee)
• Check (payable to V&A Estrella Catering Services or Van Joseph Estrella)
• Cash
Kind Reminder: Please send a clear screenshot or photo of the proof of payment so your booking can be updated promptly.

MENU CONFIRMATION
• Final menu must be confirmed at least 2–3 days before the event.
• Menu availability depends on market supply.
• Late changes are subject to availability.

GUEST COUNT
• Final guest count cannot be reduced.
• Additional guests will be charged accordingly.

SERVICE TIME
• Standard service time: 5 hours
• Additional service hours: ₱100 per staff per hour
• Lechon chopping fee: ₱300 (if applicable)

STAFF GRATUITY
• Staff gratuity is not included in the contract price.
• Any tips are purely optional and may be given directly to staff.

CHANGE OF EVENT DATE OR VENUE
• Contract amount may be transferred to another date or event, subject to availability.
• Client must immediately inform the Caterer of any changes.

RENTALS, LOSS & DAMAGE
• Client is responsible for all rented items.
• Any loss or damage will be charged accordingly.
• No catering items shall be left at the venue after the event.

THIRD-PARTY FOOD & SUPPLIERS
• The Caterer is responsible only for food and beverages prepared by the Caterer.
• The Caterer shall not be liable for food poisoning, allergic reactions, or health-related issues arising from food or drinks provided by outside sources.
• The Caterer reserves the right to refuse serving outside food.

LIABILITY & DAMAGES
• The Caterer shall not be liable for damages unless caused by willful negligence.
• The Client is responsible for guest behavior, venue conditions, and event-related risks.

UNLAWFUL ACTIVITIES
• The Client agrees to comply with all laws and venue regulations.
• No refund shall be issued for events canceled due to unlawful activities.

SOCIAL MEDIA & DISPUTE RESOLUTION
• In case of any concern, complaint, or misunderstanding, the Client agrees to inform the Caterer privately first to allow proper review and resolution.
• Both parties agree to refrain from posting negative, misleading, or defamatory content on social media or public platforms without prior notice and discussion.
• The Caterer commits to addressing concerns professionally and in good faith.
• Any public statement proven to be false or defamatory may be subject to appropriate legal action under Philippine law.

OTHER TERMS
• Tents may be required for outdoor venues (client's expense).
• The Caterer is not liable for alcoholic beverages supplied by the Client.
• Venue corkage fees and security deposits are shouldered by the Client.
• No refund policy. Any concerns shall be resolved professionally.

AMENDMENTS & GOVERNING LAW
• Any amendment must be in writing and agreed upon by both parties.
• This Agreement shall be governed by the laws of the Republic of the Philippines.

AGREEMENT CONFIRMATION
By signing below, both parties confirm that they have read, understood, and agreed to all the terms stated above.

Client Signature: _____________________ Date: _________
Printed Name: _____________________

Authorized Representative: _____________________ Date: _________
Savor and Style Catering Services
---

### 7.7 Acknowledgement Receipt (AR) PDF Template

AR Number: AR-[YYYY]-[XXXX]
Date: [date of payment]
Received from: [client name]
Contact: [client phone]
Event Date: [event date]
Event Type: [event type]

Amount Received: ₱[amount]
Payment Type: [reservation_fee / downpayment / partial / balance]
Payment Method: [method]
Reference Number: [ref number if applicable]

Total Contract Amount: ₱[total]
Total Paid to Date: ₱[total paid]
Remaining Balance: ₱[balance]

Received by: Savor and Style Catering Services
1185 Tabing Ilog, Sta. Clara, Santa Maria, Bulacan
📞 0948-599-2866

Note: This is an Acknowledgement Receipt only, not an Official Receipt.

### 7.8 Client Portal
Access: Via unique link (/booking/[access_token])

**Client Dashboard shows:**
1. **Welcome Header** — "Hello [First Name], here are your event details" — branded with wine red and cream
2. **Event Summary Card** — event type, date, time, venue, pax, status badge
3. **Payment Status** — visual progress bar, amount paid, balance remaining, full payment history table
4. **Menu** — confirmed dishes organized by category. If menu not yet confirmed, show "Menu pending confirmation" notice. Button to suggest dishes from master menu list.
5. **Updates / Timeline** — all admin updates in reverse chronological order
6. **Submit a Change Request** — form for headcount change, menu suggestion, special request, other
7. **Contract Status** — "Contract Signed ✓" or "Awaiting Signature" with instruction to contact caterer
8. **Contact Us** — phone number 0948-599-2866, Facebook: Savor and Style Catering Services

**STRICT PRIVACY RULES for Client Portal:**
- Show ONLY the client's own booking
- No availability calendar
- No indication of other events or bookings
- No dates showing as "busy" or "taken"
- No staff names or internal business information
- No admin notes (internal notes are never shown)
- No total number of bookings or business statistics

### 7.9 Staff Portal
Access: Email + password login

**Staff Dashboard shows:**
- List of their assigned upcoming events (date, event type, venue, time)
- Click event to open Event Detail:
  - Event date, time, venue, call time
  - Number of guests
  - Confirmed menu for the event
  - Special requests / client notes (no client full details for privacy)
  - Their assigned role
  - Event checklist organized by category (setup, food_prep, equipment, service, cleanup)
  - Can tap to mark checklist items as done
- No payment information visible
- No other staff assignments visible

### 7.10 Email Notifications
Triggered automatically for:
- New booking created → email to client with booking summary + portal link
- Payment recorded → email to client with AR attached
- Contract generated → email to client with PDF
- Admin posts an update → email to client
- Menu confirmed → email to client
- Change request approved or rejected → email to client with admin response
- Event reminder → email to client 3 days before event
- Event reminder → email to assigned staff 1 day before event

---

## 8. PAGES & ROUTES

### Admin Routes
| Route | Page |
|-------|------|
| /admin/login | Admin login |
| /admin/dashboard | Main dashboard |
| /admin/bookings | All bookings list |
| /admin/bookings/new | Create new booking |
| /admin/bookings/:id | Booking detail |
| /admin/bookings/:id/edit | Edit booking |
| /admin/clients | All clients list |
| /admin/clients/:id | Client booking history |
| /admin/staff | Staff management |
| /admin/menu | Master menu management |
| /admin/reports | Revenue and booking reports |
| /admin/settings | Business settings |

### Client Routes
| Route | Page |
|-------|------|
| /booking/:access_token | Client portal (no login needed) |

### Staff Routes
| Route | Page |
|-------|------|
| /staff/login | Staff login |
| /staff/dashboard | Staff event list |
| /staff/event/:id | Event detail + checklist |

---

## 9. FOLDER STRUCTURE

```
savor-and-style-portal/
├── public/
│   └── logo.png
├── src/
│   ├── components/
│   │   ├── ui/
│   │   ├── admin/
│   │   ├── client/
│   │   └── staff/
│   ├── pages/
│   │   ├── admin/
│   │   ├── client/
│   │   └── staff/
│   ├── lib/
│   │   ├── supabase.js
│   │   ├── pdf.js
│   │   └── utils.js
│   ├── hooks/
│   ├── context/
│   └── App.jsx
├── supabase/
│   ├── migrations/
│   └── functions/
├── .env.example
├── package.json
├── tailwind.config.js
└── vite.config.js
```

---

## 10. GETTING STARTED — INSTRUCTIONS FOR CLAUDE CODE

Build in this exact order:

1. Scaffold Vite + React project
2. Install: tailwindcss, @supabase/supabase-js, react-router-dom, jspdf, jspdf-autotable, react-hook-form, date-fns, lucide-react
3. Set up Tailwind with custom color palette from Section 3
4. Set up Supabase client with environment variables
5. Create all database tables from Section 5
6. Pre-populate menu_master table with all dishes from Section 6
7. Build reusable UI components: Button, Card, Badge, Input, Modal, StatusBadge, PaymentProgressBar
8. Build Admin pages: Login → Dashboard → Bookings List → Booking Detail → New Booking Form → Menu Manager
9. Build Client Portal
10. Build Staff Portal
11. Implement Contract PDF generation using exact template in Section 7.6
12. Implement Acknowledgement Receipt PDF using template in Section 7.7
13. Implement email notifications via Supabase Edge Functions
14. Mobile responsive styles throughout
15. Deploy to Vercel

---

## 11. ENVIRONMENT VARIABLES

```
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_RESEND_API_KEY=your_resend_api_key
```

---

*Blueprint for: Savor and Style Catering Services (V&A Estrella Catering Services)*
*Sta. Maria, Bulacan | Serving Metro Manila & Nearby Areas*
*Prepared with Claude AI — Version 2.0*
