from rest_framework import serializers

class RecommendationSerializer(serializers.Serializer):
    item_id = serializers.IntegerField()
    target_category = serializers.CharField(required=False, allow_null=True, allow_blank=True)


class OutfitScoreSerializer(serializers.Serializer):
    top = serializers.IntegerField()
    bottom = serializers.IntegerField()
    shoes = serializers.IntegerField()