from django.db import models

import uuid as _uuid

from apps.core.models import BaseModel


def generate_job_number():
    return f"JOB-{_uuid.uuid4().hex[:8].upper()}"


class JobCard(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACTIVE = "active", "Active"
        PAUSED = "paused", "Paused"
        COMPLETED = "completed", "Completed"

    booking = models.OneToOneField("bookings.Booking", on_delete=models.CASCADE, related_name="job_card")
    airport = models.ForeignKey("airports.Airport", on_delete=models.CASCADE, related_name="job_cards")
    supervisor = models.ForeignKey(
        "accounts.CustomUser",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="supervised_jobs",
        limit_choices_to={"role": "supervisor"},
    )
    job_number = models.CharField(max_length=20, unique=True, default=generate_job_number)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)
    quality_score = models.PositiveIntegerField(null=True, blank=True, help_text="1 to 5")

    class Meta:
        db_table = "job_cards"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.job_number} — {self.booking.booking_reference} ({self.status})"


class WorkStage(BaseModel):
    class StageName(models.TextChoices):
        RECEIVED = "received", "Received"
        PRE_INSPECTION = "pre_inspection", "Pre Inspection"
        WASHING = "washing", "Washing"
        DRYING = "drying", "Drying"
        DETAILING = "detailing", "Detailing"
        QUALITY_CHECK = "quality_check", "Quality Check"
        READY = "ready", "Ready for Pickup"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"

    STAGE_PROGRESS = {
        "received": 10,
        "pre_inspection": 20,
        "washing": 40,
        "drying": 55,
        "detailing": 70,
        "quality_check": 90,
        "ready": 100,
    }

    job_card = models.ForeignKey(JobCard, on_delete=models.CASCADE, related_name="stages")
    stage_name = models.CharField(max_length=20, choices=StageName.choices)
    stage_order = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "work_stages"
        ordering = ["job_card", "stage_order"]
        unique_together = ("job_card", "stage_name")

    def __str__(self):
        return f"{self.job_card.job_number} — {self.stage_name} ({self.status})"

    def save(self, *args, **kwargs):
        from django.utils import timezone

        if self.status == self.Status.IN_PROGRESS and not self.started_at:
            self.started_at = timezone.now()
        if self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
            self.job_card.booking.update_progress(
                stage=self.stage_name,
                percentage=self.STAGE_PROGRESS.get(self.stage_name, 0),
            )
        super().save(*args, **kwargs)
