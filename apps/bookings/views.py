from django.db import transaction
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.bookings.models import Booking, BookingItem
from apps.bookings.serializers import BookingItemSerializer, BookingListSerializer, BookingSerializer


class BookingViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return BookingListSerializer
        return BookingSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = Booking.objects.select_related("customer", "vehicle", "airport", "time_slot").prefetch_related("items").order_by("-created_at")
        if user.is_admin:
            return queryset
        if user.is_supervisor:
            return queryset.filter(airport=user.airport)
        return queryset.filter(customer=user)

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

            slot = booking.time_slot
            if slot.booked_count > 0:
                slot.booked_count -= 1
                slot.save()

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
            return Response({"detail": "Items added successfully."})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

