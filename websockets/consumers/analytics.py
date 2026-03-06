import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db                import database_sync_to_async


class AnalyticsDashboardConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.group_name = None
        user = self.scope['user']

        if not user or not user.is_authenticated:
            await self.close(code=4001)
            return

        if not user.is_admin:
            await self.close(code=4003)
            return

        self.group_name = 'analytics_dashboard'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # push current snapshot on connect
        snapshot = await self.get_snapshot()
        await self.send(text_data=json.dumps({
            'type': 'dashboard_update',
            **snapshot,
        }))

    async def disconnect(self, close_code):
        if self.group_name:
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    # broadcast handler — called when Django signal fires
    async def dashboard_update(self, event):
        await self.send(text_data=json.dumps({
            'type':              'dashboard_update',
            'total_bookings':    event['total_bookings'],
            'active_jobs':       event['active_jobs'],
            'today_revenue':     event['today_revenue'],
            'total_revenue':     event['total_revenue'],
            'pending_payments':  event['pending_payments'],
        }))

    @database_sync_to_async
    def get_snapshot(self):
        from django.db.models import Sum
        from django.utils     import timezone
        from apps.bookings.models  import Booking
        from apps.payments.models  import Payment
        from apps.operations.models import JobCard

        today = timezone.now().date()
        return {
            'total_bookings':   Booking.objects.count(),
            'active_jobs':      JobCard.objects.filter(status='active').count(),
            'today_revenue':    str(
                Payment.objects.filter(status='paid', paid_at__date=today)
                .aggregate(t=Sum('total_amount'))['t'] or 0
            ),
            'total_revenue':    str(
                Payment.objects.filter(status='paid')
                .aggregate(t=Sum('total_amount'))['t'] or 0
            ),
            'pending_payments': Payment.objects.filter(status='pending').count(),
        }
