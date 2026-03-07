from datetime import timedelta
from decimal import Decimal

from django.utils import timezone
from rest_framework import serializers

from apps.accounts.serializers import UserMiniSerializer
from apps.airports.models import Airport
from apps.airports.serializers import AirportMiniSerializer
from apps.parking.models import ParkingBooking, ParkingSlot
from apps.vehicles.models import Vehicle
from apps.vehicles.serializers import VehicleMiniSerializer


class ParkingSlotSerializer(serializers.ModelSerializer):
    airport = AirportMiniSerializer(read_only=True)
    airport_id = serializers.PrimaryKeyRelatedField(
        queryset=Airport.objects.all(), source="airport", write_only=True
    )
    is_available = serializers.ReadOnlyField()

    class Meta:
        model = ParkingSlot
        fields = [
            "id",
            "airport",
            "airport_id",
            "slot_code",
            "zone_label",
            "floor",
            "status",
            "price_per_hour",
            "is_available",
        ]
        read_only_fields = ["id", "is_available"]


class ParkingBookingSerializer(serializers.ModelSerializer):
    customer = UserMiniSerializer(read_only=True)
    parking_slot = ParkingSlotSerializer(read_only=True)
    vehicle = VehicleMiniSerializer(read_only=True)

    parking_slot_id = serializers.PrimaryKeyRelatedField(
        queryset=ParkingSlot.objects.all(), source="parking_slot", write_only=True
    )
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(), source="vehicle", write_only=True
    )
    initial_hours = serializers.IntegerField(write_only=True, required=False, min_value=1, max_value=24, default=1)

    class Meta:
        model = ParkingBooking
        fields = [
            "id",
            "customer",
            "parking_slot",
            "parking_slot_id",
            "vehicle",
            "vehicle_id",
            "booking_reference",
            "check_in_time",
            "check_out_time",
            "expected_checkout",
            "total_cost",
            "status",
            "notes",
            "created_at",
            "initial_hours",
        ]
        read_only_fields = ["id", "customer", "booking_reference", "created_at"]

    def validate_parking_slot_id(self, slot):
        if not slot.is_available:
            raise serializers.ValidationError("This parking slot is not available.")
        return slot

    def create(self, validated_data):
        initial_hours = validated_data.pop("initial_hours", 1)
        check_in_time = validated_data.get("check_in_time")
        expected_checkout = validated_data.get("expected_checkout")

        if check_in_time and timezone.is_naive(check_in_time):
            check_in_time = timezone.make_aware(check_in_time, timezone.get_current_timezone())
            validated_data["check_in_time"] = check_in_time
        check_in = check_in_time or timezone.now()
        if check_in < timezone.now() - timedelta(minutes=1):
            raise serializers.ValidationError({"check_in_time": "Past date/time is not allowed."})

        if expected_checkout and timezone.is_naive(expected_checkout):
            expected_checkout = timezone.make_aware(expected_checkout, timezone.get_current_timezone())
            validated_data["expected_checkout"] = expected_checkout

        if not expected_checkout:
            expected_checkout = check_in + timezone.timedelta(hours=initial_hours)
            validated_data["expected_checkout"] = expected_checkout
        elif expected_checkout <= check_in:
            raise serializers.ValidationError({"expected_checkout": "Expected checkout must be after check-in."})

        slot = validated_data["parking_slot"]
        validated_data["customer"] = self.context["request"].user
        validated_data["total_cost"] = (slot.price_per_hour or Decimal("0.00")) * Decimal(initial_hours)
        validated_data["status"] = ParkingBooking.Status.PENDING
        return super().create(validated_data)
