from rest_framework import serializers

from apps.accounts.serializers import UserMiniSerializer
from apps.vehicles.models import Vehicle


class VehicleSerializer(serializers.ModelSerializer):
    owner = UserMiniSerializer(read_only=True)

    class Meta:
        model = Vehicle
        fields = [
            'id', 'owner', 'plate_number', 'brand', 'model',
            'color', 'year', 'vehicle_type', 'vehicle_size',
            'created_at',
        ]
        read_only_fields = ['id', 'owner', 'created_at']

    def create(self, validated_data):
        validated_data['owner'] = self.context['request'].user
        return super().create(validated_data)


class VehicleMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        fields = ['id', 'plate_number', 'brand', 'model', 'vehicle_type']
