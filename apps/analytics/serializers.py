from rest_framework import serializers


class BookingStatsSerializer(serializers.Serializer):
    total     = serializers.IntegerField()
    pending   = serializers.IntegerField()
    confirmed = serializers.IntegerField()
    in_progress = serializers.IntegerField()
    completed = serializers.IntegerField()
    cancelled = serializers.IntegerField()


class RevenueStatsSerializer(serializers.Serializer):
    total_revenue   = serializers.DecimalField(max_digits=12, decimal_places=2)
    today_revenue   = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)


class AirportRevenueSerializer(serializers.Serializer):
    airport_id     = serializers.UUIDField()
    airport_name   = serializers.CharField()
    airport_code   = serializers.CharField()
    total_bookings = serializers.IntegerField()
    total_revenue  = serializers.DecimalField(max_digits=12, decimal_places=2)
    rank           = serializers.IntegerField()


class DashboardSummarySerializer(serializers.Serializer):
    bookings           = BookingStatsSerializer()
    revenue            = RevenueStatsSerializer()
    total_customers    = serializers.IntegerField()
    total_supervisors  = serializers.IntegerField()
    best_airport       = AirportRevenueSerializer()
    worst_airport      = AirportRevenueSerializer()
    airports_ranked    = AirportRevenueSerializer(many=True)