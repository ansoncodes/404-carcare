"""
Centralized airport-scoping and role-based permission utilities.

Instead of writing `if user.is_admin ... elif user.is_supervisor ... else ...`
in every ViewSet, these mixins provide consistent enforcement.
"""

from rest_framework.exceptions import PermissionDenied


class AirportScopedMixin:
    """
    Mixin for ViewSets that should be scoped by the user's airport.

    Subclasses must define:
      - `airport_field`: the ORM lookup for the airport FK, e.g. "airport" or "booking__airport"
      - `customer_field`: the ORM lookup for the customer FK, e.g. "customer" or "booking__customer"

    For supervisors the queryset is filtered to their assigned airport.
    For admins the queryset is returned unfiltered.
    For customers it's filtered by the customer field.
    """

    airport_field: str = "airport"
    customer_field: str = "customer"

    def scope_queryset(self, queryset):
        """Apply airport/customer scoping to a queryset based on the current user's role."""
        user = self.request.user
        if user.is_admin:
            return queryset
        if user.is_supervisor:
            if not user.airport_id:
                return queryset.none()
            return queryset.filter(**{self.airport_field: user.airport})
        # Customer
        return queryset.filter(**{self.customer_field: user})


class AdminOnlyMixin:
    """Mixin that restricts create/update/delete to admin users only."""

    def _ensure_admin(self):
        if not self.request.user.is_admin:
            raise PermissionDenied("Only admins can perform this action.")

    def perform_create(self, serializer):
        self._ensure_admin()
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_admin()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_admin()
        instance.delete()
