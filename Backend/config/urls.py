
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/accounts/",include("accounts.urls")),
    path("api/clothing/", include("clothings.urls")),
    path("api/outfits/",include("outfits.urls")),
]

