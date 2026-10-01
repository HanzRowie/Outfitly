from rest_framework import serializers

class RecommendationSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
    category = serializers.ChoiceField(
        choices=["top", "bottom", "shoes"]
    )