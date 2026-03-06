from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.parking.models import ParkingBooking, ParkingSlot
from apps.parking.serializers import ParkingBookingSerializer, ParkingSlotSerializer


class ParkingSlotViewSet(ModelViewSet):
    serializer_class = ParkingSlotSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = ParkingSlot.objects.select_related("airport").all().order_by("airport__code", "zone_label", "slot_code")
        airport = self.request.query_params.get("airport")
        if airport:
            queryset = queryset.filter(airport_id=airport)
        if self.action == "list":
            queryset = queryset.filter(status=ParkingSlot.Status.AVAILABLE)
        return queryset

    def _ensure_admin(self):
        if not self.request.user.is_admin:
            raise PermissionDenied("Only admins can manage parking slots.")

    def perform_create(self, serializer):
        self._ensure_admin()
        serializer.save()

    def perform_update(self, serializer):
        self._ensure_admin()
        serializer.save()

    def perform_destroy(self, instance):
        self._ensure_admin()
        instance.delete()


class ParkingBookingViewSet(ModelViewSet):
    serializer_class = ParkingBookingSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = ParkingBooking.objects.select_related("customer", "vehicle", "parking_slot", "parking_slot__airport").order_by("-created_at")
        if user.is_admin:
            return queryset
        if user.is_supervisor:
            return queryset.filter(parking_slot__airport=user.airport)
        return queryset.filter(customer=user)

    def perform_create(self, serializer):
        if not self.request.user.is_customer:
            raise PermissionDenied("Only customers can create parking bookings.")
        serializer.save(customer=self.request.user)

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.customer_id != request.user.id and not request.user.is_admin:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        if booking.status in [ParkingBooking.Status.COMPLETED, ParkingBooking.Status.CANCELLED]:
            return Response(
                {"detail": f"Cannot cancel a {booking.status} booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        booking.status = ParkingBooking.Status.CANCELLED
        booking.save()
        return Response({"detail": "Parking booking cancelled."})
