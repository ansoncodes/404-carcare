from datetime import timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from apps.accounts.models import CustomUser
from apps.airports.models import Airport
from apps.bookings.models import Booking
from apps.parking.models import ParkingBooking, ParkingSlot
from apps.vehicles.models import Vehicle


class ParkingLifecycleTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.airport = Airport.objects.create(
            name="Test Airport",
            code="TPA",
            city="Test City",
            address="123 Test St",
        )
        cls.customer = CustomUser.objects.create_user(
            email="parking@test.com",
            password="Test@12345",
            full_name="Parking Customer",
            role=CustomUser.Role.CUSTOMER,
        )
        cls.vehicle = Vehicle.objects.create(
            owner=cls.customer,
            plate_number="PARK001",
            brand="Toyota",
            model="Camry",
            vehicle_type=Vehicle.VehicleType.SEDAN,
            vehicle_size=Vehicle.VehicleSize.MEDIUM,
        )

    def _create_slot(self):
        return ParkingSlot.objects.create(
            airport=self.airport,
            slot_code=f"SLOT-{ParkingSlot.objects.count() + 1}",
            zone_label="Zone A",
            floor=1,
            status=ParkingSlot.Status.AVAILABLE,
            price_per_hour=Decimal("100.00"),
        )

    def test_pending_parking_reserves_slot(self):
        slot = self._create_slot()
        ParkingBooking.objects.create(
            customer=self.customer,
            parking_slot=slot,
            vehicle=self.vehicle,
            check_in_time=timezone.now(),
            expected_checkout=timezone.now() + timedelta(hours=2),
            total_cost=Decimal("200.00"),
            status=ParkingBooking.Status.PENDING,
        )
        slot.refresh_from_db()
        self.assertEqual(slot.status, ParkingSlot.Status.RESERVED)

    def test_booking_complete_releases_slot_and_applies_overstay_fee(self):
        slot = self._create_slot()
        parking_booking = ParkingBooking.objects.create(
            customer=self.customer,
            parking_slot=slot,
            vehicle=self.vehicle,
            check_in_time=timezone.now() - timedelta(hours=3),
            expected_checkout=timezone.now() - timedelta(hours=1),
            total_cost=Decimal("200.00"),
            status=ParkingBooking.Status.PENDING,
        )

        booking = Booking.objects.create(
            customer=self.customer,
            vehicle=self.vehicle,
            airport=self.airport,
            scheduled_start=timezone.now() - timedelta(hours=3),
            scheduled_end=timezone.now() - timedelta(hours=2),
            total_duration_minutes=60,
            parking_booking=parking_booking,
            status=Booking.Status.PENDING,
        )
        booking.status = Booking.Status.COMPLETED
        booking.save(update_fields=["status", "updated_at"])

        parking_booking.refresh_from_db()
        slot.refresh_from_db()
        self.assertEqual(parking_booking.status, ParkingBooking.Status.COMPLETED)
        self.assertEqual(slot.status, ParkingSlot.Status.AVAILABLE)
        self.assertEqual(parking_booking.total_cost, Decimal("400.00"))
