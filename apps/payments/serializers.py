from rest_framework import serializers

from apps.accounts.serializers import UserMiniSerializer
from apps.bookings.serializers import BookingListSerializer
from apps.payments.models import Payment


class PaymentSerializer(serializers.ModelSerializer):
    customer = UserMiniSerializer(read_only=True)
    booking = BookingListSerializer(read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id', 'booking', 'customer', 'invoice_number',
            'subtotal', 'tax_amount', 'discount', 'total_amount',
            'payment_method', 'transaction_id', 'status', 'paid_at',
            'created_at',
        ]
        read_only_fields = [
            'id', 'customer', 'invoice_number',
            'tax_amount', 'total_amount', 'created_at',
        ]


class MockPaymentSerializer(serializers.Serializer):
    """Used for POST /api/v1/payments/mock/."""

    booking_id = serializers.UUIDField()
    payment_method = serializers.ChoiceField(choices=Payment.PaymentMethod.choices)
