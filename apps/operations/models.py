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
    total_estimated_duration_minutes = models.PositiveIntegerField(default=0)
    notes = models.TextField(null=True, blank=True)
    quality_score = models.PositiveIntegerField(null=True, blank=True, help_text="1 to 5")

    class Meta:
        db_table = "job_cards"
        ordering = ["-created_at"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._initial_status = self.status

    def __str__(self):
        return f"Job {self.id} for Booking {self.booking.booking_reference} ({self.status})"


class WorkStage(BaseModel):
    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        IN_PROGRESS = "in_progress", "In Progress"
        COMPLETED = "completed", "Completed"
        SKIPPED = "skipped", "Skipped"

    job_card = models.ForeignKey(JobCard, on_delete=models.CASCADE, related_name="stages")
    stage_name = models.CharField(max_length=100)
    stage_order = models.PositiveIntegerField()
    estimated_duration_minutes = models.PositiveIntegerField(default=0)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    notes = models.TextField(null=True, blank=True)

    class Meta:
        db_table = "work_stages"
        ordering = ["job_card", "stage_order"]
        unique_together = ("job_card", "stage_name")

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._initial_status = self.status

    def __str__(self):
        return f"{self.job_card.job_number} — {self.stage_name} ({self.status})"

    def save(self, *args, **kwargs):
        from django.utils import timezone

        if self.status == self.Status.IN_PROGRESS and not self.started_at:
            self.started_at = timezone.now()
        if self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = timezone.now()
        super().save(*args, **kwargs)

        if self.status == self.Status.IN_PROGRESS:
            self.job_card.booking.current_stage = self.stage_name
            self.job_card.booking.save(update_fields=["current_stage", "updated_at"])

        if self.status in [self.Status.COMPLETED, self.Status.SKIPPED]:
            total_stages = self.job_card.stages.count()
            if total_stages > 0:
                completed_stages = self.job_card.stages.filter(
                    status__in=[self.Status.COMPLETED, self.Status.SKIPPED]
                ).count()
                percentage = int((completed_stages / total_stages) * 100)
                self.job_card.booking.update_progress(stage=self.stage_name, percentage=percentage)
