from django.urls import path
from clothings.views import ClothingsListCreateView, ClothingDetailView

urlpatterns = [
    path("", ClothingsListCreateView.as_view(), name="clothing-list-create"),
    path("<int:pk>/", ClothingDetailView.as_view(), name="clothing-detail"),
]