from decimal import Decimal

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from apps.bookings.models import Booking
from apps.parking.models import ParkingBooking


@receiver(post_save, sender=Booking, dispatch_uid="parking_auto_release_on_booking_status_change")
def parking_auto_release_on_booking_status_change(sender, instance, **kwargs):
    parking_booking = instance.parking_booking
    if not parking_booking:
        return

    if parking_booking.status in [ParkingBooking.Status.COMPLETED, ParkingBooking.Status.CANCELLED]:
        return

    if instance.status == Booking.Status.CANCELLED:
        parking_booking.status = ParkingBooking.Status.CANCELLED
        parking_booking.save(update_fields=["status", "updated_at"])
        return

    if instance.status not in [Booking.Status.COMPLETED, Booking.Status.NO_SHOW]:
        return

    checkout_time = timezone.now()
    previous_total = parking_booking.total_cost or Decimal("0.00")
    parking_booking.apply_overstay_fee(checkout_time=checkout_time)
    if parking_booking.total_cost is None:
        parking_booking.total_cost = previous_total
    parking_booking.check_out_time = checkout_time
    parking_booking.status = ParkingBooking.Status.COMPLETED
    parking_booking.save(update_fields=["check_out_time", "status", "total_cost", "updated_at"])
