"""
Overlap-based availability engine for car care bookings.

Rules:
  - MAX_CONCURRENT = 7 cars at any given moment
  - 24/7/365 operation
  - A booking occupies [scheduled_start, scheduled_end)
  - A new booking is BLOCKED only if all 7 slots are occupied
    at ANY minute during the requested window
"""

from datetime import datetime, timedelta

from django.db.models import Q
from django.utils import timezone

MAX_CONCURRENT = 7


def _as_aware(value: datetime) -> datetime:
    """Normalize a datetime to an aware value in the current timezone."""
    if timezone.is_naive(value):
        return timezone.make_aware(value, timezone.get_current_timezone())
    return timezone.localtime(value, timezone.get_current_timezone())


def _get_overlapping_bookings(start: datetime, end: datetime, exclude_booking_id=None):
    """
    Return all non-cancelled bookings that overlap with [start, end).
    Overlap condition: existing.start < end AND existing.end > start
    """
    from apps.bookings.models import Booking

    start = _as_aware(start)
    end = _as_aware(end)

    qs = Booking.objects.filter(
        scheduled_start__isnull=False,
        scheduled_end__isnull=False,
    ).exclude(
        status__in=[Booking.Status.CANCELLED, Booking.Status.NO_SHOW],
    ).filter(
        scheduled_start__lt=end,
        scheduled_end__gt=start,
    )

    if exclude_booking_id:
        qs = qs.exclude(pk=exclude_booking_id)

    return qs


def check_availability(requested_start: datetime, duration_minutes: int, exclude_booking_id=None):
    """
    Check if a booking window [requested_start, requested_start + duration] is available.

    Returns dict:
      - available (bool): True if peak concurrent < MAX_CONCURRENT
      - peak_concurrent (int): max number of cars active at any minute in the window
      - next_available_at (datetime|None): if blocked, the next available start time
    """
    requested_start = _as_aware(requested_start)
    requested_end = requested_start + timedelta(minutes=duration_minutes)

    overlapping = list(
        _get_overlapping_bookings(requested_start, requested_end, exclude_booking_id)
        .values_list("scheduled_start", "scheduled_end")
    )

    if not overlapping:
        return {
            "available": True,
            "peak_concurrent": 0,
            "next_available_at": None,
        }

    # For every minute in the requested window, count concurrent bookings
    peak = 0
    current = requested_start
    while current < requested_end:
        count = 0
        for s, e in overlapping:
            if s <= current < e:
                count += 1
        peak = max(peak, count)
        if peak >= MAX_CONCURRENT:
            break
        current += timedelta(minutes=1)

    available = peak < MAX_CONCURRENT

    result = {
        "available": available,
        "peak_concurrent": peak,
        "next_available_at": None,
    }

    if not available:
        result["next_available_at"] = find_next_available(
            requested_start, duration_minutes, exclude_booking_id
        )

    return result


def find_next_available(requested_start: datetime, duration_minutes: int, exclude_booking_id=None):
    """
    Scan forward in 15-minute increments from requested_start to find
    the next window where peak_concurrent < MAX_CONCURRENT.
    Searches up to 7 days ahead.
    """
    requested_start = _as_aware(requested_start)
    max_search = requested_start + timedelta(days=7)
    candidate = requested_start + timedelta(minutes=15)

    while candidate < max_search:
        candidate_end = candidate + timedelta(minutes=duration_minutes)

        overlapping = list(
            _get_overlapping_bookings(candidate, candidate_end, exclude_booking_id)
            .values_list("scheduled_start", "scheduled_end")
        )

        if len(overlapping) < MAX_CONCURRENT:
            # Quick check: if fewer overlapping bookings than max, it's definitely available
            return candidate

        # Full minute-by-minute scan
        peak = 0
        current = candidate
        blocked = False
        while current < candidate_end:
            count = 0
            for s, e in overlapping:
                if s <= current < e:
                    count += 1
            if count >= MAX_CONCURRENT:
                blocked = True
                break
            peak = max(peak, count)
            current += timedelta(minutes=1)

        if not blocked:
            return candidate

        candidate += timedelta(minutes=15)

    return None


def get_day_availability(date, duration_minutes: int):
    """
    Generate availability for every 15-minute increment throughout a day.

    Args:
        date: a datetime.date object
        duration_minutes: total service duration in minutes

    Returns:
        List of dicts: [{"time": "09:00", "datetime": datetime, "available": True/False, "peak_concurrent": int}, ...]
    """
    from datetime import time as dt_time

    day_start = _as_aware(datetime.combine(date, dt_time(0, 0)))
    day_end = day_start + timedelta(days=1)
    now = timezone.now()

    # Pre-fetch ALL bookings that could overlap with any slot in this day
    # A booking overlaps with the day if: booking.start < day_end + duration AND booking.end > day_start
    buffer_end = day_end + timedelta(minutes=duration_minutes)

    all_bookings = list(
        _get_overlapping_bookings(day_start, buffer_end)
        .values_list("scheduled_start", "scheduled_end")
    )

    slots = []
    current = day_start

    while current < day_end:
        slot_end = current + timedelta(minutes=duration_minutes)

        # Never offer a start time in the past.
        if current < now:
            slots.append({
                "time": current.strftime("%H:%M"),
                "datetime": current.isoformat(),
                "available": False,
                "peak_concurrent": MAX_CONCURRENT,
            })
            current += timedelta(minutes=15)
            continue

        # Filter bookings that overlap with this specific slot
        overlapping = [(s, e) for s, e in all_bookings if s < slot_end and e > current]

        if not overlapping:
            peak = 0
        elif len(overlapping) < MAX_CONCURRENT:
            # Quick path: if fewer overlapping than max, compute peak but it's definitely available
            peak = 0
            t = current
            while t < slot_end:
                count = sum(1 for s, e in overlapping if s <= t < e)
                peak = max(peak, count)
                t += timedelta(minutes=1)
        else:
            # Full scan needed
            peak = 0
            t = current
            while t < slot_end:
                count = sum(1 for s, e in overlapping if s <= t < e)
                peak = max(peak, count)
                if peak >= MAX_CONCURRENT:
                    break
                t += timedelta(minutes=1)

        slots.append({
            "time": current.strftime("%H:%M"),
            "datetime": current.isoformat(),
            "available": peak < MAX_CONCURRENT,
            "peak_concurrent": peak,
        })

        current += timedelta(minutes=15)

    return slots
