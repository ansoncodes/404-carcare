import uuid
from django.db import models


class BaseModel(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# Import so Django discovers the AuditLog model for migrations
from apps.core.audit import AuditLog  # noqa: E402, F401

