from django.db import models

from apps.core.models import BaseModel


class TimeSlot(BaseModel):
    airport = models.ForeignKey("airports.Airport", on_delete=models.CASCADE, related_name="time_slots")
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    slot_duration_mins = models.PositiveIntegerField(default=60)
    total_capacity = models.PositiveIntegerField()
    booked_count = models.PositiveIntegerField(default=0)
    is_available = models.BooleanField(default=True)

    class Meta:
        db_table = "time_slots"
        ordering = ["date", "start_time"]
        unique_together = ("airport", "date", "start_time")

    def __str__(self):
        return f"{self.airport.code} — {self.date} {self.start_time} to {self.end_time}"

    @property
    def available_spots(self):
        return max(self.total_capacity - self.booked_count, 0)

    def save(self, *args, **kwargs):
        self.is_available = self.booked_count < self.total_capacity
        super().save(*args, **kwargs)
