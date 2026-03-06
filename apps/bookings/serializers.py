from django.db import transaction
from rest_framework import serializers

from apps.accounts.serializers import UserMiniSerializer
from apps.airports.models import Airport
from apps.airports.serializers import AirportMiniSerializer
from apps.bookings.models import Booking, BookingItem
from apps.parking.models import ParkingBooking
from apps.parking.serializers import ParkingBookingSerializer
from apps.services.models import Service
from apps.services.serializers import ServiceMiniSerializer
from apps.slots.models import TimeSlot
from apps.vehicles.models import Vehicle
from apps.vehicles.serializers import VehicleMiniSerializer


class BookingItemSerializer(serializers.ModelSerializer):
    service = ServiceMiniSerializer(read_only=True)
    service_id = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.all(), source='service', write_only=True
    )

    class Meta:
        model = BookingItem
        fields = ['id', 'service', 'service_id', 'quantity', 'unit_price', 'total_price']
        read_only_fields = ['id', 'unit_price', 'total_price']


class BookingSerializer(serializers.ModelSerializer):
    customer = UserMiniSerializer(read_only=True)
    vehicle = VehicleMiniSerializer(read_only=True)
    airport = AirportMiniSerializer(read_only=True)
    items = BookingItemSerializer(many=True, read_only=True)
    parking_booking = ParkingBookingSerializer(read_only=True)

    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(), source='vehicle', write_only=True
    )
    airport_id = serializers.PrimaryKeyRelatedField(
        queryset=Airport.objects.all(), source='airport', write_only=True
    )
    time_slot_id = serializers.PrimaryKeyRelatedField(
        queryset=TimeSlot.objects.all(), source='time_slot', write_only=True
    )
    parking_booking_id = serializers.PrimaryKeyRelatedField(
        queryset=ParkingBooking.objects.all(),
        source='parking_booking',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = Booking
        fields = [
            'id', 'customer', 'vehicle', 'vehicle_id',
            'airport', 'airport_id', 'time_slot_id',
            'parking_booking', 'parking_booking_id',
            'booking_reference', 'status',
            'progress_percentage', 'current_stage',
            'estimated_completion', 'special_instructions',
            'total_estimated_cost', 'total_final_cost',
            'items', 'created_at',
        ]
        read_only_fields = [
            'id', 'customer', 'booking_reference', 'status',
            'progress_percentage', 'current_stage',
            'total_final_cost', 'created_at',
        ]

    def validate(self, attrs):
        airport = attrs.get('airport')
        slot = attrs.get('time_slot')
        if airport and slot and slot.airport_id != airport.id:
            raise serializers.ValidationError({'time_slot_id': 'Selected slot does not belong to the selected airport.'})
        return attrs

    def validate_vehicle_id(self, vehicle):
        user = self.context['request'].user
        if vehicle.owner != user:
            raise serializers.ValidationError('This vehicle does not belong to you.')
        return vehicle

    def validate_time_slot_id(self, slot):
        if not slot.is_available:
            raise serializers.ValidationError('This time slot is fully booked.')
        return slot

    def create(self, validated_data):
        with transaction.atomic():
            slot = TimeSlot.objects.select_for_update().get(pk=validated_data['time_slot'].pk)
            if (not slot.is_available) or slot.booked_count >= slot.total_capacity:
                raise serializers.ValidationError({'time_slot_id': 'This time slot is fully booked.'})

            validated_data['customer'] = self.context['request'].user
            validated_data['time_slot'] = slot
            booking = super().create(validated_data)

            slot.booked_count += 1
            slot.save()
            return booking


class BookingListSerializer(serializers.ModelSerializer):
    """Lightweight - used for list views."""

    vehicle = VehicleMiniSerializer(read_only=True)
    airport = AirportMiniSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_reference', 'vehicle', 'airport',
            'status', 'current_stage', 'progress_percentage', 'created_at',
        ]
