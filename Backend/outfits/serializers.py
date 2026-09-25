from rest_framework import serializers
from outfits.models import Outfit

class OutfitSerializer(serializers.ModelSerializer):
    class Meta:
        model = Outfit
        fields = [
            "id",
            "user",
            "top",
            "bottom",
            "shoes",
            'created_at'
        ]

        read_only_fields = [
            "id",
            "user",
            "created_at",
        ]

    def validate(self, data):

        top = data.get("top")
        bottom = data.get("bottom")
        shoes = data.get("shoes")

        # Check top category and active status
        if top:
            if top.category != "top":
                raise serializers.ValidationError({
                    "top": "Selected clothing item must be a top."
                })

            if not top.is_active:
                raise serializers.ValidationError({
                    "top": "This clothing item is no longer available."
                })

        # Check bottom category and active status
        if bottom:
            if bottom.category != "bottom":
                raise serializers.ValidationError({
                    "bottom": "Selected clothing item must be a bottom."
                })

            if not bottom.is_active:
                raise serializers.ValidationError({
                    "bottom": "This clothing item is no longer available."
                })

        # Check shoes category and active status
        if shoes:
            if shoes.category != "shoes":
                raise serializers.ValidationError({
                    "shoes": "Selected clothing item must be shoes."
                })

            if not shoes.is_active:
                raise serializers.ValidationError({
                    "shoes": "This clothing item is no longer available."
                })

        return data