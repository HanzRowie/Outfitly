from rest_framework import serializers
from chat.models import Conversation, Message

class ConversationSerializer(serializers.ModelSerializer):
    user1_username = serializers.CharField(
        source="user1.username",
        read_only=True
    )
    user2_username = serializers.CharField(
        source="user2.username",
        read_only=True
    )

    class Meta:
        model = Conversation
        fields = [
            "id",
            "user1",
            "user1_username",
            "user2",
            "user2_username",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "user1",
            "user1_username",
            "user2_username",
            "created_at",
        ]

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField( source="sender.username",
        read_only=True)

    class Meta:
        model = Message
        fields = [
            "id",
            "conversation",
            "sender",
            "sender_username",
            "content",
            "created_at",
        ]
        read_only_fields = [
            "id",
            "conversation",
            "sender",
            "sender_username",
            "created_at",
        ]