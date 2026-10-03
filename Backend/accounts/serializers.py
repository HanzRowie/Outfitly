from rest_framework import serializers
from .models import OTPVerification, User
from django.contrib.auth import authenticate
from accounts.models import Profile

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id","email", "username", "profile"]

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = [
            "email",
            "username",
            "password",
            "confirm_password",
            "profile",
        ]

    def validate(self, data):
        if data["password"] != data["confirm_password"]:
            raise serializers.ValidationError(
                "Passwords do not match."
            )
        return data

    def create(self, validated_data):
        validated_data.pop("confirm_password")
        return User.objects.create_user(**validated_data)

class OTPVerificationSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField(
        max_length=6,
        min_length=6
    )

    def validate_otp(self, value):
        if not value.isdigit():
            raise serializers.ValidationError(
                "OTP must contain only numbers."
            )
        return value



class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()



class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data["email"]
        password = data["password"]

        try:
            user = User.objects.get(email = email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "Invalid email or password"
            )

        if not user.is_active:
            raise serializers.ValidationError(
                "Please verify your email before logging in"
            )

        user = authenticate(
            username =user.username,
            password = password
        )

        if user is None:
            raise serializers.ValidationError(
                "Invalid email or password"
            )

        data["user"] = user

        return data



class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username",
        read_only=True)

    email = serializers.EmailField(
        source="user.email",
        read_only=True
    )

    first_name = serializers.CharField(
        source="user.first_name",
        required=False
    )

    last_name = serializers.CharField(
        source="user.last_name",
        required=False
    )

    class Meta:
        model = Profile
        fields = [
            "username",
            "email",
            "first_name",
            "last_name",
            "profile_picture",
            "bio",
        ]

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})

        user = instance.user

        if "first_name" in user_data:
            user.first_name = user_data["first_name"]

        if "last_name" in user_data:
            user.last_name = user_data["last_name"]

        user.save()

        return super().update(instance, validated_data)

    