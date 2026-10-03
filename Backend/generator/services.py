import random

from clothings.models import ClothingItem
from recommendations.services import calculate_outfit_score


def generate_random_outfit():
    tops = list(
        ClothingItem.objects.filter(
            category="top",
            is_active=True
        )
    )

    bottoms = list(
        ClothingItem.objects.filter(
            category="bottom",
            is_active=True
        )
    )

    shoes = list(
        ClothingItem.objects.filter(
            category="shoes",
            is_active=True
        )
    )

    if not tops or not bottoms or not shoes:
        return None

    best_outfit = None
    best_score = -1

    max_attempts = 20

    for _ in range(max_attempts):
        top = random.choice(tops)
        bottom = random.choice(bottoms)
        shoe = random.choice(shoes)

        score = calculate_outfit_score(
            top,
            bottom,
            shoe
        )

        if score["overall_match"] > best_score:
            best_score = score["overall_match"]

            best_outfit = {
                "top": top,
                "bottom": bottom,
                "shoes": shoe,
                "score": score
            }

        if best_score >= 80:
            break

    return best_outfit


