from django.urls import path

from accounts.views import RegisterView, VerifyOTPView, ResendOTPView, LoginView

urlpatterns = [
     path(
        "register/",
        RegisterView.as_view(),
        name="register"
    ),

    path(
        "verify-otp/",
        VerifyOTPView.as_view(),
        name="verify-otp"
    ),
    path(
        "resend-otp/",
        ResendOTPView.as_view(),
        name="resend-otp"
    ),
     path(
        "login/",
        LoginView.as_view(),
        name="login"
    ),
]
