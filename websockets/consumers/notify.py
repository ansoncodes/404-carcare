import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db                import database_sync_to_async


class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        user = self.scope['user']

        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        # each user has a personal notification group
        self.group_name = f'notifications_{user.id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # send unread count on connect
        count = await self.get_unread_count(user)
        await self.send(text_data=json.dumps({
            'type':         'unread_count',
            'unread_count': count,
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # broadcast handler — called when Django signal fires
    async def send_notification(self, event):
        await self.send(text_data=json.dumps({
            'type':              'new_notification',
            'notification_id':   event['notification_id'],
            'notification_type': event['notification_type'],
            'title':             event['title'],
            'body':              event['body'],
            'unread_count':      event['unread_count'],
        }))

    @database_sync_to_async
    def get_unread_count(self, user):
        from apps.notifications.models import Notification
        return Notification.objects.filter(recipient=user, is_read=False).count()
