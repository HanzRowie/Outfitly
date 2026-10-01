from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from clothings.models import ClothingItem
from .serializers import RecommendationSerializer
from .services import recommend_items


class RecommendationView(APIView):

    def post(self, request):
        serializer = RecommendationSerializer(data=request.data)

        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        item_id = serializer.validated_data["item_id"]
        category = serializer.validated_data["category"]

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

        recommendations = recommend_items(
            selected_item,
            category
        )

        response_data = []

        for recommendation in recommendations:
            item = recommendation["item"]
            score = recommendation["score"]

            response_data.append({
                "id": item.id,
                "name": item.name,
                "category": item.category,
                "image": request.build_absolute_uri(
                    item.image.url
                ) if item.image else None,
                "color": item.color,
                "style": item.style,
                "occasion": item.occasion,
                "color_match": score["color_match"],
                "style_match": score["style_match"],
                "occasion_match": score["occasion_match"],
                "overall_match": score["overall_match"],
            })

        return Response(
            {
                "selected_item": {
                    "id": selected_item.id,
                    "name": selected_item.name,
                    "category": selected_item.category,
                },
                "recommendations": response_data
            },
            status=status.HTTP_200_OK
        )
