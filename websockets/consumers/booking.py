import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db                import database_sync_to_async


class BookingProgressConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.booking_id = self.scope['url_route']['kwargs']['booking_id']
        self.group_name = f'booking_{self.booking_id}'
        user            = self.scope['user']

        # reject unauthenticated connections
        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        # only the booking's customer, a supervisor, or admin can connect
        allowed = await self.can_access(user, self.booking_id)
        if not allowed:
            await self.close(code=4003)
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # send current progress on connect
        progress = await self.get_progress(self.booking_id)
        await self.send(text_data=json.dumps({
            'type':                'progress_update',
            'booking_id':          self.booking_id,
            'current_stage':       progress['current_stage'],
            'progress_percentage': progress['progress_percentage'],
            'status':              progress['status'],
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # receive broadcast from Django signal (sent via channel layer)
    async def progress_update(self, event):
        await self.send(text_data=json.dumps({
            'type':                'progress_update',
            'booking_id':          event['booking_id'],
            'current_stage':       event['current_stage'],
            'progress_percentage': event['progress_percentage'],
            'status':              event['status'],
        }))

    @database_sync_to_async
    def get_progress(self, booking_id):
        from apps.bookings.models import Booking
        try:
            b = Booking.objects.get(id=booking_id)
            return {
                'current_stage':       b.current_stage,
                'progress_percentage': b.progress_percentage,
                'status':              b.status,
            }
        except Booking.DoesNotExist:
            return {'current_stage': None, 'progress_percentage': 0, 'status': 'unknown'}

    @database_sync_to_async
    def can_access(self, user, booking_id):
        from apps.bookings.models import Booking
        try:
            booking = Booking.objects.get(id=booking_id)
            if user.is_admin:
                return True
            if user.is_supervisor and booking.airport == user.airport:
                return True
            if booking.customer == user:
                return True
            return False
        except Booking.DoesNotExist:
            return False
