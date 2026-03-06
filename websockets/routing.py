from django.urls import re_path
from websockets.consumers.booking   import BookingProgressConsumer
from websockets.consumers.chat      import ChatConsumer
from websockets.consumers.notify    import NotificationConsumer
from websockets.consumers.analytics import AnalyticsDashboardConsumer

websocket_urlpatterns = [
    re_path(r'ws/bookings/(?P<booking_id>[^/]+)/$',  BookingProgressConsumer.as_asgi()),
    re_path(r'ws/chat/(?P<room_id>[^/]+)/$',         ChatConsumer.as_asgi()),
    re_path(r'ws/notifications/$',                   NotificationConsumer.as_asgi()),
    re_path(r'ws/analytics/dashboard/$',             AnalyticsDashboardConsumer.as_asgi()),
]