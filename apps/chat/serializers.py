from rest_framework import serializers

from apps.accounts.serializers import UserMiniSerializer
from apps.bookings.serializers import BookingListSerializer
from apps.chat.models import ChatRoom, Message


class MessageSerializer(serializers.ModelSerializer):
    sender = UserMiniSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'room', 'sender', 'message_type',
            'content', 'file_url', 'is_read', 'read_at', 'created_at',
        ]
        read_only_fields = ['id', 'sender', 'is_read', 'read_at', 'created_at']

    def create(self, validated_data):
        validated_data['sender'] = self.context['request'].user
        return super().create(validated_data)


class ChatRoomSerializer(serializers.ModelSerializer):
    customer = UserMiniSerializer(read_only=True)
    assigned_staff = UserMiniSerializer(read_only=True)
    messages = MessageSerializer(many=True, read_only=True)
    booking = BookingListSerializer(read_only=True)

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'booking', 'customer', 'assigned_staff',
            'status', 'last_message_at', 'messages',
        ]
        read_only_fields = ['id', 'customer', 'last_message_at']


class ChatRoomListSerializer(serializers.ModelSerializer):
    

    customer = UserMiniSerializer(read_only=True)
    assigned_staff = UserMiniSerializer(read_only=True)

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'booking', 'customer', 'assigned_staff',
            'status', 'last_message_at',
        ]

