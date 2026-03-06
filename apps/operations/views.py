from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.bookings.models import Booking
from apps.operations.models import JobCard, WorkStage
from apps.operations.serializers import JobCardSerializer, WorkStageSerializer


class JobCardViewSet(ModelViewSet):
    serializer_class = JobCardSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = JobCard.objects.select_related("booking", "airport", "supervisor", "booking__customer").prefetch_related("stages").order_by("-created_at")
        if user.is_admin:
            return queryset
        if user.is_supervisor:
            return queryset.filter(airport=user.airport)
        return queryset.filter(booking__customer=user)

    def perform_create(self, serializer):
        if not (self.request.user.is_admin or self.request.user.is_supervisor):
            raise PermissionDenied("Only supervisors and admins can create job cards.")
        serializer.save()


class WorkStageViewSet(ModelViewSet):
    serializer_class = WorkStageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        job_card = self.request.query_params.get("job_card")
        queryset = WorkStage.objects.select_related("job_card", "job_card__booking", "job_card__airport").all().order_by("job_card", "stage_order")
        if job_card:
            queryset = queryset.filter(job_card_id=job_card)
        if user.is_supervisor:
            queryset = queryset.filter(job_card__airport=user.airport)
        elif user.is_customer:
            queryset = queryset.filter(job_card__booking__customer=user)
        return queryset

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        
        stage = self.get_object()
        if not (request.user.is_supervisor or request.user.is_admin):
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get("status")
        allowed_values = {WorkStage.Status.IN_PROGRESS, WorkStage.Status.COMPLETED, WorkStage.Status.SKIPPED}
        if new_status not in [status_value.value for status_value in allowed_values]:
            return Response({"detail": "Invalid status."}, status=status.HTTP_400_BAD_REQUEST)

        stage.status = new_status
        stage.notes = request.data.get("notes", stage.notes)
        stage.save()

        booking = stage.job_card.booking
        if stage.status == WorkStage.Status.IN_PROGRESS and booking.status == Booking.Status.CONFIRMED:
            booking.status = Booking.Status.IN_PROGRESS
            booking.save(update_fields=["status", "updated_at"])
        if booking.progress_percentage >= 100 and booking.status != Booking.Status.COMPLETED:
            booking.status = Booking.Status.COMPLETED
            booking.save(update_fields=["status", "updated_at"])

        return Response(WorkStageSerializer(stage).data)

