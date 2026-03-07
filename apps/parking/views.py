from decimal import Decimal

from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.utils import timezone

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

    @action(detail=True, methods=["post"], url_path="extend-hours")
    def extend_hours(self, request, pk=None):
        booking = self.get_object()
        if booking.customer_id != request.user.id and not (request.user.is_admin or request.user.is_supervisor):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        if booking.status in [ParkingBooking.Status.COMPLETED, ParkingBooking.Status.CANCELLED]:
            return Response({"detail": f"Cannot extend a {booking.status} booking."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            additional_hours = int(request.data.get("additional_hours", 0))
        except (TypeError, ValueError):
            additional_hours = 0
        if additional_hours < 1:
            return Response({"detail": "additional_hours must be >= 1."}, status=status.HTTP_400_BAD_REQUEST)

        booking.add_hours(additional_hours)
        booking.save(update_fields=["expected_checkout", "total_cost", "updated_at"])
        return Response(ParkingBookingSerializer(booking).data)

    @action(detail=True, methods=["post"], url_path="checkout")
    def checkout(self, request, pk=None):
        booking = self.get_object()
        if booking.customer_id != request.user.id and not (request.user.is_admin or request.user.is_supervisor):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        if booking.status in [ParkingBooking.Status.COMPLETED, ParkingBooking.Status.CANCELLED]:
            return Response({"detail": f"Cannot checkout a {booking.status} booking."}, status=status.HTTP_400_BAD_REQUEST)

        checkout_time = timezone.now()
        previous_total = booking.total_cost or Decimal("0.00")
        booking.apply_overstay_fee(checkout_time=checkout_time)
        overstay_fee = (booking.total_cost or Decimal("0.00")) - previous_total
        booking.check_out_time = checkout_time
        booking.status = ParkingBooking.Status.COMPLETED
        booking.save(update_fields=["check_out_time", "status", "total_cost", "updated_at"])
        return Response(
            {
                "detail": "Parking checkout completed.",
                "overstay_fee": str(overstay_fee),
                "parking_booking": ParkingBookingSerializer(booking).data,
            }
        )

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
