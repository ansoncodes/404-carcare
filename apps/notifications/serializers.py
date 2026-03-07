from apps.notifications.models import Notification
from apps.notifications.utils import get_notification_target_url
from rest_framework import serializers

class NotificationSerializer(serializers.ModelSerializer):
    target_url = serializers.SerializerMethodField()

    def get_target_url(self, obj):
        return get_notification_target_url(obj)

    class Meta:
        model  = Notification
        fields = [
            'id', 'booking', 'chat_room', 'notification_type',
            'title', 'body', 'event_data', 'target_url',
            'is_read', 'read_at', 'created_at',
        ]
        read_only_fields = fields
