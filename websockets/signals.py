from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Sum
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone


def _get_channel_layer():
    return get_channel_layer()


@receiver(post_save, sender='bookings.Booking', dispatch_uid='ws_broadcast_booking_progress')
def broadcast_booking_progress(sender, instance, **kwargs):
    channel_layer = _get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        f'booking_{instance.id}',
        {
            'type': 'progress_update',
            'booking_id': str(instance.id),
            'current_stage': instance.current_stage,
            'progress_percentage': instance.progress_percentage,
            'status': instance.status,
        },
    )


@receiver(post_save, sender='notifications.Notification', dispatch_uid='ws_broadcast_notification')
def broadcast_notification(sender, instance, created, **kwargs):
    if not created:
        return

    channel_layer = _get_channel_layer()
    if channel_layer is None:
        return

    from apps.notifications.models import Notification

    unread_count = Notification.objects.filter(recipient=instance.recipient, is_read=False).count()
    async_to_sync(channel_layer.group_send)(
        f'notifications_{instance.recipient.id}',
        {
            'type': 'send_notification',
            'notification_id': str(instance.id),
            'notification_type': instance.notification_type,
            'title': instance.title,
            'body': instance.body,
            'unread_count': unread_count,
        },
    )


@receiver(post_save, sender='chat.Message', dispatch_uid='ws_broadcast_chat_message')
def broadcast_chat_message(sender, instance, created, **kwargs):
    if not created:
        return

    channel_layer = _get_channel_layer()
    if channel_layer is None:
        return

    async_to_sync(channel_layer.group_send)(
        f'chat_{instance.room_id}',
        {
            'type': 'chat_message',
            'message_id': str(instance.id),
            'sender_id': str(instance.sender_id),
            'sender_name': instance.sender.full_name,
            'sender_role': instance.sender.role,
            'content': instance.content or '',
            'message_type': instance.message_type,
            'created_at': instance.created_at.isoformat(),
        },
    )


@receiver(post_save, sender='payments.Payment', dispatch_uid='ws_broadcast_dashboard_update_from_payment')
@receiver(post_save, sender='bookings.Booking', dispatch_uid='ws_broadcast_dashboard_update_from_booking')
def broadcast_dashboard_update(sender, instance, **kwargs):
    channel_layer = _get_channel_layer()
    if channel_layer is None:
        return

    from apps.bookings.models import Booking
    from apps.operations.models import JobCard
    from apps.payments.models import Payment

    today = timezone.now().date()
    async_to_sync(channel_layer.group_send)(
        'analytics_dashboard',
        {
            'type': 'dashboard_update',
            'total_bookings': Booking.objects.count(),
            'active_jobs': JobCard.objects.filter(status='active').count(),
            'today_revenue': str(
                Payment.objects.filter(status='paid', paid_at__date=today).aggregate(t=Sum('total_amount'))['t'] or 0
            ),
            'total_revenue': str(
                Payment.objects.filter(status='paid').aggregate(t=Sum('total_amount'))['t'] or 0
            ),
            'pending_payments': Payment.objects.filter(status='pending').count(),
        },
    )
