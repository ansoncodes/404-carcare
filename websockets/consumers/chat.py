import json

from channels.db import database_sync_to_async
from channels.generic.websocket import AsyncWebsocketConsumer


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.group_name = None
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.group_name = f'chat_{self.room_id}'
        user = self.scope['user']

        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        allowed = await self.can_access(user, self.room_id)
        if not allowed:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        user = self.scope['user']
        try:
            data = json.loads(text_data)
            content = (data.get('content') or '').strip()
            if not content:
                return
        except json.JSONDecodeError:
            return

        saved = await self.save_message(user, self.room_id, content)
        if not saved:
            await self.send(
                text_data=json.dumps(
                    {
                        'type': 'error',
                        'detail': 'Unable to save message. The room may no longer exist.',
                    }
                )
            )

    async def chat_message(self, event):
        await self.send(
            text_data=json.dumps(
                {
                    'type': 'chat_message',
                    'message_id': event['message_id'],
                    'sender_id': event['sender_id'],
                    'sender_name': event['sender_name'],
                    'sender_role': event['sender_role'],
                    'content': event['content'],
                    'message_type': event['message_type'],
                    'created_at': event['created_at'],
                }
            )
        )

    @database_sync_to_async
    def save_message(self, user, room_id, content):
        from apps.chat.models import ChatRoom, Message

        try:
            room = ChatRoom.objects.get(id=room_id)
        except ChatRoom.DoesNotExist:
            return False

        if not (user.is_admin or room.customer_id == user.id or room.assigned_staff_id == user.id):
            return False

        Message.objects.create(
            room=room,
            sender=user,
            message_type='text',
            content=content,
        )
        return True

    @database_sync_to_async
    def can_access(self, user, room_id):
        from apps.chat.models import ChatRoom

        try:
            room = ChatRoom.objects.get(id=room_id)
            if user.is_admin:
                return True
            if user.is_supervisor and room.assigned_staff_id == user.id:
                return True
            if room.customer_id == user.id:
                return True
            return False
        except ChatRoom.DoesNotExist:
            return False
