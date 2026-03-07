from datetime import datetime, date as dt_date

from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django.utils import timezone

from apps.bookings.availability import check_availability, get_day_availability
from apps.services.models import Service


class CheckAvailabilityView(APIView):
    """
    POST /api/v1/bookings/check-availability/
    Body: { "scheduled_start": "2026-03-07T09:00:00", "service_ids": ["uuid1", "uuid2"] }
    Returns: { "available": true, "peak_concurrent": 3, "next_available_at": null, "total_duration_minutes": 65 }
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        scheduled_start_str = request.data.get("scheduled_start")
        service_ids = request.data.get("service_ids", [])

        if not scheduled_start_str:
            return Response(
                {"detail": "scheduled_start is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not service_ids:
            return Response(
                {"detail": "At least one service_id is required."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            requested_start = datetime.fromisoformat(scheduled_start_str)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid datetime format. Use ISO 8601."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if timezone.is_naive(requested_start):
            requested_start = timezone.make_aware(requested_start, timezone.get_current_timezone())

        if requested_start < timezone.now():
            return Response(
                {"detail": "Past date/time is not allowed."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        services = Service.objects.filter(id__in=service_ids, is_active=True)
        if services.count() != len(service_ids):
            return Response(
                {"detail": "One or more service IDs are invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_duration = sum(s.duration_minutes for s in services)
        if total_duration == 0:
            return Response(
                {"detail": "Total service duration cannot be zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        result = check_availability(requested_start, total_duration)
        result["total_duration_minutes"] = total_duration

        # Serialize next_available_at
        if result["next_available_at"]:
            result["next_available_at"] = result["next_available_at"].isoformat()

        return Response(result)


class DayAvailabilityView(APIView):
    """
    GET /api/v1/bookings/day-availability/?date=2026-03-07&service_ids=uuid1,uuid2
    Returns: [{ "time": "09:00", "datetime": "...", "available": true, "peak_concurrent": 2 }, ...]
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        date_str = request.query_params.get("date")
        service_ids_str = request.query_params.get("service_ids", "")

        if not date_str:
            return Response(
                {"detail": "date query parameter is required (YYYY-MM-DD)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not service_ids_str:
            return Response(
                {"detail": "service_ids query parameter is required (comma-separated UUIDs)."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            target_date = dt_date.fromisoformat(date_str)
        except (ValueError, TypeError):
            return Response(
                {"detail": "Invalid date format. Use YYYY-MM-DD."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        service_ids = [s.strip() for s in service_ids_str.split(",") if s.strip()]
        services = Service.objects.filter(id__in=service_ids, is_active=True)
        if services.count() != len(service_ids):
            return Response(
                {"detail": "One or more service IDs are invalid."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        total_duration = sum(s.duration_minutes for s in services)
        if total_duration == 0:
            return Response(
                {"detail": "Total service duration cannot be zero."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        slots = get_day_availability(target_date, total_duration)

        return Response({
            "date": date_str,
            "total_duration_minutes": total_duration,
            "slots": slots,
        })
