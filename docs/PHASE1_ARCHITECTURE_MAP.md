<!--
Phase 1 Architecture Mapping
Generated from code scan on 2026-03-07.
Scope: backend + frontend structure, model inventory, endpoint map, business logic, and gap analysis before Phase 2.
-->

# Phase 1 Architecture Map

## 1) Project Structure

### Top-level
- `manage.py` (Django entrypoint)
- `config/` (Django settings/ASGI/URL config)
- `api/v1/urls.py` (all REST route wiring)
- `apps/` (domain apps)
- `websockets/` (Channels consumers + signal broadcasters)
- `carcare-404-frontend/` (Next.js App Router frontend)
- `db.sqlite3` (SQLite DB in current setup)

### Backend framework + auth + DB
- Framework: Django 6 + Django REST Framework + Channels.
- Auth: JWT (`rest_framework_simplejwt`) for HTTP APIs.
- DB: SQLite configured in `config/settings.py`.
- Realtime: Django Channels with JWT websocket middleware.

### Backend app modules (`apps/`)
- `accounts` (custom user, role logic, profile/admin user management)
- `airports` (airport master data, soft-delete via `is_active`)
- `bookings` (service bookings + booking items + availability engine)
- `operations` (job cards + work stages + service progression)
- `parking` (parking slots + parking bookings)
- `chat` (chat rooms + messages)
- `payments` (invoice/payment records + mock payment API)
- `notifications` (event-driven notifications)
- `analytics` (dashboard/revenue aggregates)
- `services` (service catalog + stage templates)
- `vehicles` (customer vehicles)
- `slots` (time slots model exists; currently not exposed in API routes)
- `core` (base model, audit log, permissions mixins, seed command)

### Routing files
- `config/urls.py`: mounts `/api/v1/`.
- `api/v1/urls.py`: declares all REST paths and router registrations.
- No per-app `urls.py`; all API routes centralized in `api/v1/urls.py`.

## 2) Data Models (Full Inventory)

## Requested entities mapping
- `Airport`: exists (`apps.airports.Airport`).
- `Branch`: **does not exist** as a model. Concept is represented by `Airport`.
- `ParkingSlot`: exists (`apps.parking.ParkingSlot`).
- `Bay`: **does not exist** as a model.
- `Booking`: exists (`apps.bookings.Booking`).
- `Job`: no `Job` model; operational equivalent is `JobCard` (`apps.operations.JobCard`).
- `User`: implemented as `CustomUser` (`apps.accounts.CustomUser`).
- `Supervisor`: not separate model; `CustomUser` with `role="supervisor"`.
- `Payment`: exists (`apps.payments.Payment`).
- `Chat`: no `Chat` model; conversation container is `ChatRoom` (`apps.chat.ChatRoom`).
- `Message`: exists (`apps.chat.Message`).

## Core/common
- `BaseModel` (abstract): `id`, `created_at`, `updated_at`.
- `AuditLog`:
  - Fields: `user(FK CustomUser nullable)`, `action`, `resource_type`, `resource_id`, `ip_address`, `details`.
  - Choices `action`: `unauthorized_access`, `cross_airport_attempt`, `supervisor_reassigned`.

## Accounts
- `CustomUser`:
  - Fields: `email(unique)`, `phone(unique nullable)`, `full_name`, `role`, `is_active`, `is_verified`, `is_staff`, `airport(FK Airport nullable)`.
  - Choices `role`: `customer`, `supervisor`, `admin`.
  - Supervisor binding: optional FK to airport; not one-to-one.

## Airports
- `Airport`:
  - Fields: `name`, `code(unique)`, `city`, `address(nullable)`, `timezone`, `is_active`.

## Vehicles
- `Vehicle`:
  - Fields: `owner(FK CustomUser)`, `plate_number(unique)`, `brand`, `model`, `color`, `year`, `vehicle_type`, `vehicle_size`.
  - Choices `vehicle_type`: `sedan`, `suv`, `hatchback`, `truck`, `van`.
  - Choices `vehicle_size`: `small`, `medium`, `large`, `xl`.

## Services
- `ServiceCategory`:
  - Fields: `name(unique)`, `description`, `icon`, `is_active`.
- `Service`:
  - Fields: `category(FK ServiceCategory)`, `name`, `description`, `duration_minutes`, `base_price`, `is_active`.
- `ServiceStage`:
  - Fields: `service(FK Service)`, `stage_name`, `stage_order`, `description`, `estimated_duration_minutes`.
  - Unique constraints: `(service, stage_order)` and `(service, stage_name)`.

## Bookings
- `Booking`:
  - Fields:
    - FKs: `customer(CustomUser)`, `vehicle(Vehicle)`, `airport(Airport)`, `supervisor(CustomUser nullable, supervisor-only)`.
    - Scheduling/cost: `scheduled_start`, `scheduled_end`, `total_duration_minutes`, `estimated_completion`, `total_estimated_cost`, `total_final_cost`.
    - Link: `parking_booking(OneToOne ParkingBooking nullable)`.
    - State: `booking_reference(unique)`, `status`, `progress_percentage`, `current_stage`, `special_instructions`.
  - Choices `status`: `pending`, `confirmed`, `in_progress`, `completed`, `cancelled`, `no_show`.
  - Has `Stage` choices class in model (`received`, `pre_inspection`, `washing`, `drying`, `detailing`, `quality_check`, `ready`) but `current_stage` is free text field.
- `BookingItem`:
  - Fields: `booking(FK Booking)`, `service(FK Service)`, `quantity`, `unit_price`, `total_price`.
  - Auto-calculates `total_price = unit_price * quantity`.

## Operations
- `JobCard`:
  - Fields: `booking(OneToOne Booking)`, `airport(FK Airport)`, `supervisor(FK CustomUser nullable)`, `job_number(unique)`, `status`, `started_at`, `completed_at`, `total_estimated_duration_minutes`, `notes`, `quality_score`.
  - Choices `status`: `pending`, `active`, `paused`, `completed`.
- `WorkStage`:
  - Fields: `job_card(FK JobCard)`, `stage_name`, `stage_order`, `estimated_duration_minutes`, `status`, `started_at`, `completed_at`, `notes`.
  - Choices `status`: `pending`, `in_progress`, `completed`, `skipped`.
  - Unique constraint: `(job_card, stage_name)`.

## Parking
- `ParkingSlot`:
  - Fields: `airport(FK Airport)`, `slot_code`, `zone_label`, `floor`, `status`, `price_per_hour`.
  - Choices `status`: `available`, `occupied`, `reserved`, `maintenance`.
  - Unique constraint: `(airport, slot_code)`.
- `ParkingBooking`:
  - Fields: `customer(FK CustomUser)`, `parking_slot(FK ParkingSlot)`, `vehicle(FK Vehicle)`, `booking_reference(unique)`, `check_in_time`, `check_out_time`, `expected_checkout`, `total_cost`, `status`, `notes`.
  - Choices `status`: `pending`, `active`, `completed`, `cancelled`.
  - Save hook updates slot status (reserved/occupied/available).

## Chat
- `ChatRoom`:
  - Fields: `booking(OneToOne Booking)`, `customer(FK CustomUser)`, `assigned_staff(FK CustomUser nullable, supervisor-only)`, `airport(FK Airport nullable)`, `status`, `last_message_at`.
  - Choices `status`: `active`, `closed`, `archived`.
- `Message`:
  - Fields: `room(FK ChatRoom)`, `sender(FK CustomUser)`, `message_type`, `content`, `file_url`, `is_read`, `read_at`.
  - Choices `message_type`: `text`, `image`, `file`, `system`.
  - Save hook bumps `room.last_message_at`.

## Payments
- `Payment`:
  - Fields: `booking(OneToOne Booking)`, `customer(FK CustomUser)`, `invoice_number(unique)`, `subtotal`, `tax_amount`, `discount`, `total_amount`, `payment_method`, `transaction_id(unique nullable)`, `status`, `paid_at`.
  - Choices `status`: `pending`, `paid`, `failed`, `refunded`.
  - Choices `payment_method`: `card`, `upi`, `cash`, `netbanking`, `wallet`.
  - Save hook computes tax and total.

## Notifications
- `Notification`:
  - Fields: `recipient(FK CustomUser)`, `booking(FK Booking nullable)`, `chat_room(FK ChatRoom nullable)`, `notification_type`, `title`, `body`, `event_data(JSON)`, `is_read`, `read_at`.
  - Choices `notification_type`: `booking_confirmed`, `booking_cancelled`, `work_started`, `stage_complete`, `car_ready`, `payment_due`, `chat_message`, `new_booking`.

## Slots
- `TimeSlot`:
  - Fields: `airport(FK Airport)`, `date`, `start_time`, `end_time`, `slot_duration_mins`, `total_capacity`, `booked_count`, `is_available`.
  - Unique constraint: `(airport, date, start_time)`.
  - Model exists, but endpoints are not currently registered in `api/v1/urls.py`.

## 3) API Endpoints and Methods

Base prefix: `/api/v1/`

## Authentication and user endpoints
- `GET /health/`
- `POST /auth/register/`
- `POST /auth/login/`
- `POST /auth/refresh/`
- `GET /auth/profile/`
- `PATCH /auth/profile/`
- `POST /auth/change-password/`
- `GET /users/` (admin only)
- `GET /users/{user_id}/` (admin only)
- `PATCH /users/{user_id}/` (admin only)

## Analytics endpoints
- `GET /analytics/dashboard/`
- `GET /analytics/revenue-insights/`

## Booking availability endpoints
- `POST /bookings/check-availability/`
- `GET /bookings/day-availability/`

## Router resources (DRF)
- `/airports/`:
  - `GET list`, `POST create`, `GET retrieve`, `PUT/PATCH update`, `DELETE destroy (soft delete to inactive)`.
- `/vehicles/`:
  - Full CRUD.
- `/service-categories/`:
  - Full CRUD; delete is soft (`is_active=False`).
- `/services/`:
  - Full CRUD; delete is soft (`is_active=False`).
- `/parking-slots/`:
  - Full CRUD.
  - Note: list action currently filters to `status=available` only.
- `/parking-bookings/`:
  - Full CRUD.
  - Custom actions:
    - `POST /parking-bookings/{id}/extend-hours/`
    - `POST /parking-bookings/{id}/checkout/`
    - `POST /parking-bookings/{id}/cancel/`
- `/bookings/`:
  - Full CRUD.
  - Custom actions:
    - `POST /bookings/{id}/cancel/`
    - `POST /bookings/{id}/add-items/`
- `/job-cards/`:
  - Full CRUD.
  - Custom actions:
    - `POST /job-cards/{id}/start-service/`
    - `POST /job-cards/{id}/pause-service/`
    - `POST /job-cards/{id}/next-stage/`
    - `POST /job-cards/{id}/mark-complete/`
- `/work-stages/`:
  - Full CRUD.
  - Custom action:
    - `PATCH /work-stages/{id}/update-status/`
- `/chat-rooms/`:
  - Full CRUD.
  - Custom action:
    - `POST /chat-rooms/{id}/assign-staff/`
- `/messages/`:
  - Full CRUD.
  - Custom action:
    - `POST /messages/mark-read/`
- `/payments/`:
  - Read-only viewset: `GET list`, `GET retrieve`.
- `/payments/mock/`:
  - `POST` mock payment flow.
- `/notifications/`:
  - `GET list`, `GET retrieve`.
  - `POST create` intentionally returns 405.
  - Custom actions:
    - `POST /notifications/{id}/mark-read/`
    - `POST /notifications/mark-all-read/`

## Authentication method details
- HTTP auth: `Authorization: Bearer <access_token>` (JWT).
- Refresh flow: `/auth/refresh/` with refresh token.
- Default API permission: `IsAuthenticated` from DRF settings.
- WebSocket auth:
  - Token via query `?token=<access_token>` or `Authorization: Bearer ...` header.
  - Middleware: `websockets.middleware.JWTAuthMiddleware`.

## WebSocket endpoints
- `ws/bookings/{booking_id}/` (booking progress updates)
- `ws/chat/{room_id}/` (live chat messages)
- `ws/notifications/` (user-specific notification stream)
- `ws/analytics/dashboard/` (admin dashboard counters)

## 4) Business Logic Mapping

## Booking creation and assignment
- Booking creation handled in `BookingSerializer.create`.
- Requires future `scheduled_start`, and at least one service or parking booking.
- Total service duration computed from selected services.
- Capacity check uses overlap engine (`MAX_CONCURRENT = 7`) minute-by-minute.
- If airport selected and no supervisor explicitly set:
  - auto-assigns first active supervisor for that airport.
- Booking items are created inline and `total_estimated_cost` is computed.
- `sync_booking_timeline` builds/refreshes `JobCard` and ordered `WorkStage`s from service stage templates.
- Booking cancel endpoint sets booking status to `cancelled`.

## Job status flow
- Intended booking flow: `pending -> confirmed -> in_progress -> completed` (or `cancelled`/`no_show`).
- Payment mock endpoint moves booking `pending -> confirmed` after successful payment.
- Job control actions:
  - `start-service`: starts first pending stage; marks job active; moves booking to `in_progress`.
  - `next-stage`: completes current stage and opens next; auto-inserts Quality Check stage when needed.
  - `mark-complete`: requires no pending/in-progress stages and final stage must be Quality Check.
  - Completion sets booking to `completed`, progress 100.

## Income tracking
- Source of truth: `Payment.total_amount` where payment status is `paid`.
- Analytics excludes revenue from cancelled bookings when computing net metrics.
- Dashboard aggregates:
  - total/today/month revenue
  - pending revenue
  - change vs yesterday / last month
  - best/worst airport ranking by paid revenue.
- Revenue trend endpoint builds day-wise points for current month vs previous month.

## Supervisor-airport relationship
- Current schema: `CustomUser.airport` FK.
- This allows many supervisors per airport; **no one-to-one constraint enforced**.
- Reassignment is done by updating user airport field.
- Audit event recorded on reassignment if old and new airport are both non-null and changed.

## Parking slot availability
- Slot-level statuses: `available/occupied/reserved/maintenance`.
- Parking booking creation validates slot availability and computes initial cost.
- Parking booking save auto-syncs slot status:
  - booking `pending` -> slot `reserved`
  - booking `active` -> slot `occupied`
  - booking `completed/cancelled` -> slot `available`
- Checkout applies overstay fee and releases slot.
- Booking status signals can auto-complete/cancel linked parking booking and release slot.

## Chat/messaging and isolation
- Chat room is one-per-booking.
- Auto-created when booking becomes `confirmed` (signal).
- Visibility:
  - Admin: can view all rooms/messages.
  - Supervisor: only rooms where `assigned_staff == self`.
  - Customer: only own rooms.
- Message posting:
  - Customer/supervisor can post only in rooms they belong to.
  - Admin is currently **read-only** for posting (`PermissionDenied` on message create).
- Unauthorized cross-room attempts are logged into `AuditLog`.

## 5) Existing Frontend Mapping

## Framework and libraries
- Next.js 14 (App Router), React 18, TypeScript.
- Styling: Tailwind CSS + custom design tokens in `globals.css`.
- Data fetching/state:
  - React Query for server data.
  - Zustand for auth/booking/notification stores.
- HTTP client: Axios with request/response interceptors for JWT refresh.
- No external UI component library; custom UI components under `src/components/ui/`.

## Route coverage (existing)
- Auth: `/login`, `/register`.
- Admin:
  - `/admin/dashboard`
  - `/admin/airports`, `/admin/airports/[id]`
  - `/admin/services`, `/admin/services/[id]`
  - `/admin/users`, `/admin/users/[id]`
  - `/admin/bookings`
  - `/admin/parking`
  - `/admin/payments`
  - `/admin/slots` (info page only)
- Supervisor:
  - `/supervisor/dashboard`
  - `/supervisor/job-cards`, `/supervisor/job-cards/[id]`
  - `/supervisor/chat`, `/supervisor/chat/[roomId]`
  - `/supervisor/notifications`
  - `/supervisor/profile`
  - `/supervisor/revenue-insights`
- Customer routes are also implemented.

## Guards and auth behavior
- `ProtectedRoute` enforces role-based access and redirects unauthenticated users to `/login`.
- Axios interceptor:
  - attaches access token,
  - on 401 attempts refresh token flow,
  - clears auth if refresh fails.

## Realtime frontend
- Generic websocket hook with reconnect (`useWebSocket`).
- Live updates already wired for:
  - admin analytics dashboard (`/ws/analytics/dashboard/`)
  - booking progress (`/ws/bookings/{id}/`)
  - chat (`/ws/chat/{room}/`)
  - notifications (`/ws/notifications/`)

## 6) Gap Analysis vs Requested Admin Scope

## Missing data structures / APIs
- No `Branch` model (airport acts as branch).
- No `Bay` model or bay CRUD endpoints.
- No dedicated reports endpoints (CSV/PDF export not present).
- No explicit endpoint for “unassigned supervisors only”; must be derived from `/users/?role=supervisor`.
- No pagination support in listed endpoints (currently plain full lists).
- `TimeSlot` model exists but no API route registration.

## Chat requirement mismatch
- Requested: admin can message supervisors.
- Current backend: admin is read-only for chat message creation.
- Requires backend change if this must be enabled.

## Airport/supervisor logic mismatch
- Requested mentions 1-to-1 supervisor-airport binding.
- Current schema supports many supervisors per airport (not one-to-one).
- Reassignment warning text exists only at UI level today; backend does not return pre-replace warning payload.

## Booking/operations requirement coverage
- Existing status tags and flows are partially available in backend.
- Some requested UI tags (`OVERDUE`, `NEW`) are not directly computed server-side; can be derived in frontend.
- “Parking bookings vs Service bookings split” needs analytics extension (not present in dashboard payload).

## Requested admin routes not yet present in frontend
- Missing pages:
  - `/admin/airports/:id` detail exists, but no deep drilldown sections requested.
  - `/admin/supervisors` (not present; supervisors currently under `/admin/users` filter).
  - `/admin/bays` (not possible until Bay model/API exists).
  - `/admin/chat`, `/admin/chat/:supervisorId` (not present).
  - `/admin/reports` (not present).

## 7) Phase 2 Readiness Summary

- Architecture is mapped and stable enough to proceed with frontend/admin Phase 2 on existing APIs.
- Critical blockers for full requested scope:
  - no `Bay` backend model/API,
  - no report export APIs,
  - admin chat send permission currently blocked server-side,
  - no server-side pagination endpoints.
- For any non-existent endpoint, frontend should include explicit `TODO` comments per your instruction.

