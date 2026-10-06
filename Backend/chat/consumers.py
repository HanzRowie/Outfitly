import json

from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.db.models import Q

from friends.models import FriendRequest

from .models import Conversation, Message


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        """
        Connect the user to the conversation WebSocket.
        """

        # Get conversation ID from URL
        self.conversation_id = self.scope[
            "url_route"
        ]["kwargs"]["conversation_id"]

        # Get conversation
        self.conversation = await self.get_conversation(
            self.conversation_id
        )

        # Conversation does not exist
        if not self.conversation:
            await self.close()
            return

        # Get logged-in user from JWT middleware
        user = self.scope.get("user")

        # User is not authenticated
        if not user or not user.is_authenticated:
            await self.close()
            return

        # Check whether user belongs to conversation
        if not await self.user_in_conversation(user):
            await self.close()
            return

        # Check whether users are accepted friends
        if not await self.users_are_friends(user):
            await self.close()
            return

        # Create WebSocket group
        self.room_group_name = (
            f"chat_{self.conversation_id}"
        )

        # Add user to group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Accept WebSocket connection
        await self.accept()

    async def disconnect(self, close_code):
        """
        Remove user from WebSocket group.
        """

        if hasattr(self, "room_group_name"):

            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )

    async def receive(self, text_data):
        """
        Receive a message from the WebSocket.
        """

        try:
            data = json.loads(text_data)

        except json.JSONDecodeError:
            return

        # Get message
        message_content = data.get("message")

        # Message does not exist
        if not message_content:
            return

        # Remove unnecessary spaces
        message_content = message_content.strip()

        # Empty message
        if not message_content:
            return

        # Get current user
        user = self.scope["user"]

        # Double-check friendship before sending
        if not await self.users_are_friends(user):
            await self.close()
            return

        # Save message to database
        message = await self.create_message(
            self.conversation,
            user,
            message_content
        )

        # Send message to everyone in conversation
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                "type": "chat_message",
                "message": message_content,
                "sender": user.username,
                "created_at": message.created_at.isoformat(),
            }
        )

    async def chat_message(self, event):
        """
        Send message data back to WebSocket client.
        """

        await self.send(
            text_data=json.dumps(
                {
                    "message": event["message"],
                    "sender": event["sender"],
                    "created_at": event["created_at"],
                }
            )
        )

    @database_sync_to_async
    def get_conversation(self, conversation_id):
        """
        Get conversation from database.
        """

        try:
            return Conversation.objects.get(
                id=conversation_id
            )

        except Conversation.DoesNotExist:
            return None

    @database_sync_to_async
    def user_in_conversation(self, user):
        """
        Check whether the user belongs to this conversation.
        """

        return (
            self.conversation.user1_id == user.id
            or
            self.conversation.user2_id == user.id
        )

    @database_sync_to_async
    def users_are_friends(self, user):
        """
        Check whether the current user and the other
        conversation participant are accepted friends.
        """

        # Determine the other user
        if user.id == self.conversation.user1_id:
            other_user_id = self.conversation.user2_id

        else:
            other_user_id = self.conversation.user1_id

        # Check accepted friendship in either direction
        return FriendRequest.objects.filter(
            Q(
                sender_id=user.id,
                receiver_id=other_user_id,
                status="accepted"
            )
            |
            Q(
                sender_id=other_user_id,
                receiver_id=user.id,
                status="accepted"
            )
        ).exists()

    @database_sync_to_async
    def create_message(self, conversation, sender, content):
        """
        Save message to database.
        """

        return Message.objects.create(
            conversation=conversation,
            sender=sender,
            content=content
        )