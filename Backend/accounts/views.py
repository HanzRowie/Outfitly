from django.shortcuts import render
import random
from datetime import timedelta
from django.core.mail import send_mail
from django.utils import timezone

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status

from .utils import send_otp_email
from accounts.models import OTPVerification

from accounts.serializers import OTPVerificationSerializer, RegisterSerializer

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

        send_otp_email(user,otp,"registration")

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
                user_email=email,
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

        return Response(
            {
                "message": "OTP verified successfully. Your account is now active"
            },
            status=status.HTTP_200_OK
        )
    
    


