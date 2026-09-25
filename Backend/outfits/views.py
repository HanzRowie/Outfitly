from django.shortcuts import render
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from outfits.models import Outfit
from outfits.serializers import OutfitSerializer

# Create your views here.

class OutfitListCreateView(APIView):
    def get(self,request):

        outfits = Outfit.objects.filter(user=request.user)
        serializer = OutfitSerializer(
            outfits,many = True
        )
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def post(self,request):
        serializer = OutfitSerializer(
            data=request.data
        )
        if serializer.is_valid():
            serializer.save(
                user = request.user
            )

            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )

        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )


class OutfitDetailView(APIView):
    def get_object(self,pk):
        try:
            return Outfit.objects.get(
                pk = pk,
                user=self.request.user
            )
        except Outfit.DoesNotExist:
            return None

    def get(self,request,pk):
        outfit = self.get_object(pk)
        if outfit is None:
            return Response(
                {
                    "error":"Outfit not found."
                },
                status=status.HTTP_404_NOT_FOUND
            )
        serializer = OutfitSerializer(
            outfit
        )
        return Response(
            serializer.data,
            status=status.HTTP_200_OK
        )

    def put(self,request,pk):
        outfit = self.get_object(pk)

        if outfit is None:
            return Response(
                {
                    "error":"Outfit not found."
                },status=status.HTTP_404_NOT_FOUND
            )
        serializer = OutfitSerializer(
            outfit,
            data = request.data
        )
        if serializer.is_valid():
            serializer.save(
                user=request.user
            )
            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def patch(self,request,pk):
        outfit = self.get_object(pk)

        if outfit is None:
            return Response({
                "error":"Outfit not Found."
            },
            status=status.HTTP_404_NOT_FOUND
            )
        serializer = OutfitSerializer(
            outfit,
            data = request.data,
            partial = True
        )
        if serializer.is_valid():
            serializer.save(
                user = request.user
            )
            return Response(
                serializer.data,
                status=status.HTTP_200_OK
            )
        return Response(
            serializer.errors,
            status=status.HTTP_400_BAD_REQUEST
        )

    def delete(self,request,pk):
        outfit = self.get_object(pk)

        if outfit is None:
            return Response({
                "error":"Outfit not Found."
            },
            status=status.HTTP_404_NOT_FOUND
            )
        outfit.delete()

        return Response(
            status=status.HTTP_204_NO_CONTENT
        )
        



