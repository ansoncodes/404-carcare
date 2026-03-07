# 404 CarCare

An enterprise-grade, multi-tenant automotive service platform built for managing car care operations across multiple airport branches. This project provides three specialized web portals (Admin, Supervisor, and Customer) to streamline bookings, operational tracking, real-time stage updates, and customer communication.

## Features & Highlights

- **Strict 3-Tier Multi-Tenancy (RBAC)**
  - **Level 1 → Admin:** Global visibility across all airports. Full control over users, services, reporting, and assignments. Has read-only access to live operational chats.
  - **Level 2 → Supervisor:** Strictly scoped to their assigned airport. Manages live active bays, updates job stages, and chats with customers exclusively at their branch.
  - **Level 3 → Customer:** Personal dashboard to book services, track real-time vehicle progress, and talk directly with the supervisor managing their car.

- **Dynamic Operations & Work Stages**
  - **Granular Job Tracking:** Bookings are converted into `JobCards`. Each service in a booking populates sequenced `WorkStages` (e.g., Wash, Compound, Final Polish, QC).
  - **Live Timeline Engine:** Supervisors manage a minimal "Pending Queue" and "Active Jobs" view, stepping through stages. Customers see a beautiful tracking timeline calculating overall progress percentages and identifying real-time activity.

- **Automated Context-Aware Notifications**
  - Powered by Django Signals to organically construct historical timelines.
  - Examples: Automatically alerting supervisors of "New Jobs", pinging customers when service initiates ("Work Started"), alerting customers of "Stage Completions", and "Almost Finished" nudges when the vehicle hits the penultimate stage.

- **Integrated Live Chat System**
  - Ephemeral, context-specific chat rooms bound directly to active `Bookings`.
  - Enables fluid, 1-on-1 communication between the customer and the local branch supervisor, completely isolated from other branches.

## Database Architecture (Django ORM)

The backend is modularized into distinct Django apps.

### `accounts`
- **CustomUser:** Custom user model supporting role-based logic (Admin, Supervisor, Customer) via a `role` field.

### `airports`
- **Airport:** Represents distinct branch locations. Contains timezone and physical location data.

### `bookings`
- **Booking:** The core transaction tying a Customer, Vehicle, Airport, and Supervisor together. Handles lifecycle statuses (Pending, Confirmed, In Progress, Completed, Cancelled).
- **BookingItem:** Links specific Services and quantities to a Booking.

### `operations`
- **JobCard:** The operational mirror to a Booking. Created once a booking moves past pending. Tracks overall operational times, `quality_score`, and active status.
- **WorkStage:** Individual sequence items inside a JobCard. Driven by the chosen services. Transitions through Pending -> In Progress -> Completed.

### `chat`
- **ChatRoom:** Created per-booking. Ties the specific customer to the assigned airport's supervisor.
- **Message:** Chronological chat messages within a room.

### `notifications`
- **Notification:** Event-driven models populated automatically by Django Signals to alert users of operational or chat activity.

### `services`
- **ServiceCategory:** High-level groupings (e.g., Interior, Exterior, Protection).
- **Service:** Defines price, base durations, and descriptions.
- **ServiceStage:** Template sequences used to dynamically generate `WorkStages` when a booking starts.

### `vehicles`
- **Vehicle:** Holds license plate, make, model relationships and ties to individual Customers.

### `slots` & `parking`
- **TimeSlot:** Defines valid start times per airport.
- **ParkingSlot / ParkingBooking:** Auxillary features to track physical bay parking if needed.

### `payments`
- **Payment:** Invoicing and monetary reconciliation linked to Bookings.

---

## Tech Stack Overview

- **Backend:** Python + Django + Django REST Framework (DRF)
  - Leverages ModelViewSets, comprehensive object-level permissions, and signals.
- **Frontend:** Next.js + React + TailwindCSS
  - Highly premium, dark-themed responsive SaaS interfaces utilizing Lucide icons, Framer Motion (for pulsing live states), and specialized dashboards.

## Quick Start (Local Development)

### Backend Setup
1. `cd apps`
2. Configure virtual environment & install requirements.
3. `python manage.py migrate`
4. `python manage.py seed_demo_data`
   - Generates 7 airports, supervisor accounts for each, dynamic booking histories, and active live job states.
   - Run `python manage.py createsuperuser` if custom admin is needed (seed script generates `admin@carcare.local` / `Admin@12345`).

### Frontend Setup
1. `cd carcare-404-frontend`
2. `npm install`
3. `npm run dev`
4. Access portals at `localhost:3000` (or configured port). Navigate to `/login` to access Admin, Supervisor, or Customer interfaces based on the seed data credentials.
