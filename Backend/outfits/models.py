from django.db import models
from accounts.models import User
from clothings.models import ClothingItem


class Outfit(models.Model):
    user = models.ForeignKey(User,on_delete=models.CASCADE,related_name="outfits")
    top = models.ForeignKey(ClothingItem,on_delete=models.PROTECT,related_name="top_outfits")
    bottom = models.ForeignKey(ClothingItem,on_delete=models.PROTECT,related_name="bottom_outfits")
    shoes = models.ForeignKey(ClothingItem,on_delete=models.PROTECT,related_name="shoe_outfits")
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username}'s Outfit #{self.id}"

    
