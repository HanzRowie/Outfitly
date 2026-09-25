from rest_framework import serializers
from clothings.models import ClothingItem

class ClothingItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClothingItem

        fields = [
            "id",
            "name",
            "category",
            "image",
            "color",
            "style",
            "occasion",
            "is_active",
            "created_at",
        ]

        read_only_fields = [
            "id",
            "created_at",
        ]
    