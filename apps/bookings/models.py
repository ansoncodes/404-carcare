import uuid as _uuid

from django.db import models

from apps.core.models import BaseModel


def generate_booking_reference():
    return f"BK-{_uuid.uuid4().hex[:8].upper()}"


class Booking(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        CONFIRMED = "confirmed", "Confirmed"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        NO_SHOW = "no_show", "No Show"

    class Stage(models.TextChoices):
        RECEIVED = "received", "Received"
        PRE_INSPECTION = "pre_inspection", "Pre Inspection"
        WASHING = "washing", "Washing"
        DRYING = "drying", "Drying"
        DETAILING = "detailing", "Detailing"
        QUALITY_CHECK = "quality_check", "Quality Check"
        READY = "ready", "Ready for Pickup"

    customer = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE, related_name="bookings")
    vehicle = models.ForeignKey("vehicles.Vehicle", on_delete=models.CASCADE, related_name="bookings")
    airport = models.ForeignKey("airports.Airport", on_delete=models.CASCADE, related_name="bookings")
    time_slot = models.ForeignKey("slots.TimeSlot", on_delete=models.CASCADE, related_name="bookings")
    parking_booking = models.OneToOneField(
        "parking.ParkingBooking",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="service_booking",
    )
    booking_reference = models.CharField(max_length=20, unique=True, default=generate_booking_reference)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    progress_percentage = models.PositiveIntegerField(default=0)
    current_stage = models.CharField(max_length=20, choices=Stage.choices, null=True, blank=True)
    estimated_completion = models.DateTimeField(null=True, blank=True)
    special_instructions = models.TextField(null=True, blank=True)
    total_estimated_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    total_final_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)

    class Meta:
        db_table = "bookings"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.booking_reference} — {self.customer.full_name} ({self.status})"

    def update_progress(self, stage, percentage):
        self.current_stage = stage
        self.progress_percentage = percentage
        self.save()


class BookingItem(BaseModel):
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name="items")
    service = models.ForeignKey("services.Service", on_delete=models.CASCADE, related_name="booking_items")
    quantity = models.PositiveIntegerField(default=1)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2)
    total_price = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        db_table = "booking_items"

    def __str__(self):
        return f"{self.booking.booking_reference} — {self.service.name}"

    def save(self, *args, **kwargs):
        self.total_price = self.unit_price * self.quantity
        super().save(*args, **kwargs)
