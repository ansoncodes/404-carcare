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
        queryset=Airport.objects.all(), source='airport', write_only=True
    )
    is_available = serializers.ReadOnlyField()

    class Meta:
        model = ParkingSlot
        fields = [
            'id', 'airport', 'airport_id', 'slot_code', 'zone_label',
            'floor', 'status', 'price_per_hour', 'is_available',
        ]
        read_only_fields = ['id', 'is_available']


class ParkingBookingSerializer(serializers.ModelSerializer):
    customer = UserMiniSerializer(read_only=True)
    parking_slot = ParkingSlotSerializer(read_only=True)
    vehicle = VehicleMiniSerializer(read_only=True)

    parking_slot_id = serializers.PrimaryKeyRelatedField(
        queryset=ParkingSlot.objects.all(), source='parking_slot', write_only=True
    )
    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(), source='vehicle', write_only=True
    )

    class Meta:
        model = ParkingBooking
        fields = [
            'id', 'customer', 'parking_slot', 'parking_slot_id',
            'vehicle', 'vehicle_id', 'booking_reference',
            'check_in_time', 'check_out_time', 'expected_checkout',
            'total_cost', 'status', 'notes', 'created_at',
        ]
        read_only_fields = ['id', 'customer', 'booking_reference', 'created_at']

    def validate_parking_slot_id(self, slot):
        if not slot.is_available:
            raise serializers.ValidationError('This parking slot is not available.')
        return slot

    def create(self, validated_data):
        validated_data['customer'] = self.context['request'].user
        return super().create(validated_data)
