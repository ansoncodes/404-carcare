from django.db import transaction
from django.db.models import Sum
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.bookings.models import Booking, BookingItem
from apps.bookings.serializers import BookingItemSerializer, BookingListSerializer, BookingSerializer
from apps.core.permissions import AirportScopedMixin
from apps.operations.timeline import sync_booking_timeline


class BookingViewSet(AirportScopedMixin, ModelViewSet):
    permission_classes = [IsAuthenticated]
    airport_field = "airport"
    customer_field = "customer"

    def get_serializer_class(self):
        if self.action == "list":
            return BookingListSerializer
        return BookingSerializer

    def get_queryset(self):
        queryset = Booking.objects.select_related(
            "customer", "vehicle", "airport", "supervisor"
        ).prefetch_related("items").order_by("-created_at")
        return self.scope_queryset(queryset)

    def perform_create(self, serializer):
        serializer.save()

    @action(detail=True, methods=["post"])
    def cancel(self, request, pk=None):
        booking = self.get_object()
        if booking.customer_id != request.user.id and not request.user.is_admin:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        if booking.status in [Booking.Status.COMPLETED, Booking.Status.CANCELLED, Booking.Status.NO_SHOW]:
            return Response(
                {"detail": f"Cannot cancel a {booking.status} booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        with transaction.atomic():
            booking.status = Booking.Status.CANCELLED
            booking.save(update_fields=["status", "updated_at"])

        return Response({"detail": "Booking cancelled successfully."})

    @action(detail=True, methods=["post"], url_path="add-items")
    def add_items(self, request, pk=None):
        booking = self.get_object()
        if booking.status != Booking.Status.PENDING:
            return Response(
                {"detail": "Can only add items to a pending booking."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if booking.customer_id != request.user.id and not request.user.is_admin:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        serializer = BookingItemSerializer(data=request.data, many=True)
        if serializer.is_valid():
            with transaction.atomic():
                for item_data in serializer.validated_data:
                    service = item_data["service"]
                    BookingItem.objects.create(
                        booking=booking,
                        service=service,
                        quantity=item_data["quantity"],
                        unit_price=service.base_price,
                        total_price=service.base_price * item_data["quantity"],
                    )
                total = BookingItem.objects.filter(booking=booking).aggregate(total=Sum("total_price"))["total"] or 0
                if booking.parking_booking and booking.parking_booking.total_cost:
                    total += booking.parking_booking.total_cost
                booking.total_estimated_cost = total
                booking.save(update_fields=["total_estimated_cost", "updated_at"])
                sync_booking_timeline(booking)
            return Response({"detail": "Items added successfully."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
