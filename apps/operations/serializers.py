from django.core.exceptions import ObjectDoesNotExist
from rest_framework import serializers

from apps.accounts.models import CustomUser
from apps.accounts.serializers import UserMiniSerializer
from apps.bookings.serializers import BookingListSerializer
from apps.operations.models import JobCard, WorkStage


class WorkStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkStage
        fields = [
            "id",
            "stage_name",
            "stage_order",
            "status",
            "estimated_duration_minutes",
            "started_at",
            "completed_at",
            "notes",
        ]
        read_only_fields = ["id", "started_at", "completed_at"]


class JobCardSerializer(serializers.ModelSerializer):
    supervisor = UserMiniSerializer(read_only=True)
    stages = WorkStageSerializer(many=True, read_only=True)
    booking = BookingListSerializer(read_only=True)
    chat_room_id = serializers.SerializerMethodField()
    booking_estimated_completion = serializers.DateTimeField(source="booking.estimated_completion", read_only=True)
    services = serializers.SerializerMethodField()

    supervisor_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role="supervisor"),
        source="supervisor",
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = JobCard
        fields = [
            "id",
            "booking",
            "airport",
            "supervisor",
            "supervisor_id",
            "job_number",
            "status",
            "started_at",
            "completed_at",
            "total_estimated_duration_minutes",
            "booking_estimated_completion",
            "notes",
            "quality_score",
            "chat_room_id",
            "services",
            "stages",
            "created_at",
        ]
        read_only_fields = ["id", "job_number", "started_at", "completed_at", "created_at"]

    def get_chat_room_id(self, obj):
        try:
            return str(obj.booking.chat_room.id)
        except ObjectDoesNotExist:
            return None

    def get_services(self, obj):
        return list(
            obj.booking.items.select_related("service")
            .order_by("service__name")
            .values_list("service__name", flat=True)
            .distinct()
        )
