from django.db import models

from apps.core.models import BaseModel


class Vehicle(BaseModel):
    class VehicleType(models.TextChoices):
        SEDAN = "sedan", "Sedan"
        SUV = "suv", "SUV"
        HATCHBACK = "hatchback", "Hatchback"
        TRUCK = "truck", "Truck"
        VAN = "van", "Van"

    class VehicleSize(models.TextChoices):
        SMALL = "small", "Small"
        MEDIUM = "medium", "Medium"
        LARGE = "large", "Large"
        XL = "xl", "XL"

    owner = models.ForeignKey("accounts.CustomUser", on_delete=models.CASCADE, related_name="vehicles")
    plate_number = models.CharField(max_length=20, unique=True)
    brand = models.CharField(max_length=100, null=True, blank=True)
    model = models.CharField(max_length=100, null=True, blank=True)
    color = models.CharField(max_length=50, null=True, blank=True)
    year = models.PositiveIntegerField(null=True, blank=True)
    vehicle_type = models.CharField(max_length=20, choices=VehicleType.choices, null=True, blank=True)
    vehicle_size = models.CharField(max_length=10, choices=VehicleSize.choices, null=True, blank=True)

    class Meta:
        db_table = "vehicles"
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.plate_number} — {self.brand} {self.model}"
