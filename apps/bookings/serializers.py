from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.accounts.models import CustomUser
from apps.accounts.serializers import UserMiniSerializer
from apps.airports.models import Airport
from apps.airports.serializers import AirportMiniSerializer
from apps.bookings.availability import check_availability
from apps.bookings.models import Booking, BookingItem
from apps.parking.models import ParkingBooking
from apps.parking.serializers import ParkingBookingSerializer
from apps.operations.timeline import sync_booking_timeline
from apps.services.models import Service
from apps.services.serializers import ServiceMiniSerializer
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


class BookingCreateItemSerializer(serializers.Serializer):
    service_id = serializers.PrimaryKeyRelatedField(queryset=Service.objects.all())
    quantity = serializers.IntegerField(min_value=1, default=1)


class BookingSerializer(serializers.ModelSerializer):
    customer = UserMiniSerializer(read_only=True)
    vehicle = VehicleMiniSerializer(read_only=True)
    airport = AirportMiniSerializer(read_only=True)
    supervisor = UserMiniSerializer(read_only=True)
    items = BookingItemSerializer(many=True, read_only=True)
    parking_booking = ParkingBookingSerializer(read_only=True)

    vehicle_id = serializers.PrimaryKeyRelatedField(
        queryset=Vehicle.objects.all(), source='vehicle', write_only=True
    )
    airport_id = serializers.PrimaryKeyRelatedField(
        queryset=Airport.objects.all(), source='airport', write_only=True
    )
    parking_booking_id = serializers.PrimaryKeyRelatedField(
        queryset=ParkingBooking.objects.all(),
        source='parking_booking',
        write_only=True,
        required=False,
        allow_null=True,
    )
    create_items = BookingCreateItemSerializer(many=True, write_only=True, required=False)

    class Meta:
        model = Booking
        fields = [
            'id', 'customer', 'vehicle', 'vehicle_id',
            'airport', 'airport_id', 'supervisor',
            'scheduled_start', 'scheduled_end', 'total_duration_minutes',
            'parking_booking', 'parking_booking_id',
            'booking_reference', 'status',
            'progress_percentage', 'current_stage',
            'estimated_completion', 'special_instructions',
            'total_estimated_cost', 'total_final_cost',
            'items', 'created_at', 'create_items',
        ]
        read_only_fields = [
            'id', 'customer', 'booking_reference', 'status',
            'progress_percentage', 'current_stage',
            'scheduled_end', 'total_duration_minutes',
            'total_final_cost', 'created_at',
        ]

    def validate_vehicle_id(self, vehicle):
        user = self.context['request'].user
        if vehicle.owner != user:
            raise serializers.ValidationError('This vehicle does not belong to you.')
        return vehicle

    def validate(self, attrs):
        scheduled_start = attrs.get('scheduled_start')
        create_items = attrs.get('create_items', [])
        parking_booking = attrs.get('parking_booking')

        if not scheduled_start:
            raise serializers.ValidationError({'scheduled_start': 'A scheduled start time is required.'})

        if timezone.is_naive(scheduled_start):
            scheduled_start = timezone.make_aware(scheduled_start, timezone.get_current_timezone())
            attrs['scheduled_start'] = scheduled_start

        if scheduled_start < timezone.now():
            raise serializers.ValidationError({'scheduled_start': 'Past date/time is not allowed.'})

        if not create_items and not parking_booking:
            raise serializers.ValidationError(
                {'create_items': 'Select at least one service or choose a parking slot.'}
            )

        # Calculate total duration from selected services
        total_duration = sum(
            item['service_id'].duration_minutes * item['quantity']
            for item in create_items
        ) if create_items else 0

        if create_items and total_duration == 0:
            raise serializers.ValidationError({'create_items': 'Total service duration cannot be zero.'})

        if total_duration > 0:
            # Check service-bay availability only when services are selected.
            result = check_availability(scheduled_start, total_duration)
            if not result['available']:
                next_at = result.get('next_available_at')
                msg = 'This time slot is fully booked.'
                if next_at:
                    msg += f' Next available: {next_at.strftime("%Y-%m-%d %H:%M")}.'
                raise serializers.ValidationError({'scheduled_start': msg})

        attrs['_total_duration'] = total_duration
        return attrs

    def create(self, validated_data):
        from decimal import Decimal

        create_items = validated_data.pop('create_items', [])
        total_duration = validated_data.pop('_total_duration')

        with transaction.atomic():
            validated_data['customer'] = self.context['request'].user
            validated_data['total_duration_minutes'] = total_duration
            validated_data['scheduled_end'] = validated_data['scheduled_start'] + timedelta(minutes=total_duration)

            # RULE 1: Auto-assign the airport's supervisor to the booking
            airport = validated_data.get('airport')
            if airport and not validated_data.get('supervisor'):
                supervisor = CustomUser.objects.filter(
                    role=CustomUser.Role.SUPERVISOR,
                    airport=airport,
                    is_active=True,
                ).first()
                if supervisor:
                    validated_data['supervisor'] = supervisor

            booking = super().create(validated_data)

            # Create inline items and calculate total cost
            total = Decimal('0.00')
            for item_data in create_items:
                service = item_data['service_id']
                quantity = item_data['quantity']
                unit_price = service.base_price
                item_total = unit_price * quantity
                BookingItem.objects.create(
                    booking=booking,
                    service=service,
                    quantity=quantity,
                    unit_price=unit_price,
                    total_price=item_total,
                )
                total += item_total

            parking_total = booking.parking_booking.total_cost if booking.parking_booking else Decimal('0.00')
            estimated_total = total + (parking_total or Decimal('0.00'))
            if estimated_total > 0:
                booking.total_estimated_cost = estimated_total
                booking.save(update_fields=['total_estimated_cost'])

            sync_booking_timeline(booking)
            return booking


class BookingListSerializer(serializers.ModelSerializer):
    customer = UserMiniSerializer(read_only=True)
    vehicle = VehicleMiniSerializer(read_only=True)
    airport = AirportMiniSerializer(read_only=True)

    class Meta:
        model = Booking
        fields = [
            'id', 'booking_reference', 'customer', 'vehicle', 'airport',
            'status', 'current_stage', 'progress_percentage',
            'scheduled_start', 'scheduled_end', 'total_duration_minutes',
            'created_at',
        ]
