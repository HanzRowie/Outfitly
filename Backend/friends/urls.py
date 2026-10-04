from django.urls import path

from .views import (
    UserListView,
    FriendRequestCreateView,
    FriendRequestListView,
    FriendRequestActionView,
)


urlpatterns = [
    path("users/", UserListView.as_view(), name="friend-users"),

    path(
        "requests/",
        FriendRequestListView.as_view(),
        name="friend-requests"
    ),

    path(
        "requests/send/",
        FriendRequestCreateView.as_view(),
        name="send-friend-request"
    ),
    path(
    "requests/<int:pk>/",
    FriendRequestActionView.as_view(),
    name="friend-request-action"
),
]