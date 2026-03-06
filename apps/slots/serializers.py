from rest_framework import serializers

from apps.airports.models import Airport
from apps.airports.serializers import AirportMiniSerializer
from apps.slots.models import TimeSlot


class TimeSlotSerializer(serializers.ModelSerializer):
    airport = AirportMiniSerializer(read_only=True)
    airport_id = serializers.PrimaryKeyRelatedField(
        queryset=Airport.objects.all(), source='airport', write_only=True
    )
    available_spots = serializers.ReadOnlyField()

    class Meta:
        model = TimeSlot
        fields = [
            'id', 'airport', 'airport_id', 'date', 'start_time', 'end_time',
            'slot_duration_mins', 'total_capacity', 'booked_count',
            'available_spots', 'is_available',
        ]
        read_only_fields = ['id', 'booked_count', 'is_available', 'available_spots']
