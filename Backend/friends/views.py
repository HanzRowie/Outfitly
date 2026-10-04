from django.shortcuts import render
from friends.models import FriendRequest
from friends.serializers import FriendRequestSerializer
from django.contrib.auth import get_user_model
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
# Create your views here.

User = get_user_model()

class UserListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self,request):
        user = User.objects.exclude(id=request.user.id)
        data = []

        for user in user:
            profile = getattr(user, "profile",None)
            data.append({
                "id": user.id,
                "username": user.username,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "profile_picture": (
                    request.build_absolute_uri(
                        profile.profile_picture.url
                    )
                    if profile and profile.profile_picture
                    else None
                ),
                "bio": profile.bio if profile else "",
            })

        return Response(
            data,
            status=status.HTTP_200_OK
        )

class FriendRequestCreateView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self,request):
        serializer = FriendRequestSerializer(
            data = request.data,
            context = {"request": request}
        )
        serializer.is_valid(raise_exception=True)
        friend_request = serializer.save(sender = request.user)
        return Response(
            FriendRequestSerializer(
                friend_request,
                context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED
        )
class FriendRequestListView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        incoming = FriendRequest.objects.filter(
            receiver=request.user
        ).order_by("-created_at")

        outgoing = FriendRequest.objects.filter(
            sender=request.user
        ).order_by("-created_at")

        return Response({
            "incoming": FriendRequestSerializer(
                incoming,
                many=True,
                context={"request": request}
            ).data,

            "outgoing": FriendRequestSerializer(
                outgoing,
                many=True,
                context={"request": request}
            ).data,
        })

class FriendRequestActionView(APIView):
    permission_classes = [IsAuthenticated]

    def patch(self, request, pk):
        try:
            friend_request = FriendRequest.objects.get(
                id=pk,
                receiver=request.user
            )
        except FriendRequest.DoesNotExist:
            return Response(
                {"error": "Friend request not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        if friend_request.status != "pending":
            return Response(
                {"error": "This friend request has already been processed."},
                status=status.HTTP_400_BAD_REQUEST
            )

        action = request.data.get("action")

        if action == "accept":
            friend_request.status = "accepted"
            friend_request.save()

            return Response(
                {
                    "message": "Friend request accepted.",
                    "status": friend_request.status
                },
                status=status.HTTP_200_OK
            )

        elif action == "reject":
            friend_request.status = "rejected"
            friend_request.save()

            return Response(
                {
                    "message": "Friend request rejected.",
                    "status": friend_request.status
                },
                status=status.HTTP_200_OK
            )

        return Response(
            {
                "error": "Action must be 'accept' or 'reject'."
            },
            status=status.HTTP_400_BAD_REQUEST
        )