from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.viewsets import ModelViewSet

from apps.services.models import Service, ServiceCategory
from apps.services.serializers import ServiceCategorySerializer, ServiceSerializer


class ServiceCategoryViewSet(ModelViewSet):
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ServiceCategory.objects.prefetch_related("services").order_by("name")
        if not self.request.user.is_admin:
            queryset = queryset.filter(is_active=True)
        return queryset

    def _ensure_admin(self):
        if not self.request.user.is_admin:
            raise PermissionDenied("Only admins can manage service categories.")

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


class ServiceViewSet(ModelViewSet):
    serializer_class = ServiceSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = Service.objects.select_related("category").order_by("category__name", "name")
        if not self.request.user.is_admin:
            queryset = queryset.filter(is_active=True)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category_id=category)
        return queryset

    def _ensure_admin(self):
        if not self.request.user.is_admin:
            raise PermissionDenied("Only admins can manage services.")

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
