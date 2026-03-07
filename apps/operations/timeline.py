from __future__ import annotations

from datetime import datetime, timedelta

from django.utils import timezone

from apps.bookings.models import Booking, BookingItem
from apps.operations.models import JobCard, WorkStage

CATEGORY_PRIORITY = {
    "Basic Wash Services": 10,
    "Interior Services": 20,
    "Detailing Services": 30,
    "Exterior Finishing": 40,
    "Specialty Services": 50,
    "Add-ons": 60,
}

QC_STAGE_NAME = "Quality Check"
QC_STAGE_ALIASES = {"qc", "quality check", "quality_check", "final inspection"}


def _get_estimated_completion_base(booking: Booking, job_card: JobCard) -> datetime:
    now = timezone.now()

    if booking.scheduled_start:
        slot_start = booking.scheduled_start
        if timezone.is_naive(slot_start):
            slot_start = timezone.make_aware(slot_start, timezone.get_current_timezone())
    else:
        slot_start = now

    if booking.status == Booking.Status.IN_PROGRESS:
        return job_card.started_at or now
    if booking.status in [Booking.Status.PENDING, Booking.Status.CONFIRMED]:
        return slot_start if slot_start > now else now
    return now


def sync_booking_timeline(booking: Booking) -> JobCard | None:
    booking_items = (
        BookingItem.objects.filter(booking=booking)
        .select_related("service", "service__category")
        .prefetch_related("service__stages")
    )
    if not booking_items.exists():
        return None

    stage_map: dict[str, dict] = {}
    total_estimated_service_minutes = 0

    for item in booking_items:
        service = item.service
        quantity = max(item.quantity, 1)
        total_estimated_service_minutes += int(service.duration_minutes) * quantity

        category_rank = CATEGORY_PRIORITY.get(service.category.name, 99)
        for service_stage in service.stages.all().order_by("stage_order"):
            key = service_stage.stage_name.strip().lower()
            if not key:
                continue
            ordering_key = (category_rank, service_stage.stage_order, service_stage.stage_name.lower())
            stage_minutes = int(service_stage.estimated_duration_minutes) * quantity

            if key not in stage_map:
                stage_map[key] = {
                    "stage_name": service_stage.stage_name,
                    "ordering_key": ordering_key,
                    "estimated_duration_minutes": stage_minutes,
                }
            else:
                stage_map[key]["estimated_duration_minutes"] += stage_minutes
                if ordering_key < stage_map[key]["ordering_key"]:
                    stage_map[key]["ordering_key"] = ordering_key
                    stage_map[key]["stage_name"] = service_stage.stage_name

    timeline = sorted(stage_map.values(), key=lambda row: row["ordering_key"])
    if not timeline:
        return None

    qc_index = next(
        (
            idx
            for idx, stage in enumerate(timeline)
            if stage["stage_name"].strip().lower() in QC_STAGE_ALIASES
        ),
        None,
    )
    if qc_index is not None:
        qc_stage = timeline.pop(qc_index)
        qc_stage["stage_name"] = QC_STAGE_NAME
    else:
        qc_stage = {
            "stage_name": QC_STAGE_NAME,
            "estimated_duration_minutes": 15,
        }
    timeline.append(qc_stage)

    job_card, _ = JobCard.objects.get_or_create(
        booking=booking,
        defaults={
            "airport": booking.airport,
            "status": JobCard.Status.PENDING,
            "notes": "Auto-generated from booking services.",
        },
    )

    updates = []
    if job_card.airport_id != booking.airport_id:
        job_card.airport = booking.airport
        updates.append("airport")
    job_card.total_estimated_duration_minutes = total_estimated_service_minutes
    updates.append("total_estimated_duration_minutes")
    if updates:
        updates.append("updated_at")
        job_card.save(update_fields=updates)

    WorkStage.objects.filter(job_card=job_card).delete()
    for index, stage in enumerate(timeline, start=1):
        WorkStage.objects.create(
            job_card=job_card,
            stage_name=stage["stage_name"],
            stage_order=index,
            estimated_duration_minutes=stage["estimated_duration_minutes"],
            status=WorkStage.Status.PENDING,
            notes=f"Estimated duration: {stage['estimated_duration_minutes']} min",
        )

    completion_base = _get_estimated_completion_base(booking, job_card)
    booking.estimated_completion = completion_base + timedelta(minutes=total_estimated_service_minutes)
    if not booking.current_stage:
        booking.current_stage = timeline[0]["stage_name"]
    booking.save(update_fields=["estimated_completion", "current_stage", "updated_at"])

    return job_card
