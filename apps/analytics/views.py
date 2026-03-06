from django.db.models import Count, Q, Sum
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.models import CustomUser
from apps.airports.models import Airport
from apps.analytics.serializers import DashboardSummarySerializer
from apps.bookings.models import Booking
from apps.payments.models import Payment


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not request.user.is_admin:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        booking_qs = Booking.objects.all()
        booking_stats = {
            "total": booking_qs.count(),
            "pending": booking_qs.filter(status=Booking.Status.PENDING).count(),
            "confirmed": booking_qs.filter(status=Booking.Status.CONFIRMED).count(),
            "in_progress": booking_qs.filter(status=Booking.Status.IN_PROGRESS).count(),
            "completed": booking_qs.filter(status=Booking.Status.COMPLETED).count(),
            "cancelled": booking_qs.filter(status=Booking.Status.CANCELLED).count(),
        }

        today = timezone.now().date()
        paid_payments = Payment.objects.filter(status=Payment.Status.PAID)
        revenue_stats = {
            "total_revenue": paid_payments.aggregate(total=Sum("total_amount"))["total"] or 0,
            "today_revenue": paid_payments.filter(paid_at__date=today).aggregate(total=Sum("total_amount"))["total"] or 0,
            "pending_revenue": Payment.objects.filter(status=Payment.Status.PENDING).aggregate(total=Sum("total_amount"))["total"] or 0,
        }

        total_customers = CustomUser.objects.filter(role=CustomUser.Role.CUSTOMER).count()
        total_supervisors = CustomUser.objects.filter(role=CustomUser.Role.SUPERVISOR).count()

        airports = Airport.objects.filter(is_active=True).annotate(
            total_bookings=Count("bookings"),
            total_revenue=Sum(
                "bookings__payment__total_amount",
                filter=Q(bookings__payment__status=Payment.Status.PAID),
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
        worst_airport = airports_ranked[-1] if len(airports_ranked) > 1 else None

        data = {
            "bookings": booking_stats,
            "revenue": revenue_stats,
            "total_customers": total_customers,
            "total_supervisors": total_supervisors,
            "best_airport": best_airport,
            "worst_airport": worst_airport,
            "airports_ranked": airports_ranked,
        }

        serializer = DashboardSummarySerializer(data)
        return Response(serializer.data)
