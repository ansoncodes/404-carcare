from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.airports.models import Airport
from apps.airports.serializers import AirportSerializer


class AirportViewSet(ModelViewSet):
    serializer_class = AirportSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Airport.objects.all().order_by("city", "name")
        if not self.request.user.is_admin:
            queryset = queryset.filter(is_active=True)
        return queryset

    def _ensure_admin(self):
        if not self.request.user.is_admin:
            raise PermissionDenied("Only admins can manage airports.")

    def perform_create(self, serializer):
        self._ensure_admin()
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_admin()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_admin()
        instance.is_active = False
        instance.save(update_fields=["is_active", "updated_at"])
