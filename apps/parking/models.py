from django.db import models

from apps.core.models import BaseModel


class ParkingSlot(BaseModel):
    class Status(models.TextChoices):
        AVAILABLE = "available", "Available"
        OCCUPIED = "occupied", "Occupied"
        RESERVED = "reserved", "Reserved"
        MAINTENANCE = "maintenance", "Maintenance"

    airport = models.ForeignKey("airports.Airport", on_delete=models.CASCADE, related_name="parking_slots")
    slot_code = models.CharField(max_length=10, help_text="e.g. A1, B2, C3")
    zone_label = models.CharField(max_length=50, default="Zone A", help_text="e.g. Zone A, Zone B, VIP")
    floor = models.IntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.AVAILABLE)
    price_per_hour = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    class Meta:
        db_table = "parking_slots"
        ordering = ["airport", "zone_label", "slot_code"]
        unique_together = ("airport", "slot_code")

    def __str__(self):
        return f"{self.airport.code} — {self.zone_label} — Slot {self.slot_code} ({self.status})"

    @property
    def is_available(self):
        return self.status == self.Status.AVAILABLE


class ParkingBooking(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"

    customer = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE, related_name="parking_bookings")
    parking_slot = models.ForeignKey(ParkingSlot, on_delete=models.CASCADE, related_name="bookings")
    vehicle = models.ForeignKey("vehicles.Vehicle", on_delete=models.CASCADE, related_name="parking_bookings")
    booking_reference = models.CharField(max_length=20, unique=True)
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)
    expected_checkout = models.DateTimeField(null=True, blank=True)
    total_cost = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "parking_bookings"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.booking_reference} — {self.customer.full_name} ({self.status})"

    def save(self, *args, **kwargs):
        if self.status == self.Status.ACTIVE:
            self.parking_slot.status = ParkingSlot.Status.OCCUPIED
            self.parking_slot.save()
        elif self.status in [self.Status.COMPLETED, self.Status.CANCELLED]:
            self.parking_slot.status = ParkingSlot.Status.AVAILABLE
            self.parking_slot.save()
        super().save(*args, **kwargs)
