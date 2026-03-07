from django.db import models

from apps.core.models import BaseModel


class AuditLog(BaseModel):
    """Records unauthorized access attempts and security-relevant events."""

    class Action(models.TextChoices):
        UNAUTHORIZED_ACCESS = "unauthorized_access", "Unauthorized Access"
        CROSS_AIRPORT_ATTEMPT = "cross_airport_attempt", "Cross-Airport Attempt"
        SUPERVISOR_REASSIGNED = "supervisor_reassigned", "Supervisor Reassigned"

    user = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="audit_logs",
    )
    action = models.CharField(max_length=50, choices=Action.choices)
    resource_type = models.CharField(max_length=50, help_text="e.g. chat_room, booking, job_card")
    resource_id = models.CharField(max_length=100, null=True, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "audit_logs"
        ordering = ["-created_at"]

    def __str__(self):
        return f"[{self.action}] {self.user} → {self.resource_type}:{self.resource_id}"
