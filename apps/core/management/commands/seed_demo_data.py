import random
import uuid
from datetime import datetime, time, timedelta
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from apps.accounts.models import CustomUser
from apps.airports.models import Airport
from apps.bookings.models import Booking, BookingItem
from apps.chat.models import ChatRoom, Message
from apps.core.audit import AuditLog
from apps.notifications.models import Notification
from apps.operations.models import JobCard, WorkStage
from apps.operations.timeline import sync_booking_timeline
from apps.parking.models import ParkingBooking, ParkingSlot
from apps.payments.models import Payment
from apps.services.models import Service, ServiceCategory, ServiceStage
from apps.vehicles.models import Vehicle


# ─────────────────────────────────────────────────────────────
# Credentials Table (printed at the end)
# ─────────────────────────────────────────────────────────────
ADMIN_EMAIL = "admin@carcare.local"
ADMIN_PASS = "Admin@12345"

AIRPORTS = [
    {"name": "Kempegowda International Airport",          "code": "BLR", "city": "Bengaluru",  "address": "Devanahalli, Bengaluru",    "tz": "Asia/Kolkata"},
    {"name": "Chennai International Airport",             "code": "MAA", "city": "Chennai",    "address": "Meenambakkam, Chennai",     "tz": "Asia/Kolkata"},
    {"name": "Indira Gandhi International Airport",       "code": "DEL", "city": "New Delhi",  "address": "Palam, New Delhi",          "tz": "Asia/Kolkata"},
    {"name": "Chhatrapati Shivaji Maharaj International", "code": "BOM", "city": "Mumbai",     "address": "Andheri East, Mumbai",      "tz": "Asia/Kolkata"},
    {"name": "Rajiv Gandhi International Airport",        "code": "HYD", "city": "Hyderabad",  "address": "Shamshabad, Hyderabad",     "tz": "Asia/Kolkata"},
    {"name": "Cochin International Airport",              "code": "COK", "city": "Kochi",      "address": "Nedumbassery, Kochi",       "tz": "Asia/Kolkata"},
    {"name": "Sardar Vallabhbhai Patel International",    "code": "AMD", "city": "Ahmedabad",  "address": "Hansol, Ahmedabad",         "tz": "Asia/Kolkata"},
]

SUPERVISORS = [
    {"email": "sup.blr@carcare.local",  "name": "Arjun Reddy",     "airport_code": "BLR", "password": "Sup@BLR123"},
    {"email": "sup.maa@carcare.local",  "name": "Priya Lakshmi",   "airport_code": "MAA", "password": "Sup@MAA123"},
    {"email": "sup.del@carcare.local",  "name": "Rajat Sharma",    "airport_code": "DEL", "password": "Sup@DEL123"},
    {"email": "sup.bom@carcare.local",  "name": "Neha Patil",      "airport_code": "BOM", "password": "Sup@BOM123"},
    {"email": "sup.hyd@carcare.local",  "name": "Vikram Rao",      "airport_code": "HYD", "password": "Sup@HYD123"},
    {"email": "sup.cok@carcare.local",  "name": "Deepa Menon",     "airport_code": "COK", "password": "Sup@COK123"},
    {"email": "sup.amd@carcare.local",  "name": "Karan Patel",     "airport_code": "AMD", "password": "Sup@AMD123"},
]

CUSTOMER_EMAIL = "anson@carcare.local"
CUSTOMER_PASS = "Customer@123"
CUSTOMER_NAME = "Anson James"

CUSTOMER_VEHICLES = [
    {"plate": "KA01AB1234", "brand": "BMW",       "model": "X5",           "color": "Black",  "year": 2023, "type": "suv",   "size": "large"},
    {"plate": "TN02CD5678", "brand": "Mercedes",  "model": "C-Class",     "color": "White",  "year": 2024, "type": "sedan", "size": "medium"},
    {"plate": "DL03EF9012", "brand": "Audi",      "model": "Q7",          "color": "Grey",   "year": 2022, "type": "suv",   "size": "large"},
    {"plate": "MH04GH3456", "brand": "Porsche",   "model": "Cayenne",     "color": "Red",    "year": 2024, "type": "suv",   "size": "large"},
    {"plate": "KA05IJ7890", "brand": "Tesla",     "model": "Model 3",     "color": "Blue",   "year": 2025, "type": "sedan", "size": "medium"},
]


class Command(BaseCommand):
    help = "Seed clean demo data: 7 airports, 7 supervisors, 1 admin, 1 customer with multi-airport bookings."

    @transaction.atomic
    def handle(self, *args, **options):
        random.seed(404)
        self._nuke_non_service_data()
        self._ensure_services()

        airports = self._seed_airports()
        admin = self._seed_admin()
        supervisors = self._seed_supervisors(airports)
        customer = self._seed_customer()
        vehicles = self._seed_vehicles(customer)

        parking_by_airport = self._seed_parking_slots(airports)
        bookings = self._seed_bookings(customer, vehicles, airports, supervisors, parking_by_airport)
        self._seed_operations(bookings, supervisors)
        self._seed_chat(bookings, supervisors)
        self._seed_payments(bookings)

        # Print all generated credentials at the end
        self._print_credentials(supervisors)

    # ── CLEANUP ──────────────────────────────────────────────

    def _nuke_non_service_data(self):
        """Wipe everything EXCEPT ServiceCategory, Service, ServiceStage."""
        self.stdout.write(self.style.WARNING("Wiping old data (keeping services)..."))
        AuditLog.objects.all().delete()
        Notification.objects.all().delete()
        Payment.objects.all().delete()
        Message.objects.all().delete()
        ChatRoom.objects.all().delete()
        WorkStage.objects.all().delete()
        JobCard.objects.all().delete()
        BookingItem.objects.all().delete()
        Booking.objects.all().delete()
        ParkingBooking.objects.all().delete()
        ParkingSlot.objects.all().delete()
        Vehicle.objects.all().delete()
        CustomUser.objects.all().delete()
        Airport.objects.all().delete()
        self.stdout.write(self.style.SUCCESS("  ✓ Old data removed."))

    def _ensure_services(self):
        """If the service catalog is empty, seed it."""
        if ServiceCategory.objects.exists():
            self.stdout.write(self.style.SUCCESS("  ✓ Services already exist — keeping them."))
            return

        self.stdout.write(self.style.WARNING("  No services found — seeding service catalog..."))
        stage_minutes_by_category = {
            "Basic Wash Services": 8,
            "Interior Services": 10,
            "Detailing Services": 14,
            "Exterior Finishing": 12,
            "Specialty Services": 16,
            "Add-ons": 8,
        }

        catalog = {
            "Basic Wash Services": [
                ("Exterior wash", "499.00", ["1_PreRinse", "2_SoapApplication", "3_Scrubbing", "4_Rinse", "5_AirDry"]),
                ("Hand wash", "599.00", ["1_PreRinse", "2_HandSoap", "3_ManualScrub", "4_Rinse", "5_HandDry"]),
                ("Touchless wash", "549.00", ["1_VehicleAlignment", "2_PreRinse", "3_ChemicalSpray", "4_HighPressureRinse", "5_AirBlast"]),
            ],
            "Interior Services": [
                ("Vacuuming", "349.00", ["1_RemoveFloorMats", "2_SeatVacuum", "3_FloorVacuum", "4_TrunkVacuum", "5_MatClean"]),
                ("Interior wipe-down", "399.00", ["1_DashboardWipe", "2_ConsoleWipe", "3_DoorPanelWipe", "4_VentCleaning", "5_FinalWipe"]),
                ("Window cleaning", "299.00", ["1_GlassSprayApply", "2_CircularScrub", "3_StreakWipe", "4_EdgeClean", "5_FinalPolish"]),
                ("Odor elimination", "799.00", ["1_SourceIdentification", "2_DeepVacuum", "3_DeodorizerSpray", "4_OzoneTreatment", "5_Ventilation"]),
            ],
            "Detailing Services": [
                ("Full detail", "2499.00", ["1_Inspection", "2_ExteriorWash", "3_InteriorDeepClean", "4_PolishWax", "5_FinalInspection"]),
                ("Engine bay cleaning", "699.00", ["1_CoolDownCheck", "2_DryDustRemoval", "3_DegreaserApply", "4_LowPressureRinse", "5_AirDry"]),
                ("Carpet shampooing", "999.00", ["1_VacuumFirst", "2_ShampooApply", "3_BrushScrub", "4_ExtractWater", "5_AirDry"]),
                ("Leather conditioning", "1199.00", ["1_DustWipe", "2_CleanerApply", "3_GentleScrub", "4_ConditionerApply", "5_BuffDry"]),
                ("Headliner cleaning", "899.00", ["1_SpotTest", "2_CleanerSpray", "3_GentleDab", "4_MoistureRemoval", "5_AirDry"]),
            ],
            "Exterior Finishing": [
                ("Waxing & polishing", "1499.00", ["1_SurfaceClean", "2_PolishApply", "3_MachineBuff", "4_WaxApply", "5_HandBuff"]),
                ("Clay bar treatment", "1299.00", ["1_WashSurface", "2_LubricantSpray", "3_ClayBarGlide", "4_WipeOff", "5_SurfaceCheck"]),
                ("Paint sealant / ceramic coating", "4999.00", ["1_DeepClean", "2_PaintCorrection", "3_SealantApply", "4_CuringTime", "5_InspectionBuff"]),
                ("Tire shine", "249.00", ["1_TireClean", "2_DryTire", "3_ShineApply", "4_EvenSpread", "5_DrySet"]),
                ("Rim / wheel cleaning", "449.00", ["1_BrakeDustRemoval", "2_CleanerSpray", "3_BrushScrub", "4_Rinse", "5_DryPolish"]),
            ],
            "Specialty Services": [
                ("Paint correction", "3999.00", ["1_WashDecontaminate", "2_InspectDefects", "3_CompoundBuff", "4_PolishRefine", "5_ProtectiveSealant"]),
                ("Headlight restoration", "899.00", ["1_TapeMasking", "2_SandingLens", "3_CompoundBuff", "4_UVSealantApply", "5_FinalPolish"]),
                ("Water spot removal", "1099.00", ["1_SurfaceWash", "2_SpotAssessment", "3_RemovalSolutionApply", "4_LightBuff", "5_ProtectiveWax"]),
                ("Rust proofing", "1999.00", ["1_UndercarriageWash", "2_RustInspection", "3_RustTreatment", "4_CoatingSpray", "5_CureAndDry"]),
                ("Window tinting", "3599.00", ["1_WindowClean", "2_FilmCut", "3_SoapSolution", "4_FilmApply", "5_SqueegeeSmooth"]),
            ],
            "Add-ons": [
                ("Air freshener", "149.00", ["1_InteriorVacuum", "2_ProductSelect", "3_SprayApply", "4_EvenDistribution", "5_Ventilate"]),
                ("Scratch touch-up", "1299.00", ["1_ScratchAssessment", "2_AreaClean", "3_PrimerApply", "4_PaintMatchApply", "5_ClearCoatFinish"]),
                ("Windshield treatment", "699.00", ["1_GlassClean", "2_DryCompletely", "3_TreatmentApply", "4_EvenSpread", "5_CureTime"]),
                ("Pet hair removal", "549.00", ["1_VacuumFirst", "2_RubberBrushScrape", "3_TapeRollRemoval", "4_SecondVacuum", "5_FinalCheck"]),
                ("Sanitization", "499.00", ["1_InteriorVacuum", "2_SurfaceWipe", "3_DisinfectantSpray", "4_OzoneTreatment", "5_Ventilation"]),
            ],
        }

        for category_name, service_rows in catalog.items():
            category = ServiceCategory.objects.create(
                name=category_name, description=f"{category_name} catalog", icon="car", is_active=True,
            )
            stage_min = stage_minutes_by_category.get(category_name, 10)
            for service_name, price, stages in service_rows:
                parsed = sorted(
                    [(int(tok.split("_", 1)[0]), tok.split("_", 1)[1]) for tok in stages],
                    key=lambda r: r[0],
                )
                service = Service.objects.create(
                    category=category, name=service_name, description=f"{service_name} package",
                    duration_minutes=stage_min * len(parsed), base_price=Decimal(price), is_active=True,
                )
                for order, name in parsed:
                    ServiceStage.objects.create(
                        service=service, stage_name=name, stage_order=order,
                        estimated_duration_minutes=stage_min,
                    )
        self.stdout.write(self.style.SUCCESS("  ✓ Service catalog seeded."))

    # ── AIRPORTS ─────────────────────────────────────────────

    def _seed_airports(self):
        airports = []
        for row in AIRPORTS:
            airport = Airport.objects.create(
                name=row["name"], code=row["code"], city=row["city"],
                address=row["address"], timezone=row["tz"], is_active=True,
            )
            airports.append(airport)
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(airports)} airports created."))
        return airports

    # ── USERS ────────────────────────────────────────────────

    def _make_user(self, *, email, full_name, password, role, airport=None):
        user = CustomUser.objects.create_user(
            email=email, password=password, full_name=full_name,
            role=role, airport=airport,
            is_active=True, is_verified=True,
            is_staff=role in [CustomUser.Role.ADMIN, CustomUser.Role.SUPERVISOR],
        )
        if role == CustomUser.Role.ADMIN:
            user.is_superuser = True
            user.save(update_fields=["is_superuser"])
        return user

    def _seed_admin(self):
        admin = self._make_user(
            email=ADMIN_EMAIL, full_name="Platform Admin",
            password=ADMIN_PASS, role=CustomUser.Role.ADMIN,
        )
        self.stdout.write(self.style.SUCCESS("  ✓ Admin created."))
        return admin

    def _seed_supervisors(self, airports):
        code_to_airport = {a.code: a for a in airports}
        supervisors = []
        for row in SUPERVISORS:
            airport = code_to_airport[row["airport_code"]]
            sup = self._make_user(
                email=row["email"], full_name=row["name"],
                password=row["password"], role=CustomUser.Role.SUPERVISOR,
                airport=airport,
            )
            supervisors.append(sup)
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(supervisors)} supervisors created."))
        return supervisors

    def _seed_customer(self):
        customer = self._make_user(
            email=CUSTOMER_EMAIL, full_name=CUSTOMER_NAME,
            password=CUSTOMER_PASS, role=CustomUser.Role.CUSTOMER,
        )
        self.stdout.write(self.style.SUCCESS(f"  ✓ Customer '{CUSTOMER_NAME}' created."))
        return customer

    # ── VEHICLES ─────────────────────────────────────────────

    def _seed_vehicles(self, customer):
        vehicles = []
        for v in CUSTOMER_VEHICLES:
            vehicle = Vehicle.objects.create(
                owner=customer, plate_number=v["plate"], brand=v["brand"],
                model=v["model"], color=v["color"], year=v["year"],
                vehicle_type=v["type"], vehicle_size=v["size"],
            )
            vehicles.append(vehicle)
        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(vehicles)} vehicles created."))
        return vehicles

    # ── PARKING ──────────────────────────────────────────────

    def _seed_parking_slots(self, airports):
        zones = ["Zone A", "Zone B", "Zone C", "VIP"]
        parking_by_airport = {}
        for airport in airports:
            slots = []
            for idx in range(1, 16):
                slot = ParkingSlot.objects.create(
                    airport=airport, slot_code=f"P{idx:02d}",
                    zone_label=zones[(idx - 1) % len(zones)],
                    floor=(idx - 1) % 3,
                    status=ParkingSlot.Status.AVAILABLE,
                    price_per_hour=Decimal("99.00") + Decimal((idx % 5) * 20),
                )
                slots.append(slot)
            parking_by_airport[airport.id] = slots
        self.stdout.write(self.style.SUCCESS(f"  ✓ Parking slots created."))
        return parking_by_airport

    # ── BOOKINGS ─────────────────────────────────────────────

    def _seed_bookings(self, customer, vehicles, airports, supervisors, parking_by_airport):
        services = list(Service.objects.all())
        sup_by_airport = {s.airport_id: s for s in supervisors}

        now = timezone.now()
        start_date = timezone.localdate()
        hours = [7, 8, 9, 10, 11, 13, 14, 15, 16, 17]

        statuses_per_airport = {
            0: [Booking.Status.IN_PROGRESS, Booking.Status.CONFIRMED, Booking.Status.CONFIRMED],
            1: [Booking.Status.COMPLETED, Booking.Status.IN_PROGRESS],
            2: [Booking.Status.CONFIRMED, Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS],
            3: [Booking.Status.IN_PROGRESS, Booking.Status.COMPLETED, Booking.Status.CONFIRMED],
            4: [Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS],
            5: [Booking.Status.COMPLETED, Booking.Status.IN_PROGRESS, Booking.Status.CONFIRMED],
            6: [Booking.Status.CONFIRMED, Booking.Status.CONFIRMED],
        }

        bookings = []
        booking_idx = 0

        for airport_idx, airport in enumerate(airports):
            target_statuses = statuses_per_airport.get(airport_idx, [Booking.Status.PENDING, Booking.Status.CONFIRMED])

            for status_val in target_statuses:
                vehicle = vehicles[booking_idx % len(vehicles)]
                supervisor = sup_by_airport.get(airport.id)

                day_offset = booking_idx % 5
                booking_date = start_date + timedelta(days=day_offset)
                hour = hours[booking_idx % len(hours)]
                minute = random.choice([0, 15, 30, 45])
                scheduled_start = timezone.make_aware(
                    datetime.combine(booking_date, time(hour=hour, minute=minute)),
                    timezone.get_current_timezone(),
                )

                item_count = random.choice([1, 2, 2, 3])
                selected = random.sample(services, k=min(item_count, len(services)))
                total_duration = sum(s.duration_minutes for s in selected)
                scheduled_end = scheduled_start + timedelta(minutes=total_duration)

                # Parking for some bookings
                parking_booking = None
                if random.random() < 0.4:
                    available = [p for p in parking_by_airport[airport.id] if p.status == ParkingSlot.Status.AVAILABLE]
                    if available:
                        pslot = random.choice(available)
                        pb_status = ParkingBooking.Status.PENDING
                        if status_val == Booking.Status.IN_PROGRESS:
                            pb_status = ParkingBooking.Status.ACTIVE
                        elif status_val == Booking.Status.COMPLETED:
                            pb_status = ParkingBooking.Status.COMPLETED
                        parking_booking = ParkingBooking.objects.create(
                            customer=customer, parking_slot=pslot, vehicle=vehicle,
                            booking_reference=f"PB-{uuid.uuid4().hex[:10].upper()}",
                            check_in_time=now - timedelta(hours=2) if pb_status != ParkingBooking.Status.PENDING else None,
                            expected_checkout=now + timedelta(hours=4),
                            total_cost=Decimal(random.randint(200, 1500)),
                            status=pb_status,
                        )

                # Create with PENDING status first to ensure creation signal fires
                booking = Booking.objects.create(
                    customer=customer, vehicle=vehicle, airport=airport,
                    supervisor=supervisor,
                    scheduled_start=scheduled_start, scheduled_end=scheduled_end,
                    total_duration_minutes=total_duration,
                    parking_booking=parking_booking,
                    status=Booking.Status.PENDING, # Always create as PENDING first
                    special_instructions=random.choice([
                        "Handle with care — ceramic coated body.",
                        "Please prioritize interior work first.",
                        "Send photos after each stage.",
                        None, None,
                    ]),
                )

                subtotal = Decimal("0.00")
                for svc in selected:
                    qty = random.choice([1, 1, 1, 2])
                    item = BookingItem.objects.create(
                        booking=booking, service=svc, quantity=qty,
                        unit_price=svc.base_price, total_price=svc.base_price * qty,
                    )
                    subtotal += item.total_price

                booking.total_estimated_cost = subtotal
                if status_val == Booking.Status.COMPLETED:
                    booking.total_final_cost = subtotal + Decimal(random.choice(["0.00", "49.00", "99.00"]))
                
                # Update to the target status if not PENDING, triggering the status change signal
                if status_val != Booking.Status.PENDING:
                    booking.status = status_val
                    booking.save(update_fields=["status", "total_estimated_cost", "total_final_cost", "updated_at"])
                else:
                    booking.save(update_fields=["total_estimated_cost", "total_final_cost", "updated_at"])

                sync_booking_timeline(booking)
                bookings.append(booking)
                booking_idx += 1

        self.stdout.write(self.style.SUCCESS(f"  ✓ {len(bookings)} bookings created across {len(airports)} airports."))
        return bookings

    # ── OPERATIONS ───────────────────────────────────────────

    def _seed_operations(self, bookings, supervisors):
        sup_by_airport = {s.airport_id: s for s in supervisors}

        for booking in bookings:
            if booking.status in [Booking.Status.PENDING, Booking.Status.CANCELLED]:
                continue

            supervisor = sup_by_airport.get(booking.airport_id)
            job_status = JobCard.Status.PENDING
            if booking.status == Booking.Status.IN_PROGRESS:
                job_status = JobCard.Status.ACTIVE
            elif booking.status == Booking.Status.COMPLETED:
                job_status = JobCard.Status.COMPLETED

            job_card, _ = JobCard.objects.get_or_create(
                booking=booking,
                defaults={
                    "airport": booking.airport, "supervisor": supervisor,
                    "status": job_status, "notes": "Auto-generated job card.",
                },
            )
            job_card.airport = booking.airport
            job_card.supervisor = supervisor
            job_card.status = job_status
            if booking.status == Booking.Status.IN_PROGRESS:
                job_card.started_at = timezone.now() - timedelta(minutes=random.randint(15, 120))
            if booking.status == Booking.Status.COMPLETED:
                job_card.started_at = timezone.now() - timedelta(hours=random.randint(3, 6))
                job_card.completed_at = timezone.now() - timedelta(minutes=random.randint(10, 60))
                job_card.quality_score = random.randint(3, 5)
            job_card.save()

            if job_card.stages.count() == 0:
                sync_booking_timeline(booking)
                job_card.refresh_from_db()

            stages = list(job_card.stages.order_by("stage_order"))
            if not stages:
                continue

            # Update stage statuses individually via `.save()` to trigger signals!
            if booking.status == Booking.Status.CONFIRMED:
                pass # All pending by default
            elif booking.status == Booking.Status.IN_PROGRESS:
                progress = random.randint(1, max(1, len(stages) - 1))
                for idx, stage in enumerate(stages, 1):
                    if idx < progress:
                        stage.status = WorkStage.Status.COMPLETED
                        stage.save()
                    elif idx == progress:
                        stage.status = WorkStage.Status.IN_PROGRESS
                        stage.save()
                    else:
                        stage.status = WorkStage.Status.PENDING
                        stage.save() # Explicitly save pending stages too if needed for signals
                done = sum(1 for s in stages if s.status == WorkStage.Status.COMPLETED)
                booking.current_stage = stages[progress - 1].stage_name
                booking.progress_percentage = int((done / len(stages)) * 100)
                booking.save(update_fields=["current_stage", "progress_percentage", "updated_at"])
            else:  # COMPLETED
                for stage in stages:
                    stage.status = WorkStage.Status.COMPLETED
                    stage.save()
                booking.current_stage = stages[-1].stage_name
                booking.progress_percentage = 100
                booking.save(update_fields=["current_stage", "progress_percentage", "updated_at"])

        self.stdout.write(self.style.SUCCESS("  ✓ Job cards & work stages seeded."))

    # ── CHAT ─────────────────────────────────────────────────

    def _seed_chat(self, bookings, supervisors):
        sup_by_airport = {s.airport_id: s for s in supervisors}
        msgs = [
            "Hi, please confirm pickup timing.",
            "Work has started on your vehicle.",
            "Can you add interior vacuum please?",
            "Quality check in progress.",
            "Your car is almost ready!",
            "Thanks, I'll be there in 20 minutes.",
            "We found a minor scratch — should we fix it?",
            "Yes please, go ahead.",
            "Completed! Your vehicle looks fantastic.",
        ]

        for booking in bookings:
            if booking.status == Booking.Status.PENDING:
                continue
            staff = sup_by_airport.get(booking.airport_id)
            room, created = ChatRoom.objects.get_or_create(
                booking=booking,
                defaults={
                    "customer": booking.customer,
                    "assigned_staff": staff,
                    "airport": booking.airport,
                    "status": ChatRoom.Status.ACTIVE,
                },
            )
            if not created:
                room.assigned_staff = staff
                room.airport = booking.airport
                room.save(update_fields=["assigned_staff", "airport", "updated_at"])
            count = random.randint(2, 5)
            senders = [booking.customer]
            if staff:
                senders.append(staff)
            for i in range(count):
                Message.objects.create(
                    room=room, sender=senders[i % len(senders)],
                    message_type=Message.MessageType.TEXT,
                    content=random.choice(msgs),
                    is_read=random.random() < 0.6,
                )
        self.stdout.write(self.style.SUCCESS("  ✓ Chat rooms & messages seeded."))

    # ── PAYMENTS ─────────────────────────────────────────────

    def _seed_payments(self, bookings):
        for booking in bookings:
            subtotal = booking.total_estimated_cost or Decimal("0.00")
            if subtotal == 0:
                continue

            if booking.status == Booking.Status.COMPLETED:
                pay_status = Payment.Status.PAID
            elif booking.status == Booking.Status.IN_PROGRESS:
                pay_status = random.choice([Payment.Status.PAID, Payment.Status.PENDING])
            elif booking.status == Booking.Status.CONFIRMED:
                pay_status = random.choice([Payment.Status.PENDING, Payment.Status.PAID])
            else:
                pay_status = Payment.Status.PENDING

            txn_id = f"TXN-{uuid.uuid4().hex[:12].upper()}" if pay_status == Payment.Status.PAID else None
            Payment.objects.create(
                booking=booking, customer=booking.customer,
                subtotal=subtotal, discount=Decimal("0.00"),
                payment_method=random.choice([m.value for m in Payment.PaymentMethod]),
                transaction_id=txn_id, status=pay_status,
                paid_at=timezone.now() - timedelta(minutes=random.randint(10, 500)) if pay_status == Payment.Status.PAID else None,
            )
        self.stdout.write(self.style.SUCCESS("  ✓ Payments seeded."))



    # ── CREDENTIALS PRINT ────────────────────────────────────

    def _print_credentials(self, supervisors):
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write(self.style.SUCCESS("  DEMO DATA SEEDING COMPLETE"))
        self.stdout.write(self.style.SUCCESS("=" * 60))
        self.stdout.write("")
        self.stdout.write(self.style.WARNING("  ADMIN"))
        self.stdout.write(f"    Email:    {ADMIN_EMAIL}")
        self.stdout.write(f"    Password: {ADMIN_PASS}")
        self.stdout.write("")
        self.stdout.write(self.style.WARNING("  CUSTOMER"))
        self.stdout.write(f"    Email:    {CUSTOMER_EMAIL}")
        self.stdout.write(f"    Password: {CUSTOMER_PASS}")
        self.stdout.write("")
        self.stdout.write(self.style.WARNING("  SUPERVISORS"))
        for idx, row in enumerate(SUPERVISORS):
            sup = supervisors[idx]
            self.stdout.write(f"    {row['airport_code']}  {row['email']:30s}  {row['password']:15s}  ({row['name']})")
        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("=" * 60))
