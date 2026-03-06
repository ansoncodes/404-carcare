from django.db import models

from apps.core.models import BaseModel


class ChatRoom(BaseModel):
    class Status(models.TextChoices):
        ACTIVE = "active", "Active"
        CLOSED = "closed", "Closed"
        ARCHIVED = "archived", "Archived"

    booking = models.OneToOneField("bookings.Booking", on_delete=models.CASCADE, related_name="chat_room")
    customer = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE, related_name="chat_rooms_as_customer")
    assigned_staff = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="chat_rooms_as_staff",
        limit_choices_to={"role": "supervisor"},
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.ACTIVE)
    last_message_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "chat_rooms"
        ordering = ["-last_message_at"]

    def __str__(self):
        return f"Room: {self.booking.booking_reference} — {self.customer.full_name}"


class Message(BaseModel):
    class MessageType(models.TextChoices):
        TEXT = "text", "Text"
        IMAGE = "image", "Image"
        FILE = "file", "File"
        SYSTEM = "system", "System"

    room = models.ForeignKey(ChatRoom, on_delete=models.CASCADE, related_name="messages")
    sender = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE, related_name="sent_messages")
    message_type = models.CharField(max_length=10, choices=MessageType.choices, default=MessageType.TEXT)
    content = models.TextField(null=True, blank=True)
    file_url = models.URLField(null=True, blank=True)
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = "messages"
        ordering = ["created_at"]

    def __str__(self):
        return f"{self.room.booking.booking_reference} — {self.sender.full_name}: {str(self.content)[:50]}"

    def save(self, *args, **kwargs):
        from django.utils import timezone

        super().save(*args, **kwargs)
        self.room.last_message_at = timezone.now()
        self.room.save(update_fields=["last_message_at"])
