from django.db import models

from apps.core.models import BaseModel


class ServiceCategory(BaseModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(null=True, blank=True)
    icon = models.CharField(max_length=100, null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "service_categories"
        ordering = ["name"]

    def __str__(self):
        return self.name


class Service(BaseModel):
    category = models.ForeignKey(ServiceCategory, on_delete=models.CASCADE, related_name="services")
    name = models.CharField(max_length=255)
    description = models.TextField(null=True, blank=True)
    duration_minutes = models.PositiveIntegerField()
    base_price = models.DecimalField(max_digits=10, decimal_places=2)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = "services"
        ordering = ["category", "name"]

    def __str__(self):
        return f"{self.category.name} → {self.name} (₹{self.base_price})"


class ServiceStage(BaseModel):
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name="stages")
    stage_name = models.CharField(max_length=100)
    stage_order = models.PositiveIntegerField()
    description = models.TextField(null=True, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField()

    class Meta:
        db_table = "service_stages"
        ordering = ["service", "stage_order"]
        unique_together = (("service", "stage_order"), ("service", "stage_name"))

    def __str__(self):
        return f"{self.service.name} — {self.stage_order}. {self.stage_name}"
