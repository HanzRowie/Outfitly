from django.urls import path
from outfits.views import OutfitDetailView, OutfitListCreateView

urlpatterns = [
    path("", OutfitListCreateView.as_view(), name="outfit-list-create"),
    path("<int:pk>/", OutfitDetailView.as_view(), name="outfit-detail"),
]
