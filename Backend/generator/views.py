from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .services import generate_random_outfit


class RandomOutfitView(APIView):

    def get(self, request):
        result = generate_random_outfit()

        if result is None:
            return Response(
                {
                    "error": "Not enough clothing items to generate an outfit."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        top = result["top"]
        bottom = result["bottom"]
        shoes = result["shoes"]
        score = result["score"]

        response_data = {
            "top": {
                "id": top.id,
                "name": top.name,
                "category": top.category,
                "image": request.build_absolute_uri(top.image.url)
                if top.image else None,
                "color": top.color,
                "style": top.style,
                "occasion": top.occasion,
            },

            "bottom": {
                "id": bottom.id,
                "name": bottom.name,
                "category": bottom.category,
                "image": request.build_absolute_uri(bottom.image.url)
                if bottom.image else None,
                "color": bottom.color,
                "style": bottom.style,
                "occasion": bottom.occasion,
            },

            "shoes": {
                "id": shoes.id,
                "name": shoes.name,
                "category": shoes.category,
                "image": request.build_absolute_uri(shoes.image.url)
                if shoes.image else None,
                "color": shoes.color,
                "style": shoes.style,
                "occasion": shoes.occasion,
            },

            "score": score
        }

        return Response(
            response_data,
            status=status.HTTP_200_OK
        )