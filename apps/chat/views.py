from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from django.db.models import Q

from apps.accounts.models import CustomUser
from apps.chat.models import ChatRoom, Message
from apps.chat.serializers import ChatRoomListSerializer, ChatRoomSerializer, MessageSerializer


class ChatRoomViewSet(ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == "list":
            return ChatRoomListSerializer
        return ChatRoomSerializer

    def get_queryset(self):
        user = self.request.user
        queryset = ChatRoom.objects.select_related("booking", "customer", "assigned_staff").prefetch_related("messages").order_by("-last_message_at")
        if user.is_admin:
            return queryset
        if user.is_supervisor:
            return queryset.filter(assigned_staff=user)
        return queryset.filter(customer=user)

    @action(detail=True, methods=["post"], url_path="assign-staff")
    def assign_staff(self, request, pk=None):
        
        if not request.user.is_admin:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)
        room = self.get_object()
        staff_id = request.data.get("staff_id")
        try:
            staff = CustomUser.objects.get(id=staff_id, role=CustomUser.Role.SUPERVISOR)
        except CustomUser.DoesNotExist:
            return Response({"detail": "Supervisor not found."}, status=status.HTTP_404_NOT_FOUND)
        room.assigned_staff = staff
        room.save(update_fields=["assigned_staff", "updated_at"])
        return Response(ChatRoomSerializer(room).data)


class MessageViewSet(ModelViewSet):
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        queryset = Message.objects.select_related("room", "sender", "room__customer", "room__assigned_staff").order_by("created_at")
        if not user.is_admin:
            queryset = queryset.filter(Q(room__customer=user) | Q(room__assigned_staff=user))
        room_id = self.request.query_params.get("room")
        if room_id:
            queryset = queryset.filter(room_id=room_id)
        return queryset.distinct()

    def perform_create(self, serializer):
        room = serializer.validated_data["room"]
        user = self.request.user
        if not (user.is_admin or room.customer_id == user.id or room.assigned_staff_id == user.id):
            raise PermissionDenied("You cannot post to this chat room.")
        serializer.save(sender=user)

    @action(detail=False, methods=["post"], url_path="mark-read")
    def mark_read(self, request):
        
        room_id = request.data.get("room_id")
        if not room_id:
            return Response({"detail": "room_id is required."}, status=status.HTTP_400_BAD_REQUEST)

        room_qs = ChatRoom.objects.filter(id=room_id)
        if not request.user.is_admin:
            room_qs = room_qs.filter(customer=request.user) | room_qs.filter(assigned_staff=request.user)
        room = room_qs.first()
        if not room:
            return Response({"detail": "Forbidden."}, status=status.HTTP_403_FORBIDDEN)

        updated = Message.objects.filter(room=room, is_read=False).exclude(sender=request.user).update(
            is_read=True,
            read_at=timezone.now(),
        )
        return Response({"marked_read": updated})

