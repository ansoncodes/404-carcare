from django.db.models.signals import post_save
from django.dispatch import receiver

from apps.bookings.models import Booking
from apps.chat.models import Message
from apps.notifications.models import Notification
from apps.operations.models import JobCard, WorkStage


def _message_preview(content: str | None, max_len: int = 90) -> str:
    if not content:
        return "New message received."
    normalized = " ".join(content.split())
    if len(normalized) <= max_len:
        return normalized
    return f"{normalized[: max_len - 3]}..."


@receiver(post_save, sender=Booking)
def notify_supervisor_on_booking(sender, instance, created, **kwargs):
    """
    Sends supervisor notifications for booking assignment and cancellation.
    """
    if created and instance.supervisor:
        Notification.objects.create(
            recipient=instance.supervisor,
            booking=instance,
            notification_type=Notification.NotificationType.NEW_BOOKING,
            title="New Job Added",
            body=f"Booking {instance.booking_reference} has been assigned to you.",
            event_data={
                "action": "job_added",
                "booking_id": str(instance.id),
                "booking_reference": instance.booking_reference,
                "vehicle_plate": instance.vehicle.plate_number,
                "airport_id": str(instance.airport_id),
                "target_url": "/supervisor/job-cards",
            },
        )
        return

    if getattr(instance, "_initial_status", None) == instance.status:
        return
    if instance.status != Booking.Status.CANCELLED or not instance.supervisor:
        return

    Notification.objects.create(
        recipient=instance.supervisor,
        booking=instance,
        notification_type=Notification.NotificationType.BOOKING_CANCELLED,
        title="Booking Cancelled",
        body=f"Booking {instance.booking_reference} has been cancelled.",
        event_data={
            "action": "booking_cancelled",
            "booking_id": str(instance.id),
            "booking_reference": instance.booking_reference,
            "vehicle_plate": instance.vehicle.plate_number,
            "customer_id": str(instance.customer_id),
            "target_url": "/supervisor/job-cards",
        },
    )


@receiver(post_save, sender=JobCard)
def notify_customer_on_job_card(sender, instance, created, **kwargs):
    """
    Sends notifications to the customer when the service starts or completes.
    """
    if not created and getattr(instance, "_initial_status", None) != instance.status:
        if instance.status == JobCard.Status.ACTIVE:
            Notification.objects.create(
                recipient=instance.booking.customer,
                booking=instance.booking,
                notification_type=Notification.NotificationType.WORK_STARTED,
                title="Service Started",
                body=f"We've started working on your vehicle ({instance.booking.vehicle.plate_number}).",
                event_data={
                    "action": "job_started",
                    "booking_id": str(instance.booking_id),
                    "job_card_id": str(instance.id),
                    "job_number": instance.job_number,
                    "target_url": f"/bookings/{instance.booking_id}",
                },
            )
        elif instance.status == JobCard.Status.COMPLETED:
            Notification.objects.create(
                recipient=instance.booking.customer,
                booking=instance.booking,
                notification_type=Notification.NotificationType.CAR_READY,
                title="Car Ready for Pickup",
                body=f"Your vehicle ({instance.booking.vehicle.plate_number}) is fully serviced and ready for pickup!",
                event_data={
                    "action": "job_completed",
                    "booking_id": str(instance.booking_id),
                    "job_card_id": str(instance.id),
                    "job_number": instance.job_number,
                    "target_url": f"/bookings/{instance.booking_id}",
                },
            )


@receiver(post_save, sender=WorkStage)
def notify_customer_on_work_stage(sender, instance, created, **kwargs):
    """
    Sends notifications to the customer as stages progress.
    """
    if not created and getattr(instance, "_initial_status", None) != instance.status:
        job_card = instance.job_card
        stages = list(job_card.stages.all().order_by("stage_order"))

        if instance.status == WorkStage.Status.COMPLETED:
            Notification.objects.create(
                recipient=job_card.booking.customer,
                booking=job_card.booking,
                notification_type=Notification.NotificationType.STAGE_COMPLETE,
                title="Stage Completed",
                body=f"We've completed the '{instance.stage_name.replace('_', ' ')}' stage.",
                event_data={
                    "action": "stage_completed",
                    "booking_id": str(job_card.booking_id),
                    "job_card_id": str(job_card.id),
                    "stage_id": str(instance.id),
                    "stage_name": instance.stage_name,
                    "target_url": f"/bookings/{job_card.booking_id}",
                },
            )

        # If penultimate or ultimate stage just started.
        elif instance.status == WorkStage.Status.IN_PROGRESS and len(stages) >= 2:
            last_two_stages = [s.id for s in stages[-2:]]
            if instance.id in last_two_stages:
                # To prevent spamming, only send if they didn't just get one for the second to last.
                already_notified = getattr(job_card, "_almost_fin_notified", False)
                if not already_notified:
                    Notification.objects.create(
                        recipient=job_card.booking.customer,
                        booking=job_card.booking,
                        notification_type=Notification.NotificationType.STAGE_COMPLETE,
                        title="Almost Finished!",
                        body="Your car is in the final stages of service.",
                        event_data={
                            "action": "almost_finished",
                            "booking_id": str(job_card.booking_id),
                            "job_card_id": str(job_card.id),
                            "stage_id": str(instance.id),
                            "stage_name": instance.stage_name,
                            "target_url": f"/bookings/{job_card.booking_id}",
                        },
                    )
                    job_card._almost_fin_notified = True


@receiver(post_save, sender=Message)
def notify_on_new_message(sender, instance, created, **kwargs):
    """
    Sends notifications for new chat messages.
    """
    if not created:
        return

    room = instance.room
    booking = room.booking
    sender_user = instance.sender
    preview = _message_preview(instance.content)

    if sender_user_id := getattr(sender_user, "id", None):
        sender_id = str(sender_user_id)
    else:
        sender_id = None

    # If customer sent it, notify the assigned supervisor for this room.
    if sender_user == room.customer:
        recipient = room.assigned_staff or booking.supervisor
        if not recipient:
            return
        title = "New Message from Customer"
    else:
        recipient = booking.customer
        title = f"New Message from {sender_user.full_name}"

    target_url = f"/supervisor/chat/{room.id}" if recipient.is_supervisor else f"/bookings/{booking.id}/chat"

    Notification.objects.create(
        recipient=recipient,
        booking=booking,
        chat_room=room,
        notification_type=Notification.NotificationType.CHAT_MESSAGE,
        title=title,
        body=f"{sender_user.full_name}: {preview}",
        event_data={
            "action": "chat_message",
            "booking_id": str(booking.id),
            "booking_reference": booking.booking_reference,
            "chat_room_id": str(room.id),
            "message_id": str(instance.id),
            "sender_id": sender_id,
            "sender_name": sender_user.full_name,
            "sender_role": sender_user.role,
            "target_url": target_url,
        },
    )
