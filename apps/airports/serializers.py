from apps.airports.models import Airport
from rest_framework import serializers

class AirportSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Airport
        fields = ['id', 'name', 'code', 'city', 'address', 'is_active']


class AirportMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Airport
        fields = ['id', 'name', 'code', 'city']
