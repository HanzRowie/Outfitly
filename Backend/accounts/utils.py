from django.core.mail import send_mail


def send_otp_email(user, otp):
    subject = "Outfitly - Email Verification OTP"

    message = f"""
Hello {user.username},

Thank you for registering with Outfitly.

Your verification OTP is:

{otp}

This OTP will expire in 5 minutes.

If you did not create this account, please ignore this email.

Regards,
Outfitly Team
"""

    send_mail(
        subject=subject,
        message=message,
        from_email=None,
        recipient_list=[user.email],
    )