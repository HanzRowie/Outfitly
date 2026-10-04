from django.db import models
from accounts.models import User

class FriendRequest(models.Model):
    STATUS_CHOICES =(
        ("pending", "Pending"),
        ("accepted", "Accepted"),
        ("rejected", "Rejected"),
    )

    sender = models.ForeignKey(User,on_delete=models.CASCADE,related_name="send_friend_request")
    receiver = models.ForeignKey(User,on_delete=models.CASCADE,related_name="received_friend_request")
    status = models.CharField(max_length=20,choices=STATUS_CHOICES,default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    def __str__(self):
        return f"{self.sender.username} → {self.receiver.username} ({self.status})"
