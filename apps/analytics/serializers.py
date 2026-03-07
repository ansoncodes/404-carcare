from rest_framework import serializers


class BookingStatsSerializer(serializers.Serializer):
    total     = serializers.IntegerField()
    pending   = serializers.IntegerField()
    confirmed = serializers.IntegerField()
    in_progress = serializers.IntegerField()
    completed = serializers.IntegerField()
    cancelled = serializers.IntegerField()


class RevenueStatsSerializer(serializers.Serializer):
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    today_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    pending_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    yesterday_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    today_change_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    today_change_percent = serializers.FloatField()
    today_trend = serializers.ChoiceField(choices=["up", "down", "flat"])
    month_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    last_month_revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    month_change_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    month_change_percent = serializers.FloatField()
    month_trend = serializers.ChoiceField(choices=["up", "down", "flat"])
    cancelled_deduction_today = serializers.DecimalField(max_digits=12, decimal_places=2)
    cancelled_deduction_month = serializers.DecimalField(max_digits=12, decimal_places=2)


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
    best_airport       = AirportRevenueSerializer(allow_null=True)
    worst_airport      = AirportRevenueSerializer(allow_null=True)
    airports_ranked    = AirportRevenueSerializer(many=True)


class RevenueTrendPointSerializer(serializers.Serializer):
    day = serializers.IntegerField()
    current_date = serializers.DateField()
    previous_date = serializers.DateField(allow_null=True)
    current_value = serializers.DecimalField(max_digits=12, decimal_places=2)
    previous_value = serializers.DecimalField(max_digits=12, decimal_places=2)


class RevenueInsightsSerializer(serializers.Serializer):
    metrics = RevenueStatsSerializer()
    trend_points = RevenueTrendPointSerializer(many=True)

