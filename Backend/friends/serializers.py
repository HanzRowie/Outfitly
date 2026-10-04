from rest_framework import serializers
from django.contrib.auth import get_user_model

from friends.models import FriendRequest

User = get_user_model()

class FriendRequestSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source="sender.username",
        read_only=True)

    receiver_username = serializers.CharField(
        source="receiver.username",
        read_only=True
    )

    class Meta:
        model = FriendRequest
        fields = [
            "id",
            "sender",
            "sender_username",
            "receiver",
            "receiver_username",
            "status",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "sender",
            "status",
            "created_at",
        ]
    def validate_receiver(self, receiver):
        sender = self.context["request"].user

        if sender == receiver:
            raise serializers.ValidationError(
                "You cannot send a friend request to yourself."
            )

        existing_request = FriendRequest.objects.filter(
            sender=sender,
            receiver=receiver,
            status__in=["pending", "accepted"]
        ).exists()

        reverse_request = FriendRequest.objects.filter(
            sender=receiver,
            receiver=sender,
            status__in=["pending", "accepted"]
        ).exists()

        if existing_request or reverse_request:
            raise serializers.ValidationError(
                "A pending request or friendship already exists."
            )

        return receiver

    
