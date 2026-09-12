from django.shortcuts import render
import random
from datetime import timedelta
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework_simplejwt.tokens import RefreshToken

from .utils import send_otp_email
from accounts.models import OTPVerification, User

from accounts.serializers import OTPVerificationSerializer, RegisterSerializer, ResendOTPSerializer, LoginSerializer

class RegisterView(APIView):
    def post(self,request):
        serializer = RegisterSerializer(data = request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        user.is_active = False
        user.save(update_fields=["is_active"])

        otp = str(random.randint(100000, 999999))

        expires_at = timezone.now() + timedelta(minutes=5)

        OTPVerification.objects.create(
            user=user,
            otp=otp,
            purpose="registration",
            expires_at=expires_at,
        )

        send_otp_email(user,otp)

        return Response(
            {
                "message": "Registration successful. Please check your email for the OTP.",
                "user_id": user.id,
                "email": user.email,
            },
            status=status.HTTP_201_CREATED,
        )



class VerifyOTPView(APIView):
    def post(self, request):

        serializer = OTPVerificationSerializer(data=request.data)

        # Validate serializer before accessing validated_data
        if not serializer.is_valid():
            return Response(
                serializer.errors,
                status=status.HTTP_400_BAD_REQUEST
            )

        email = serializer.validated_data["email"]
        otp = serializer.validated_data["otp"]

        try:
            otp_record = OTPVerification.objects.get(
                user__email=email,
                otp=otp,
                purpose="registration",
                is_verified=False,
            )

        except OTPVerification.DoesNotExist:
            return Response(
                {
                    "error": "Invalid OTP."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Check if OTP has expired
        if otp_record.expires_at < timezone.now():
            return Response(
                {
                    "error": "OTP has expired."
                },
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark OTP as verified
        otp_record.is_verified = True

        otp_record.save(
            update_fields=["is_verified"]
        )

        user = otp_record.user
        user.is_active = True
        user.save(
            update_fields=["is_active"]
        )

        return Response(
            {
                "message": "OTP verified successfully. Your account is now active"
            },
            status=status.HTTP_200_OK
        )
    
    
class ResendOTPView(APIView):
    def post(self, request):

        serializer = ResendOTPSerializer(
            data=request.data
        )

        serializer.is_valid(
            raise_exception=True
        )

        email = serializer.validated_data["email"]

        # Find the user
        try:
            user = User.objects.get(
                email=email
            )

        except User.DoesNotExist:

            return Response(
                {
                    "error": "User with this email does not exist."
                },
                status=status.HTTP_404_NOT_FOUND,
            )

        # Check whether email is already verified
        if user.is_active:

            return Response(
                {
                    "error": "This email is already verified."
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        # Invalidate old registration OTPs
        OTPVerification.objects.filter(
            user=user,
            purpose="registration",
            is_verified=False,
        ).update(
            is_verified=True
        )

        # Generate new OTP
        otp = str(
            random.randint(100000, 999999)
        )

        # New OTP expires in 5 minutes
        expires_at = (
            timezone.now()
            + timedelta(minutes=5)
        )

        # Save new OTP
        OTPVerification.objects.create(
            user=user,
            otp=otp,
            purpose="registration",
            expires_at=expires_at,
        )

        # Send new OTP email
        send_otp_email(
            user,
            otp
        )

        return Response(
            {
                "message": "A new verification code has been sent to your email.",
                "email": user.email,
            },
            status=status.HTTP_200_OK,
        )

class LoginView(APIView):
    def post(self,request):
        serializer = LoginSerializer(data = request.data)

        serializer.is_valid(
            raise_exception=True
        )
        user = serializer.validated_data["user"]

        refresh = RefreshToken.for_user(user)

        return Response(
            {
                "message": "Login successful.",

                "user": {
                    "id": user.id,
                    "username": user.username,
                    "email": user.email,
                },

                "tokens": {
                    "refresh": str(refresh),
                    "access": str(refresh.access_token),
                }
            },

            status=status.HTTP_200_OK,
        )
        