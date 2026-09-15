from django.db import models

# Create your models here.
class ClothingItem(models.Model):
    CATEGORY_CHOICES = [
        ("top", "Top"),
        ("bottom","Bottom"),
        ("shoes","Shoes")
    ]
    OCCASION_CHOICES = (
        ("casual", "Casual"),
        ("formal", "Formal"),
        ("party", "Party"),
        ("sports", "Sports"),
        ("business", "Business"),
        ("travel", "Travel"),
    )

    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    image = models.ImageField(upload_to="clothing/")
    color = models.CharField(max_length=50)
    style = models.CharField(max_length=50)
    occasion = models.CharField(max_length=50, choices=OCCASION_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name



    
