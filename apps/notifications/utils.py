from apps.notifications.models import Notification


def get_notification_target_url(notification: Notification) -> str:
    data = notification.event_data or {}
    target_url = data.get("target_url")
    if isinstance(target_url, str) and target_url:
        return target_url

    if notification.notification_type == Notification.NotificationType.CHAT_MESSAGE:
        if notification.recipient.is_supervisor and notification.chat_room_id:
            return f"/supervisor/chat/{notification.chat_room_id}"
        if notification.booking_id:
            return f"/bookings/{notification.booking_id}/chat"

    if notification.recipient.is_supervisor:
        if notification.notification_type in {
            Notification.NotificationType.NEW_BOOKING,
            Notification.NotificationType.BOOKING_CANCELLED,
        }:
            return "/supervisor/job-cards"
        return "/supervisor/notifications"

    if notification.booking_id:
        return f"/bookings/{notification.booking_id}"

    return "/notifications"
