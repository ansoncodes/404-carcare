from rest_framework import serializers

from apps.accounts.models import CustomUser
from apps.accounts.serializers import UserMiniSerializer
from apps.bookings.serializers import BookingListSerializer
from apps.operations.models import JobCard, WorkStage


class WorkStageSerializer(serializers.ModelSerializer):
    class Meta:
        model = WorkStage
        fields = [
            'id', 'stage_name', 'stage_order', 'status',
            'started_at', 'completed_at', 'notes',
        ]
        read_only_fields = ['id', 'started_at', 'completed_at']


class JobCardSerializer(serializers.ModelSerializer):
    supervisor = UserMiniSerializer(read_only=True)
    stages = WorkStageSerializer(many=True, read_only=True)
    booking = BookingListSerializer(read_only=True)

    supervisor_id = serializers.PrimaryKeyRelatedField(
        queryset=CustomUser.objects.filter(role='supervisor'),
        source='supervisor',
        write_only=True,
        required=False,
        allow_null=True,
    )

    class Meta:
        model = JobCard
        fields = [
            'id', 'booking', 'airport', 'supervisor', 'supervisor_id',
            'job_number', 'status', 'started_at', 'completed_at',
            'notes', 'quality_score', 'stages', 'created_at',
        ]
        read_only_fields = ['id', 'job_number', 'started_at', 'completed_at', 'created_at']
