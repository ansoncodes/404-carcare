from apps.services.models import ServiceCategory, Service
from rest_framework import serializers

class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Service
        fields = [
            'id', 'category', 'name', 'description',
            'duration_minutes', 'base_price', 'is_active',
        ]


class ServiceMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Service
        fields = ['id', 'name', 'base_price', 'duration_minutes']


class ServiceCategorySerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)

    class Meta:
        model  = ServiceCategory
        fields = ['id', 'name', 'description', 'icon', 'is_active', 'services']

