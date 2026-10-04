from django.urls import path
from .views import RecommendationView, OutfitScoreView

urlpatterns = [
    path("", RecommendationView.as_view(), name="recommendations"),
    path("score/", OutfitScoreView.as_view(), name="outfit-score"),
]