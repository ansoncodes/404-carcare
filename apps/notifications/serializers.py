from apps.notifications.models import Notification
from rest_framework import serializers

class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Notification
        fields = [
            'id', 'booking', 'notification_type',
            'title', 'body', 'is_read', 'read_at', 'created_at',
        ]
        read_only_fields = fields
