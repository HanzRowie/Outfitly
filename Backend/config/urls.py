
from django.contrib import admin
from django.urls import path, include, re_path
from django.views.static import serve
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

urlpatterns = [
    path('admin/', admin.site.urls),
    path("api/accounts/",include("accounts.urls")),
    path("api/clothing/", include("clothings.urls")),
    path("api/outfits/",include("outfits.urls")),
    path("api/recommendations/", include("recommendations.urls")),
    path("api/generator/", include("generator.urls")),
    re_path(r'^clothing/(?P<path>.*)$', serve, {'document_root': BASE_DIR / 'clothing'}),
    re_path(r'^media/clothing/(?P<path>.*)$', serve, {'document_root': BASE_DIR / 'clothing'}),
    re_path(r'^profiles/(?P<path>.*)$', serve, {'document_root': BASE_DIR / 'profiles'}),
    re_path(r'^media/profiles/(?P<path>.*)$', serve, {'document_root': BASE_DIR / 'profiles'}),
    path("api/friends/", include("friends.urls")),
]

