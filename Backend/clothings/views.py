from rest_framework.views import APIView
from rest_framework import status
from rest_framework.response import Response

from clothings.models import ClothingItem
from clothings.serializers import ClothingItemSerializer


class ClothingsListCreateView(APIView):

    def get(self, request):
        clothing_items = ClothingItem.objects.filter(
            is_active=True
        )

        category = request.query_params.get("category")

        if category:
            clothing_items = clothing_items.filter(
                category=category
            )

        occasion = request.query_params.get("occasion")

        if occasion:
            clothing_items = clothing_items.filter(
                occasion=occasion
            )

        color = request.query_params.get("color")

        if color:
            clothing_items = clothing_items.filter(
                color=color
            )

        style = request.query_params.get("style")

        if style:
            clothing_items = clothing_items.filter(
                style=style
            )

        serializer = ClothingItemSerializer(
            clothing_items,
            many=True
        )

        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )


# Only admin can add clothing

    def post(self, request):

        if not request.user.is_staff:
            return Response(
                {
                    "error":"Only admin can add clothing items."
                },
                status=status.HTTP_403_FORBIDDEN
            )
        serializer = ClothingItemSerializer(
            data = request.data
        )
        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

class ClothingDetailView(APIView):
    def get_object(self,pk):
        try:
            return ClothingItem.objects.get(pk=pk)
        except ClothingDetailView.DOesNotExist:
            return None

    def get(self,request,pk):
        clothing_item = self.get_object(pk)

        if clothing_item is None:
            return Response(
                {
                    "error":"Clothing item not found."
                },
                status=status.HTTP_404_NOT_FOUND

            )

        if not clothing_item.is_active and not request.user.is_staff:

            return Response(
                {
                    "error":"Clothing item not found."
                },
                status=status.HTTP_404_NOT_Found
            )

        serializer = ClothingItemSerializer(
            clothing_item
        )
        return Response(
               serializer.data,
               status=status.HTTP_201_CREATED

        )
    
         
    def put(self, request, pk):

        # Only admin can update
        if not request.user.is_staff:
            return Response(
                {
                    "error": "Only admin can update clothing items."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        clothing_item = self.get_object(pk)

        # Check if clothing item exists
        if clothing_item is None:
            return Response(
                {
                    "error": "Clothing item not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ClothingItemSerializer(
            clothing_item,
            data=request.data
        )

        if serializer.is_valid():
            serializer.save()

            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def patch(self, request, pk):

        if not request.user.is_staff:
            return Response(
                {
                    "error":"Only admin can update clothing item."
                },
                status=status.HTTP_403_FORBIDDEN
            )

        clothing_item = self.get_object(pk)

        if clothing_item is None:
            return Response(
                {
                    "error":"clothing item not found"
                },
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ClothingItemSerializer(
            clothing_item,
            request.data,
            partial = True
        )
        if serializer.is_valid():
            serializer.save()
            return Response(
               
                    serializer.data,
                    status=status.HTTP_200_OK
            )
        return Response(
           
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self, request,pk):
        if not request.user.is_staff:
            return Response(
                {
                    "error":"Only admin can delete clothing item"
                },
                status=status.HTTPS_403_FORBIDDEN
            )

        clothing_item = self.get_object(pk)

        if clothing_item is None:
            return Response({
                "error":"Clothing item not found"
            },
            status=status.HTTP_404_NOT_FOUND

            )

        clothing_item.delete()

        return Response(
            {
                "message":"Clothing item deleted successfully"
            },
            status=status.HTTP_204_NO_CONTENT
        )


    
    


   



    