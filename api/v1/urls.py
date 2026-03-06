from django.http import JsonResponse
from django.urls import include, path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from apps.accounts.views import ChangePasswordView, ProfileView, RegisterView, UserListView
from apps.airports.views import AirportViewSet
from apps.analytics.views import DashboardView
from apps.bookings.views import BookingViewSet
from apps.chat.views import ChatRoomViewSet, MessageViewSet
from apps.notifications.views import NotificationViewSet
from apps.operations.views import JobCardViewSet, WorkStageViewSet
from apps.parking.views import ParkingBookingViewSet, ParkingSlotViewSet
from apps.payments.views import MockPayView, PaymentViewSet
from apps.services.views import ServiceCategoryViewSet, ServiceViewSet
from apps.slots.views import TimeSlotViewSet
from apps.vehicles.views import VehicleViewSet


def health_check(_request):
    return JsonResponse({"status": "ok"})


router = DefaultRouter()
router.register("airports", AirportViewSet, basename="airports")
router.register("vehicles", VehicleViewSet, basename="vehicles")
router.register("service-categories", ServiceCategoryViewSet, basename="service-categories")
router.register("services", ServiceViewSet, basename="services")
router.register("slots", TimeSlotViewSet, basename="slots")
router.register("parking-slots", ParkingSlotViewSet, basename="parking-slots")
router.register("parking-bookings", ParkingBookingViewSet, basename="parking-bookings")
router.register("bookings", BookingViewSet, basename="bookings")
router.register("job-cards", JobCardViewSet, basename="job-cards")
router.register("work-stages", WorkStageViewSet, basename="work-stages")
router.register("chat-rooms", ChatRoomViewSet, basename="chat-rooms")
router.register("messages", MessageViewSet, basename="messages")
router.register("payments", PaymentViewSet, basename="payments")
router.register("notifications", NotificationViewSet, basename="notifications")


urlpatterns = [
    path("health/", health_check, name="api-health-check"),
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", TokenObtainPairView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/profile/", ProfileView.as_view(), name="auth-profile"),
    path("auth/change-password/", ChangePasswordView.as_view(), name="auth-change-password"),
    path("users/", UserListView.as_view(), name="users-list"),
    path("payments/mock/", MockPayView.as_view(), name="payments-mock"),
    path("analytics/dashboard/", DashboardView.as_view(), name="analytics-dashboard"),
    path("", include(router.urls)),
]
