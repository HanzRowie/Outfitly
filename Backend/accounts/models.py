from django.db import models
from django.contrib.auth.models import AbstractUser
from django.contrib.auth.models import User

class User(AbstractUser):
    email = models.EmailField(unique=True)
    profile = models.ImageField(
        upload_to="profiles/",
        blank=True,
        null=True
    )

    def __str__(self):
        return self.username


class OTPVerification(models.Model):

    OTP_PURPOSES = (
        ('registration', 'Registration'),
        ('password_reset', 'Password Reset'),
    )

    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="otp_verifications"
    )

    otp = models.CharField(max_length=6)

    purpose = models.CharField(
        max_length=20,
        choices=OTP_PURPOSES
    )

    created_at = models.DateTimeField(auto_now_add=True)

    expires_at = models.DateTimeField()

    is_verified = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.user.username} - {self.purpose}"
    


