import uuid
from decimal import Decimal

from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView

from apps.bookings.models import Booking
from apps.payments.models import Payment
from apps.payments.serializers import MockPaymentSerializer, PaymentSerializer


class PaymentViewSet(ModelViewSet):
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ["get", "head", "options"]

    def get_queryset(self):
        user = self.request.user
        queryset = Payment.objects.select_related("booking", "customer").order_by("-created_at")
        if user.is_admin:
            return queryset
        return queryset.filter(customer=user)


class MockPayView(APIView):
    

    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = MockPaymentSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        booking_id = serializer.validated_data["booking_id"]
        payment_method = serializer.validated_data["payment_method"]

        try:
            booking = Booking.objects.select_related("customer", "parking_booking").get(id=booking_id, customer=request.user)
        except Booking.DoesNotExist:
            return Response({"detail": "Booking not found."}, status=status.HTTP_404_NOT_FOUND)

        existing_payment = getattr(booking, "payment", None)
        if existing_payment and existing_payment.status == Payment.Status.PAID:
            return Response({"detail": "Booking is already paid."}, status=status.HTTP_400_BAD_REQUEST)

        services_subtotal = booking.items.aggregate(total=Sum("total_price"))["total"] or Decimal("0.00")
        parking_subtotal = booking.parking_booking.total_cost if booking.parking_booking and booking.parking_booking.total_cost else Decimal("0.00")
        subtotal = services_subtotal + parking_subtotal

        with transaction.atomic():
            if existing_payment:
                payment = existing_payment
                payment.subtotal = subtotal
                payment.discount = Decimal("0.00")
                payment.payment_method = payment_method
                payment.transaction_id = f"MOCK-{uuid.uuid4().hex[:10].upper()}"
                payment.status = Payment.Status.PAID
                payment.paid_at = timezone.now()
                payment.save()
            else:
                payment = Payment.objects.create(
                    booking=booking,
                    customer=request.user,
                    subtotal=subtotal,
                    discount=Decimal("0.00"),
                    payment_method=payment_method,
                    transaction_id=f"MOCK-{uuid.uuid4().hex[:10].upper()}",
                    status=Payment.Status.PAID,
                    paid_at=timezone.now(),
                )

            if booking.status == Booking.Status.PENDING:
                booking.status = Booking.Status.CONFIRMED
                booking.save(update_fields=["status", "updated_at"])

        return Response(
            {
                "invoice_number": payment.invoice_number,
                "amount_paid": payment.total_amount,
                "transaction_id": payment.transaction_id,
                "status": payment.status,
            },
            status=status.HTTP_201_CREATED,
        )

