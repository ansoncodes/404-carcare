from django.apps import AppConfig


class ParkingConfig(AppConfig):
    name = 'apps.parking'

    def ready(self):
        from apps.parking import signals  # noqa: F401
