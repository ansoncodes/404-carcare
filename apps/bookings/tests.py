from datetime import datetime, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIRequestFactory

from apps.bookings.availability import (
    MAX_CONCURRENT,
    check_availability,
    find_next_available,
    get_day_availability,
)
from apps.bookings.models import Booking
from apps.bookings.serializers import BookingSerializer
from apps.accounts.models import CustomUser
from apps.airports.models import Airport
from apps.parking.models import ParkingBooking, ParkingSlot
from apps.services.models import Service, ServiceCategory
from apps.vehicles.models import Vehicle


class AvailabilityEngineTestCase(TestCase):
    """Tests for the overlap detection algorithm."""

    @classmethod
    def setUpTestData(cls):
        cls.airport = Airport.objects.create(
            name="Test Airport", code="TST", city="Test City", address="123 Test St"
        )
        cls.customer = CustomUser.objects.create_user(
            email="test@test.com",
            password="Test@12345",
            full_name="Test Customer",
            role=CustomUser.Role.CUSTOMER,
        )
        cls.vehicle = Vehicle.objects.create(
            owner=cls.customer,
            plate_number="TEST001",
            brand="Toyota",
            model="Camry",
            vehicle_type=Vehicle.VehicleType.SEDAN,
            vehicle_size=Vehicle.VehicleSize.MEDIUM,
        )
        cls.category = ServiceCategory.objects.create(
            name="Test Category", is_active=True
        )
        cls.service = Service.objects.create(
            category=cls.category,
            name="Test Service",
            duration_minutes=60,
            base_price=Decimal("500.00"),
            is_active=True,
        )

    def _create_booking(self, start, duration_minutes=60, status=Booking.Status.PENDING):
        end = start + timedelta(minutes=duration_minutes)
        return Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            airport=self.airport,
            scheduled_start=start,
            scheduled_end=end,
            total_duration_minutes=duration_minutes,
            status=status,
        )

    # ------------------------------------------------------------------ #
    # 1. Empty DB → any time is available
    # ------------------------------------------------------------------ #
    def test_empty_db_always_available(self):
        start = timezone.now() + timedelta(hours=1)
        result = check_availability(start, 60)
        self.assertTrue(result["available"])
        self.assertEqual(result["peak_concurrent"], 0)
        self.assertIsNone(result["next_available_at"])

    # ------------------------------------------------------------------ #
    # 2. Single booking → 6 spots left
    # ------------------------------------------------------------------ #
    def test_single_booking_still_available(self):
        start = timezone.now() + timedelta(hours=2)
        self._create_booking(start, 60)

        result = check_availability(start, 60)
        self.assertTrue(result["available"])
        self.assertEqual(result["peak_concurrent"], 1)

    # ------------------------------------------------------------------ #
    # 3. All 7 concurrent bookings → next request blocked
    # ------------------------------------------------------------------ #
    def test_seven_concurrent_bookings_blocks(self):
        start = timezone.now() + timedelta(hours=3)
        for _ in range(MAX_CONCURRENT):
            self._create_booking(start, 60)

        result = check_availability(start, 60)
        self.assertFalse(result["available"])
        self.assertEqual(result["peak_concurrent"], MAX_CONCURRENT)
        self.assertIsNotNone(result["next_available_at"])

    # ------------------------------------------------------------------ #
    # 4. Partial overlap → counts correctly
    # ------------------------------------------------------------------ #
    def test_partial_overlap_counts(self):
        base = timezone.now() + timedelta(hours=4)

        # Booking A: 09:00–10:00 (60 min)
        self._create_booking(base, 60)
        # Booking B: 09:30–10:30 (60 min starting 30 min later)
        self._create_booking(base + timedelta(minutes=30), 60)

        # Check at 09:30 for 30 min → should see 2 concurrent at 09:30
        result = check_availability(base + timedelta(minutes=30), 30)
        self.assertTrue(result["available"])
        self.assertEqual(result["peak_concurrent"], 2)

    # ------------------------------------------------------------------ #
    # 5. No overlap → peak never > 1
    # ------------------------------------------------------------------ #
    def test_no_overlap(self):
        base = timezone.now() + timedelta(hours=5)

        # A: 09:00–10:00
        self._create_booking(base, 60)
        # B: 10:00–11:00 (starts exactly when A ends → no overlap)
        self._create_booking(base + timedelta(minutes=60), 60)

        # Check at A's time
        result = check_availability(base, 60)
        self.assertTrue(result["available"])
        self.assertEqual(result["peak_concurrent"], 1)

    # ------------------------------------------------------------------ #
    # 6. Next available suggestion works
    # ------------------------------------------------------------------ #
    def test_find_next_available(self):
        base = timezone.now() + timedelta(hours=6)
        for _ in range(MAX_CONCURRENT):
            self._create_booking(base, 60)

        next_at = find_next_available(base, 60)
        self.assertIsNotNone(next_at)
        self.assertGreater(next_at, base)

        # Verify the suggested time is actually available
        result = check_availability(next_at, 60)
        self.assertTrue(result["available"])

    # ------------------------------------------------------------------ #
    # 7. Cancelled bookings don't count
    # ------------------------------------------------------------------ #
    def test_cancelled_bookings_excluded(self):
        base = timezone.now() + timedelta(hours=7)

        # Create 7 bookings (max)
        for _ in range(MAX_CONCURRENT):
            self._create_booking(base, 60)

        # Cancel one
        booking = Booking.objects.filter(
            scheduled_start=base, status=Booking.Status.PENDING
        ).first()
        booking.status = Booking.Status.CANCELLED
        booking.save()

        # Now should be available (only 6 active)
        result = check_availability(base, 60)
        self.assertTrue(result["available"])
        self.assertEqual(result["peak_concurrent"], MAX_CONCURRENT - 1)

    # ------------------------------------------------------------------ #
    # 8. get_day_availability returns time grid
    # ------------------------------------------------------------------ #
    def test_day_availability_returns_slots(self):
        target_date = (timezone.now() + timedelta(days=2)).date()
        slots = get_day_availability(target_date, 60)

        # 24 hours * 4 (15-min increments) = 96 slots
        self.assertEqual(len(slots), 96)

        # All should be available with no bookings
        for slot in slots:
            self.assertTrue(slot["available"])
            self.assertEqual(slot["peak_concurrent"], 0)
            self.assertIn("time", slot)
            self.assertIn("datetime", slot)

    # ------------------------------------------------------------------ #
    # 8b. Day availability handles overlapping aware datetimes safely
    # ------------------------------------------------------------------ #
    def test_day_availability_with_existing_bookings(self):
        start = timezone.now().replace(hour=10, minute=0, second=0, microsecond=0) + timedelta(days=3)
        target_date = start.date()

        for _ in range(MAX_CONCURRENT):
            self._create_booking(start, 60)

        slots = get_day_availability(target_date, 60)

        self.assertEqual(len(slots), 96)
        self.assertGreater(len([slot for slot in slots if not slot["available"]]), 0)

    # ------------------------------------------------------------------ #
    # 9. Six bookings at same time → still available (under limit)
    # ------------------------------------------------------------------ #
    def test_six_concurrent_still_available(self):
        start = timezone.now() + timedelta(hours=8)
        for _ in range(MAX_CONCURRENT - 1):
            self._create_booking(start, 60)

        result = check_availability(start, 60)
        self.assertTrue(result["available"])
        self.assertEqual(result["peak_concurrent"], MAX_CONCURRENT - 1)

    # ------------------------------------------------------------------ #
    # 10. No-show bookings also excluded
    # ------------------------------------------------------------------ #
    def test_no_show_bookings_excluded(self):
        base = timezone.now() + timedelta(hours=9)
        for _ in range(MAX_CONCURRENT):
            self._create_booking(base, 60, status=Booking.Status.NO_SHOW)

        result = check_availability(base, 60)
        self.assertTrue(result["available"])
        self.assertEqual(result["peak_concurrent"], 0)


class BookingSerializerValidationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.airport = Airport.objects.create(
            name="Validation Airport",
            code="VAL",
            city="Validation City",
            address="123 Validate St",
        )
        cls.customer = CustomUser.objects.create_user(
            email="validation@test.com",
            password="Test@12345",
            full_name="Validation Customer",
            role=CustomUser.Role.CUSTOMER,
        )
        cls.vehicle = Vehicle.objects.create(
            owner=cls.customer,
            plate_number="VAL001",
            brand="Honda",
            model="City",
            vehicle_type=Vehicle.VehicleType.SEDAN,
            vehicle_size=Vehicle.VehicleSize.MEDIUM,
        )
        cls.category = ServiceCategory.objects.create(name="Validation Category", is_active=True)
        cls.service = Service.objects.create(
            category=cls.category,
            name="Validation Service",
            duration_minutes=60,
            base_price=Decimal("500.00"),
            is_active=True,
        )
        cls.parking_slot = ParkingSlot.objects.create(
            airport=cls.airport,
            slot_code="VAL-SLOT-1",
            zone_label="Zone V",
            floor=1,
            status=ParkingSlot.Status.AVAILABLE,
            price_per_hour=Decimal("100.00"),
        )
        cls.factory = APIRequestFactory()

    def _make_request(self, payload):
        request = self.factory.post("/api/v1/bookings/", payload, format="json")
        request.user = self.customer
        return request

    def test_requires_service_or_parking_selection(self):
        payload = {
            "vehicle_id": str(self.vehicle.id),
            "airport_id": str(self.airport.id),
            "scheduled_start": (timezone.now() + timedelta(hours=2)).isoformat(),
            "create_items": [],
        }
        serializer = BookingSerializer(
            data=payload,
            context={"request": self._make_request(payload)},
        )
        self.assertFalse(serializer.is_valid())
        self.assertIn("create_items", serializer.errors)

    def test_allows_parking_only_booking(self):
        scheduled_start = timezone.now() + timedelta(hours=3)
        parking_booking = ParkingBooking.objects.create(
            customer=self.customer,
            parking_slot=self.parking_slot,
            vehicle=self.vehicle,
            check_in_time=scheduled_start,
            expected_checkout=scheduled_start + timedelta(hours=2),
            total_cost=Decimal("200.00"),
            status=ParkingBooking.Status.PENDING,
        )

        payload = {
            "vehicle_id": str(self.vehicle.id),
            "airport_id": str(self.airport.id),
            "scheduled_start": scheduled_start.isoformat(),
            "parking_booking_id": str(parking_booking.id),
        }
        serializer = BookingSerializer(
            data=payload,
            context={"request": self._make_request(payload)},
        )
        self.assertTrue(serializer.is_valid(), serializer.errors)

        booking = serializer.save()
        self.assertEqual(booking.total_duration_minutes, 0)
        self.assertEqual(booking.items.count(), 0)
        self.assertEqual(booking.parking_booking_id, parking_booking.id)
