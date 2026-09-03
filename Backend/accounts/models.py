from django.db import models
from django.contrib.auth.models import AbstractUser

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)
    profile = models.ImageField(upload_to="profile_pics/",blank=True, null=True)
    

