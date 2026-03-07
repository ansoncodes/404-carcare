from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet

from apps.bookings.models import Booking
from apps.core.permissions import AirportScopedMixin
from apps.operations.models import JobCard, WorkStage
from apps.operations.serializers import JobCardSerializer, WorkStageSerializer


class JobCardViewSet(AirportScopedMixin, ModelViewSet):
    serializer_class = JobCardSerializer
    permission_classes = [IsAuthenticated]
    airport_field = "airport"
    customer_field = "booking__customer"

    def get_queryset(self):
        queryset = JobCard.objects.select_related(
            "booking",
            "airport",
            "supervisor",
            "booking__customer",
            "booking__vehicle",
            "booking__airport",
            "booking__chat_room",
        ).prefetch_related("stages", "booking__items__service").order_by("-created_at")
        return self.scope_queryset(queryset)

    def perform_create(self, serializer):
        if not (self.request.user.is_admin or self.request.user.is_supervisor):
            raise PermissionDenied("Only supervisors and admins can create job cards.")
        serializer.save()

    def _require_supervisor_or_admin(self, request):
        if not (request.user.is_supervisor or request.user.is_admin):
            raise PermissionDenied("Only supervisors and admins can perform this action.")

    @staticmethod
    def _stages(job_card):
        return list(job_card.stages.all().order_by("stage_order", "created_at"))

    @staticmethod
    def _normalized_stage_name(name: str) -> str:
        return name.strip().lower().replace("_", " ")

    @action(detail=True, methods=["post"], url_path="start-service")
    def start_service(self, request, pk=None):
        self._require_supervisor_or_admin(request)
        job_card = self.get_object()

        if job_card.status == JobCard.Status.COMPLETED:
            return Response({"detail": "Job is already completed."}, status=status.HTTP_400_BAD_REQUEST)
        if job_card.booking.status not in [Booking.Status.CONFIRMED, Booking.Status.IN_PROGRESS]:
            return Response(
                {"detail": "Booking must be confirmed before starting service."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stages = self._stages(job_card)
        if not stages:
            return Response({"detail": "No work stages configured for this job."}, status=status.HTTP_400_BAD_REQUEST)

        in_progress = next((stage for stage in stages if stage.status == WorkStage.Status.IN_PROGRESS), None)
        if not in_progress:
            next_pending = next((stage for stage in stages if stage.status == WorkStage.Status.PENDING), None)
            if not next_pending:
                return Response(
                    {"detail": "No pending stage available to start."},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            next_pending.status = WorkStage.Status.IN_PROGRESS
            next_pending.save()

        update_fields = []
        if job_card.status != JobCard.Status.ACTIVE:
            job_card.status = JobCard.Status.ACTIVE
            update_fields.append("status")
        if not job_card.started_at:
            job_card.started_at = timezone.now()
            update_fields.append("started_at")
        if update_fields:
            update_fields.append("updated_at")
            job_card.save(update_fields=update_fields)

        if job_card.booking.status == Booking.Status.CONFIRMED:
            job_card.booking.status = Booking.Status.IN_PROGRESS
            job_card.booking.save(update_fields=["status", "updated_at"])

        return Response(self.get_serializer(self.get_object()).data)

    @action(detail=True, methods=["post"], url_path="pause-service")
    def pause_service(self, request, pk=None):
        self._require_supervisor_or_admin(request)
        job_card = self.get_object()

        if job_card.status != JobCard.Status.ACTIVE:
            return Response(
                {"detail": "Only active jobs can be paused."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        job_card.status = JobCard.Status.PAUSED
        job_card.save(update_fields=["status", "updated_at"])
        return Response(self.get_serializer(self.get_object()).data)

    @action(detail=True, methods=["post"], url_path="next-stage")
    def next_stage(self, request, pk=None):
        self._require_supervisor_or_admin(request)
        job_card = self.get_object()

        if job_card.status != JobCard.Status.ACTIVE:
            return Response(
                {"detail": "Start the service before moving to the next stage."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        stages = self._stages(job_card)
        if not stages:
            return Response({"detail": "No work stages configured for this job."}, status=status.HTTP_400_BAD_REQUEST)

        in_progress = next((stage for stage in stages if stage.status == WorkStage.Status.IN_PROGRESS), None)
        if not in_progress:
            return Response(
                {"detail": "No active stage found. Start service first."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        in_progress.status = WorkStage.Status.COMPLETED
        in_progress.save()

        next_pending = next(
            (
                stage
                for stage in stages
                if stage.stage_order > in_progress.stage_order and stage.status == WorkStage.Status.PENDING
            ),
            None,
        )
        if next_pending:
            next_pending.status = WorkStage.Status.IN_PROGRESS
            next_pending.save()
            return Response(self.get_serializer(self.get_object()).data)

        # All stages done — ensure a Quality Check stage exists before completion
        has_qc = any(
            self._normalized_stage_name(stage.stage_name) in {"quality check", "qc"}
            for stage in stages
        )
        if not has_qc:
            max_order = max(stage.stage_order for stage in stages) if stages else 0
            WorkStage.objects.create(
                job_card=job_card,
                stage_name="Quality Check",
                stage_order=max_order + 1,
                estimated_duration_minutes=15,
                status=WorkStage.Status.IN_PROGRESS,
                notes="Auto-added for final quality inspection.",
            )
            return Response(
                {
                    "detail": "Quality Check stage added. Complete QC to finish the job.",
                    "job_card": self.get_serializer(self.get_object()).data,
                }
            )

        return Response(
            {
                "detail": "All stages are completed. Run mark-complete to finish the job.",
                "job_card": self.get_serializer(self.get_object()).data,
            }
        )

    @action(detail=True, methods=["post"], url_path="mark-complete")
    def mark_complete(self, request, pk=None):
        self._require_supervisor_or_admin(request)
        job_card = self.get_object()
        stages = self._stages(job_card)

        if not stages:
            return Response({"detail": "No work stages configured for this job."}, status=status.HTTP_400_BAD_REQUEST)
        if any(stage.status == WorkStage.Status.IN_PROGRESS for stage in stages):
            return Response(
                {"detail": "Complete the current stage before marking the job complete."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if any(stage.status == WorkStage.Status.PENDING for stage in stages):
            return Response(
                {"detail": "You cannot skip stages. Finish all stages in order."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        last_stage = stages[-1]
        if self._normalized_stage_name(last_stage.stage_name) not in {"quality check", "qc"}:
            return Response(
                {"detail": "Final stage must be Quality Check before completion."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        now = timezone.now()
        update_fields = []
        if job_card.status != JobCard.Status.COMPLETED:
            job_card.status = JobCard.Status.COMPLETED
            update_fields.append("status")
        if not job_card.completed_at:
            job_card.completed_at = now
            update_fields.append("completed_at")
        if not job_card.started_at:
            job_card.started_at = now
            update_fields.append("started_at")
        if update_fields:
            update_fields.append("updated_at")
            job_card.save(update_fields=update_fields)

        booking = job_card.booking
        booking.status = Booking.Status.COMPLETED
        booking.progress_percentage = 100
        booking.current_stage = last_stage.stage_name
        booking.save(update_fields=["status", "progress_percentage", "current_stage", "updated_at"])

        return Response(self.get_serializer(self.get_object()).data)


class WorkStageViewSet(AirportScopedMixin, ModelViewSet):
    serializer_class = WorkStageSerializer
    permission_classes = [IsAuthenticated]
    airport_field = "job_card__airport"
    customer_field = "job_card__booking__customer"

    def get_queryset(self):
        job_card = self.request.query_params.get("job_card")
        queryset = WorkStage.objects.select_related("job_card", "job_card__booking", "job_card__airport").all().order_by("job_card", "stage_order")
        if job_card:
            queryset = queryset.filter(job_card_id=job_card)
        return self.scope_queryset(queryset)

    @action(detail=True, methods=["patch"], url_path="update-status")
    def update_status(self, request, pk=None):
        stage = self.get_object()
        if request.user.is_supervisor:
            return Response(
                {"detail": "Use job card controls (start, next-stage, mark-complete) for stage updates."},
                status=status.HTTP_403_FORBIDDEN,
            )
        if not request.user.is_admin:
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
