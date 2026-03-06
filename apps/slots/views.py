from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.slots.models import TimeSlot
from apps.slots.serializers import TimeSlotSerializer


class TimeSlotViewSet(ModelViewSet):
    serializer_class = TimeSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = TimeSlot.objects.select_related("airport").order_by("date", "start_time")
        if not self.request.user.is_admin:
            queryset = queryset.filter(is_available=True)

        airport = self.request.query_params.get("airport")
        date = self.request.query_params.get("date")
        if airport:
            queryset = queryset.filter(airport_id=airport)
        if date:
            queryset = queryset.filter(date=date)
        return queryset

    def _ensure_admin(self):
        if not self.request.user.is_admin:
            raise PermissionDenied("Only admins can manage time slots.")

    def perform_create(self, serializer):
        self._ensure_admin()
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_admin()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_admin()
        instance.delete()
