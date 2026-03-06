from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.vehicles.models import Vehicle
from apps.vehicles.serializers import VehicleSerializer


class VehicleViewSet(ModelViewSet):
    serializer_class = VehicleSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Vehicle.objects.select_related("owner").all().order_by("-created_at")
        if user.is_admin:
            return queryset
        return queryset.filter(owner=user)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    def perform_update(self, serializer):
        instance = self.get_object()
        if not (self.request.user.is_admin or instance.owner_id == self.request.user.id):
            raise PermissionDenied("You cannot update this vehicle.")
        serializer.save()

    def perform_destroy(self, instance):
        if not (self.request.user.is_admin or instance.owner_id == self.request.user.id):
            raise PermissionDenied("You cannot delete this vehicle.")
        instance.delete()
