from rest_framework import serializers

from apps.services.models import Service, ServiceCategory, ServiceStage


class ServiceStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ServiceStage
        fields = [
            "id",
            "stage_name",
            "stage_order",
            "description",
            "estimated_duration_minutes",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ServiceSerializer(serializers.ModelSerializer):
    stages = ServiceStageSerializer(many=True, read_only=True)

    class Meta:
        model = Service
        fields = [
            "id",
            "category",
            "name",
            "description",
            "duration_minutes",
            "base_price",
            "is_active",
            "stages",
        ]


class ServiceMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ["id", "name", "base_price", "duration_minutes"]


class ServiceCategorySerializer(serializers.ModelSerializer):
    services = ServiceSerializer(many=True, read_only=True)

    class Meta:
        model = ServiceCategory
        fields = ["id", "name", "description", "icon", "is_active", "services"]
