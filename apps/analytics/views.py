from datetime import timedelta
from decimal import Decimal

from django.db.models import Count, Q, Sum
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import CustomUser
from apps.airports.models import Airport
from apps.analytics.serializers import DashboardSummarySerializer, RevenueInsightsSerializer
from apps.bookings.models import Booking
from apps.payments.models import Payment


def _money(value) -> Decimal:
    return value or Decimal("0.00")


def _percent_change(current: Decimal, previous: Decimal) -> float:
    if previous == 0:
        return 100.0 if current > 0 else 0.0
    return float(((current - previous) / previous) * Decimal("100"))


def _trend(delta: Decimal) -> str:
    if delta > 0:
        return "up"
    if delta < 0:
        return "down"
    return "flat"


def _scope_for_user(user):
    if user.is_admin:
        return {
            "booking_qs": Booking.objects.all(),
            "paid_payment_qs": Payment.objects.filter(status=Payment.Status.PAID),
            "pending_payment_qs": Payment.objects.filter(status=Payment.Status.PENDING),
            "airports_base": Airport.objects.filter(is_active=True),
            "total_customers": CustomUser.objects.filter(role=CustomUser.Role.CUSTOMER).count(),
            "total_supervisors": CustomUser.objects.filter(role=CustomUser.Role.SUPERVISOR).count(),
        }

    if not user.airport_id:
        return {
            "booking_qs": Booking.objects.none(),
            "paid_payment_qs": Payment.objects.none(),
            "pending_payment_qs": Payment.objects.none(),
            "airports_base": Airport.objects.none(),
            "total_customers": 0,
            "total_supervisors": 0,
        }

    return {
        "booking_qs": Booking.objects.filter(airport_id=user.airport_id),
        "paid_payment_qs": Payment.objects.filter(status=Payment.Status.PAID, booking__airport_id=user.airport_id),
        "pending_payment_qs": Payment.objects.filter(status=Payment.Status.PENDING, booking__airport_id=user.airport_id),
        "airports_base": Airport.objects.filter(id=user.airport_id, is_active=True),
        "total_customers": (
            CustomUser.objects.filter(role=CustomUser.Role.CUSTOMER, bookings__airport_id=user.airport_id)
            .distinct()
            .count()
        ),
        "total_supervisors": CustomUser.objects.filter(
            role=CustomUser.Role.SUPERVISOR,
            airport_id=user.airport_id,
        ).count(),
    }


def _build_revenue_stats(paid_payment_qs, pending_payment_qs):
    net_paid_payments = paid_payment_qs.exclude(booking__status=Booking.Status.CANCELLED)
    cancelled_paid_payments = paid_payment_qs.filter(booking__status=Booking.Status.CANCELLED)
    pending_revenue_qs = pending_payment_qs.exclude(booking__status=Booking.Status.CANCELLED)

    today = timezone.localdate()
    yesterday = today - timedelta(days=1)
    month_start = today.replace(day=1)
    last_month_end = month_start - timedelta(days=1)
    last_month_start = last_month_end.replace(day=1)

    total_revenue = _money(net_paid_payments.aggregate(total=Sum("total_amount"))["total"])
    today_revenue = _money(net_paid_payments.filter(paid_at__date=today).aggregate(total=Sum("total_amount"))["total"])
    yesterday_revenue = _money(
        net_paid_payments.filter(paid_at__date=yesterday).aggregate(total=Sum("total_amount"))["total"]
    )
    month_revenue = _money(
        net_paid_payments.filter(
            paid_at__date__gte=month_start,
            paid_at__date__lte=today,
        ).aggregate(total=Sum("total_amount"))["total"]
    )
    last_month_revenue = _money(
        net_paid_payments.filter(
            paid_at__date__gte=last_month_start,
            paid_at__date__lte=last_month_end,
        ).aggregate(total=Sum("total_amount"))["total"]
    )

    cancelled_deduction_today = _money(
        cancelled_paid_payments.filter(paid_at__date=today).aggregate(total=Sum("total_amount"))["total"]
    )
    cancelled_deduction_month = _money(
        cancelled_paid_payments.filter(
            paid_at__date__gte=month_start,
            paid_at__date__lte=today,
        ).aggregate(total=Sum("total_amount"))["total"]
    )

    today_change_amount = today_revenue - yesterday_revenue
    month_change_amount = month_revenue - last_month_revenue

    revenue_stats = {
        "total_revenue": total_revenue,
        "today_revenue": today_revenue,
        "pending_revenue": _money(pending_revenue_qs.aggregate(total=Sum("total_amount"))["total"]),
        "yesterday_revenue": yesterday_revenue,
        "today_change_amount": today_change_amount,
        "today_change_percent": round(_percent_change(today_revenue, yesterday_revenue), 2),
        "today_trend": _trend(today_change_amount),
        "month_revenue": month_revenue,
        "last_month_revenue": last_month_revenue,
        "month_change_amount": month_change_amount,
        "month_change_percent": round(_percent_change(month_revenue, last_month_revenue), 2),
        "month_trend": _trend(month_change_amount),
        "cancelled_deduction_today": cancelled_deduction_today,
        "cancelled_deduction_month": cancelled_deduction_month,
    }

    trend_context = {
        "today": today,
        "month_start": month_start,
        "last_month_start": last_month_start,
        "last_month_end": last_month_end,
        "net_paid_payments": net_paid_payments,
    }
    return revenue_stats, trend_context


def _daily_totals(payment_qs, start_date, end_date):
    rows = (
        payment_qs.filter(paid_at__date__gte=start_date, paid_at__date__lte=end_date)
        .annotate(day=TruncDate("paid_at"))
        .values("day")
        .annotate(total=Sum("total_amount"))
        .order_by("day")
    )
    return {row["day"]: _money(row["total"]) for row in rows}


def _build_trend_points(net_paid_payments, today, month_start, last_month_start, last_month_end):
    day_count = today.day
    current_daily = _daily_totals(net_paid_payments, month_start, today)

    last_month_day_limit = min(day_count, last_month_end.day)
    last_month_compare_end = last_month_start + timedelta(days=last_month_day_limit - 1)
    previous_daily = _daily_totals(net_paid_payments, last_month_start, last_month_compare_end)

    trend_points = []
    for offset in range(day_count):
        day_number = offset + 1
        current_date = month_start + timedelta(days=offset)
        previous_date_candidate = last_month_start + timedelta(days=offset)
        if previous_date_candidate > last_month_end:
            previous_date = None
            previous_value = Decimal("0.00")
        else:
            previous_date = previous_date_candidate
            previous_value = previous_daily.get(previous_date, Decimal("0.00"))

        trend_points.append(
            {
                "day": day_number,
                "current_date": current_date,
                "previous_date": previous_date,
                "current_value": current_daily.get(current_date, Decimal("0.00")),
                "previous_value": previous_value,
            }
        )

    return trend_points


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not (user.is_admin or user.is_supervisor):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        scope = _scope_for_user(user)
        booking_qs = scope["booking_qs"]
        revenue_stats, _trend_context = _build_revenue_stats(scope["paid_payment_qs"], scope["pending_payment_qs"])

        booking_stats = {
            "total": booking_qs.count(),
            "pending": booking_qs.filter(status=Booking.Status.PENDING).count(),
            "confirmed": booking_qs.filter(status=Booking.Status.CONFIRMED).count(),
            "in_progress": booking_qs.filter(status=Booking.Status.IN_PROGRESS).count(),
            "completed": booking_qs.filter(status=Booking.Status.COMPLETED).count(),
            "cancelled": booking_qs.filter(status=Booking.Status.CANCELLED).count(),
        }

        airports = scope["airports_base"].annotate(
            total_bookings=Count("bookings"),
            total_revenue=Sum(
                "bookings__payment__total_amount",
                filter=Q(bookings__payment__status=Payment.Status.PAID) & ~Q(bookings__status=Booking.Status.CANCELLED),
            ),
        ).order_by("-total_revenue", "name")

        airports_ranked = []
        for rank, airport in enumerate(airports, start=1):
            airports_ranked.append(
                {
                    "airport_id": airport.id,
                    "airport_name": airport.name,
                    "airport_code": airport.code,
                    "total_bookings": airport.total_bookings,
                    "total_revenue": airport.total_revenue or 0,
                    "rank": rank,
                }
            )

        best_airport = airports_ranked[0] if airports_ranked else None
        worst_airport = airports_ranked[-1] if len(airports_ranked) > 1 else best_airport

        data = {
            "bookings": booking_stats,
            "revenue": revenue_stats,
            "total_customers": scope["total_customers"],
            "total_supervisors": scope["total_supervisors"],
            "best_airport": best_airport,
            "worst_airport": worst_airport,
            "airports_ranked": airports_ranked,
        }

        serializer = DashboardSummarySerializer(data)
        return Response(serializer.data)


class RevenueInsightsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user
        if not (user.is_admin or user.is_supervisor):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        scope = _scope_for_user(user)
        revenue_stats, trend_context = _build_revenue_stats(scope["paid_payment_qs"], scope["pending_payment_qs"])
        trend_points = _build_trend_points(
            net_paid_payments=trend_context["net_paid_payments"],
            today=trend_context["today"],
            month_start=trend_context["month_start"],
            last_month_start=trend_context["last_month_start"],
            last_month_end=trend_context["last_month_end"],
        )

        data = {
            "metrics": revenue_stats,
            "trend_points": trend_points,
        }
        serializer = RevenueInsightsSerializer(data)
        return Response(serializer.data)
