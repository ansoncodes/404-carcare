from django.db import models

from apps.core.models import BaseModel


class Notification(BaseModel):
    class NotificationType(models.TextChoices):
        BOOKING_CONFIRMED = "booking_confirmed", "Booking Confirmed"
        BOOKING_CANCELLED = "booking_cancelled", "Booking Cancelled"
        WORK_STARTED = "work_started", "Work Started"
        STAGE_COMPLETE = "stage_complete", "Stage Completed"
        CAR_READY = "car_ready", "Car Ready for Pickup"
        PAYMENT_DUE = "payment_due", "Payment Due"
        CHAT_MESSAGE = "chat_message", "New Chat Message"
        NEW_BOOKING = "new_booking", "New Booking Received"

    recipient = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE, related_name="notifications")
    booking = models.ForeignKey("bookings.Booking", on_delete=models.CASCADE, null=True, blank=True, related_name="notifications")
    chat_room = models.ForeignKey("chat.ChatRoom", on_delete=models.SET_NULL, null=True, blank=True, related_name="notifications")
    notification_type = models.CharField(max_length=30, choices=NotificationType.choices)
    title = models.CharField(max_length=255)
    body = models.TextField()
    event_data = models.JSONField(default=dict, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "notifications"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.recipient.full_name} — {self.notification_type}"

    def mark_as_read(self):
        from django.utils import timezone

        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=["is_read", "read_at"])
