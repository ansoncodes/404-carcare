import logging

from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.db.models import Sum
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

logger = logging.getLogger(__name__)


def _safe_group_send(group_name, payload):
    channel_layer = get_channel_layer()
    if channel_layer is None:
        return
    try:
        async_to_sync(channel_layer.group_send)(group_name, payload)
    except Exception:
        logger.warning("WebSocket group_send failed for group '%s'", group_name, exc_info=True)


@receiver(post_save, sender='bookings.Booking', dispatch_uid='ws_broadcast_booking_progress')
def broadcast_booking_progress(sender, instance, **kwargs):
    _safe_group_send(
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

    from apps.notifications.models import Notification
    from apps.notifications.utils import get_notification_target_url

    unread_count = Notification.objects.filter(recipient=instance.recipient, is_read=False).count()
    _safe_group_send(
        f'notifications_{instance.recipient.id}',
        {
            'type': 'send_notification',
            'notification_id': str(instance.id),
            'booking_id': str(instance.booking_id) if instance.booking_id else None,
            'chat_room_id': str(instance.chat_room_id) if instance.chat_room_id else None,
            'notification_type': instance.notification_type,
            'title': instance.title,
            'body': instance.body,
            'event_data': instance.event_data or {},
            'target_url': get_notification_target_url(instance),
            'created_at': instance.created_at.isoformat(),
            'unread_count': unread_count,
        },
    )


@receiver(post_save, sender='chat.Message', dispatch_uid='ws_broadcast_chat_message')
def broadcast_chat_message(sender, instance, created, **kwargs):
    if not created:
        return

    _safe_group_send(
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


@receiver(post_save, sender='bookings.Booking', dispatch_uid='auto_create_chat_room_on_confirmed')
def auto_create_chat_room(sender, instance, **kwargs):
    """Auto-create a ChatRoom when a booking is confirmed (e.g. after payment)."""
    from apps.accounts.models import CustomUser
    from apps.chat.models import ChatRoom

    if instance.status != instance.Status.CONFIRMED:
        return

    # Prefer booking supervisor, fallback to airport supervisor.
    supervisor = instance.supervisor or (
        CustomUser.objects.filter(role=CustomUser.Role.SUPERVISOR, airport=instance.airport)
        .first()
    )

    room, created = ChatRoom.objects.get_or_create(
        booking=instance,
        defaults={
            'customer': instance.customer,
            'assigned_staff': supervisor,
            'airport': instance.airport,
        },
    )
    if created:
        return

    updates = []
    if room.assigned_staff_id != (supervisor.id if supervisor else None):
        room.assigned_staff = supervisor
        updates.append('assigned_staff')
    if room.airport_id != instance.airport_id:
        room.airport = instance.airport
        updates.append('airport')
    if room.customer_id != instance.customer_id:
        room.customer = instance.customer
        updates.append('customer')
    if updates:
        room.save(update_fields=[*updates, 'updated_at'])


@receiver(post_save, sender='payments.Payment', dispatch_uid='ws_broadcast_dashboard_update_from_payment')
@receiver(post_save, sender='bookings.Booking', dispatch_uid='ws_broadcast_dashboard_update_from_booking')
def broadcast_dashboard_update(sender, instance, **kwargs):
    from apps.bookings.models import Booking
    from apps.operations.models import JobCard
    from apps.payments.models import Payment

    today = timezone.now().date()
    _safe_group_send(
        'analytics_dashboard',
        {
            'type': 'dashboard_update',
            'total_bookings': Booking.objects.count(),
            'active_jobs': JobCard.objects.filter(status='active').count(),
            'today_revenue': str(
                Payment.objects.filter(status='paid', paid_at__date=today).aggregate(t=Sum('total_amount'))['t'] or 0
            ),
            'total_revenue': str(Payment.objects.filter(status='paid').aggregate(t=Sum('total_amount'))['t'] or 0),
            'pending_payments': Payment.objects.filter(status='pending').count(),
        },
    )
