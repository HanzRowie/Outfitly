from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from clothings.models import ClothingItem
from .serializers import RecommendationSerializer, OutfitScoreSerializer
from .services import recommend_complete_outfits, recommend_items, calculate_outfit_score


class RecommendationView(APIView):
    """
    Returns complete outfit recommendations and individual compatible items
    based on a selected clothing item.
    """

    def post(self, request):
        serializer = RecommendationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        item_id = serializer.validated_data["item_id"]
        target_category = serializer.validated_data.get("target_category")

        try:
            selected_item = ClothingItem.objects.get(
                id=item_id,
                is_active=True
            )
        except ClothingItem.DoesNotExist:
            return Response(
                {"error": "Clothing item not found."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 1. Complete outfit recommendations
        recommendations = recommend_complete_outfits(
            selected_item
        )

        response_data = []
        for recommendation in recommendations:
            top = recommendation["top"]
            bottom = recommendation["bottom"]
            shoes = recommendation["shoes"]
            score = recommendation["score"]

            response_data.append({
                "top": {
                    "id": top.id,
                    "name": top.name,
                    "category": top.category,
                    "image": request.build_absolute_uri(
                        top.image.url
                    ) if top.image else None,
                    "color": top.color,
                    "style": top.style,
                    "occasion": top.occasion,
                },
                "bottom": {
                    "id": bottom.id,
                    "name": bottom.name,
                    "category": bottom.category,
                    "image": request.build_absolute_uri(
                        bottom.image.url
                    ) if bottom.image else None,
                    "color": bottom.color,
                    "style": bottom.style,
                    "occasion": bottom.occasion,
                },
                "shoes": {
                    "id": shoes.id,
                    "name": shoes.name,
                    "category": shoes.category,
                    "image": request.build_absolute_uri(
                        shoes.image.url
                    ) if shoes.image else None,
                    "color": shoes.color,
                    "style": shoes.style,
                    "occasion": shoes.occasion,
                },
                "score": score
            })

        # 2. Individual compatible clothing items for 'Complete Your Look'
        all_categories = ["top", "bottom", "shoes"]
        other_categories = [cat for cat in all_categories if cat != selected_item.category]
        if target_category and target_category in other_categories:
            categories_to_query = [target_category]
        else:
            categories_to_query = other_categories

        compatible_items_data = []
        for cat in categories_to_query:
            category_recs = recommend_items(selected_item, cat)
            for rec in category_recs:
                item = rec["item"]
                compatible_items_data.append({
                    "id": item.id,
                    "name": item.name,
                    "category": item.category,
                    "image": request.build_absolute_uri(
                        item.image.url
                    ) if item.image else None,
                    "color": item.color,
                    "style": item.style,
                    "occasion": item.occasion,
                    "score": rec["score"],
                })

        return Response(
            {
                "selected_item": {
                    "id": selected_item.id,
                    "name": selected_item.name,
                    "category": selected_item.category,
                },
                "recommendations": response_data,
                "compatible_items": compatible_items_data,
            },
            status=status.HTTP_200_OK
        )


class OutfitScoreView(APIView):
    """
    Calculates exact rule-based score for an assembled outfit (top, bottom, shoes).
    Endpoint: POST /api/recommendations/score/
    Request Body: { "top": top_id, "bottom": bottom_id, "shoes": shoes_id }
    """

    def post(self, request):
        serializer = OutfitScoreSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        top_id = serializer.validated_data["top"]
        bottom_id = serializer.validated_data["bottom"]
        shoes_id = serializer.validated_data["shoes"]

        try:
            top = ClothingItem.objects.get(id=top_id, category="top", is_active=True)
        except ClothingItem.DoesNotExist:
            return Response(
                {"error": f"Top item with id {top_id} not found or inactive."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            bottom = ClothingItem.objects.get(id=bottom_id, category="bottom", is_active=True)
        except ClothingItem.DoesNotExist:
            return Response(
                {"error": f"Bottom item with id {bottom_id} not found or inactive."},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            shoes = ClothingItem.objects.get(id=shoes_id, category="shoes", is_active=True)
        except ClothingItem.DoesNotExist:
            return Response(
                {"error": f"Shoes item with id {shoes_id} not found or inactive."},
                status=status.HTTP_400_BAD_REQUEST
            )

        scores = calculate_outfit_score(top, bottom, shoes)
        return Response(scores, status=status.HTTP_200_OK)