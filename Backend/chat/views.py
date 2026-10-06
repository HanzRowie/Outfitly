from django.contrib.auth import get_user_model
from django.db.models import Q

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated

from friends.models import FriendRequest

from .models import Conversation, Message
from .serializers import ConversationSerializer, MessageSerializer


User = get_user_model()


def are_friends(user1, user2):
    return FriendRequest.objects.filter(
        Q(
            sender=user1,
            receiver=user2,
            status="accepted"
        )
        |
        Q(
            sender=user2,
            receiver=user1,
            status="accepted"
        )
    ).exists()


class ConversationListCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        conversations = Conversation.objects.filter(
            Q(user1=request.user) | Q(user2=request.user)
        ).order_by("-created_at")

        serializer = ConversationSerializer(
            conversations,
            many=True,
            context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request):
        friend_id = request.data.get("friend_id")
        if not friend_id:
            return Response(
                {"error": "friend_id is required."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            friend = User.objects.get(id=friend_id)
        except User.DoesNotExist:
            return Response(
                {"error": "User not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if friend == request.user:
            return Response(
                {"error": "Cannot start conversation with yourself."},
                status=status.HTTP_400_BAD_REQUEST
            )

        if not are_friends(request.user, friend):
            return Response(
                {"error": "You can only message accepted friends."},
                status=status.HTTP_400_BAD_REQUEST
            )

        conversation = Conversation.objects.filter(
            Q(user1=request.user, user2=friend)
            |
            Q(user1=friend, user2=request.user)
        ).first()

        if conversation:
            serializer = ConversationSerializer(
                conversation,
                context={"request": request}
            )
            return Response(serializer.data, status=status.HTTP_200_OK)

        conversation = Conversation.objects.create(
            user1=request.user,
            user2=friend
        )
        serializer = ConversationSerializer(
            conversation,
            context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ConversationMessagesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, pk):
        try:
            conversation = Conversation.objects.get(id=pk)
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if request.user != conversation.user1 and request.user != conversation.user2:
            return Response(
                {"error": "You are not a participant in this conversation."},
                status=status.HTTP_403_FORBIDDEN
            )

        messages = conversation.messages.order_by("created_at")
        serializer = MessageSerializer(
            messages,
            many=True,
            context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_200_OK)

    def post(self, request, pk):
        try:
            conversation = Conversation.objects.get(id=pk)
        except Conversation.DoesNotExist:
            return Response(
                {"error": "Conversation not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if request.user != conversation.user1 and request.user != conversation.user2:
            return Response(
                {"error": "You are not a participant in this conversation."},
                status=status.HTTP_403_FORBIDDEN
            )

        content = request.data.get("content") or request.data.get("message")
        if not content or not content.strip():
            return Response(
                {"error": "Message content cannot be empty."},
                status=status.HTTP_400_BAD_REQUEST
            )

        message = Message.objects.create(
            conversation=conversation,
            sender=request.user,
            content=content.strip()
        )
        serializer = MessageSerializer(
            message,
            context={"request": request}
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)