from django.db import models

from apps.core.models import BaseModel


class Airport(BaseModel):
    name      = models.CharField(max_length=255)
    code      = models.CharField(max_length=10, unique=True, help_text='e.g. BLR, MAA, DEL')
    city      = models.CharField(max_length=100)
    address   = models.TextField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'airports'
        ordering = ['city', 'name']

    def __str__(self):
        return f'{self.name} ({self.code})'
