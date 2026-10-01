from clothings.models import ClothingItem

COLOR_COMPATIBILITY = {
    "black": {
        "white": 100,
        "gray": 95,
        "beige": 95,
        "navy": 90,
        "blue": 90,
        "olive": 90,
        "brown": 85,
        "yellow": 75,
        "black": 85,
    },

    "white": {
        "black": 100,
        "navy": 100,
        "gray": 95,
        "beige": 95,
        "blue": 90,
        "olive": 90,
        "brown": 85,
        "yellow": 85,
        "white": 80,
    },

    "gray": {
        "black": 95,
        "white": 95,
        "navy": 95,
        "blue": 90,
        "beige": 90,
        "olive": 90,
        "brown": 85,
        "yellow": 75,
        "gray": 90,
    },

    "blue": {
        "black": 90,
        "white": 90,
        "gray": 90,
        "beige": 90,
        "navy": 80,
        "brown": 85,
        "olive": 80,
        "yellow": 70,
        "blue": 85,
    },

    "beige": {
        "black": 95,
        "white": 95,
        "navy": 95,
        "gray": 90,
        "blue": 90,
        "brown": 90,
        "olive": 90,
        "yellow": 75,
        "beige": 90,
    },

    "navy": {
        "white": 100,
        "beige": 95,
        "gray": 95,
        "black": 90,
        "blue": 80,
        "brown": 90,
        "olive": 85,
        "yellow": 75,
        "navy": 85,
    },

    "olive": {
        "black": 90,
        "white": 90,
        "beige": 90,
        "gray": 90,
        "navy": 85,
        "blue": 80,
        "brown": 85,
        "yellow": 75,
        "olive": 85,
    },

    "brown": {
        "white": 85,
        "beige": 90,
        "navy": 90,
        "gray": 85,
        "black": 85,
        "blue": 85,
        "olive": 85,
        "yellow": 70,
        "brown": 85,
    },

    "yellow": {
        "black": 75,
        "white": 85,
        "gray": 75,
        "blue": 70,
        "beige": 75,
        "navy": 75,
        "olive": 75,
        "brown": 70,
        "yellow": 70,
    },
}

STYLE_COMPATIBILITY = {
    "casual": {
        "casual": 100,
        "minimal": 95,
        "streetwear": 95,
        "sporty": 90,
        "business": 70,
        "formal": 60,
    },

    "minimal": {
        "casual": 95,
        "minimal": 100,
        "streetwear": 90,
        "sporty": 80,
        "business": 85,
        "formal": 80,
    },

    "streetwear": {
        "casual": 95,
        "minimal": 90,
        "streetwear": 100,
        "sporty": 90,
        "business": 50,
        "formal": 50,
    },

    "sporty": {
        "casual": 90,
        "minimal": 80,
        "streetwear": 90,
        "sporty": 100,
        "business": 40,
        "formal": 40,
    },

    "business": {
        "casual": 70,
        "minimal": 85,
        "streetwear": 50,
        "sporty": 40,
        "business": 100,
        "formal": 95,
    },

    "formal": {
        "casual": 60,
        "minimal": 80,
        "streetwear": 50,
        "sporty": 40,
        "business": 95,
        "formal": 100,
    },
}

OCCASION_COMPATIBILITY = {
    "casual": {
        "casual": 100,
        "party": 85,
        "travel": 90,
        "business": 70,
        "formal": 60,
        "sports": 75,
    },

    "formal": {
        "casual": 60,
        "party": 80,
        "travel": 60,
        "business": 95,
        "formal": 100,
        "sports": 30,
    },

    "party": {
        "casual": 85,
        "party": 100,
        "travel": 70,
        "business": 75,
        "formal": 80,
        "sports": 50,
    },

    "sports": {
        "casual": 75,
        "party": 50,
        "travel": 70,
        "business": 30,
        "formal": 30,
        "sports": 100,
    },

    "business": {
        "casual": 70,
        "party": 75,
        "travel": 65,
        "business": 100,
        "formal": 95,
        "sports": 30,
    },

    "travel": {
        "casual": 90,
        "party": 70,
        "travel": 100,
        "business": 65,
        "formal": 60,
        "sports": 70,
    },
}


def get_color_score(color1, color2):
    color1 = color1.lower()
    color2 = color2.lower()

    score = COLOR_COMPATIBILITY.get(color1,{}).get(color2)

    if score is not None:
        return score

    score = COLOR_COMPATIBILITY.get(color2,{}).get(color1)

    if score is not None:
        return score
    return 50

def get_style_score(style1, style2):
    style1 = style1.lower()
    style2 = style2.lower()

    score = STYLE_COMPATIBILITY.get(style1,{}).get(style2)

    if score is not None:
        return score

    score = STYLE_COMPATIBILITY.get(style2,{}).get(style1)

    if score is not None:
        return score

    return 50



def get_occasion_score(occasion1, occasion2):
    occasion1 = occasion1.lower()
    occasion2 = occasion2.lower()

    score = OCCASION_COMPATIBILITY.get(occasion1,{}).get(occasion2)

    if score is not None:
        return score

    score = OCCASION_COMPATIBILITY.get(occasion2,{}).get(occasion1)

    if score is not None:
        return score

    return 50


def calculate_outfit_score(top, bottom, shoes):
    color_scores = [
        get_color_score(top.color, bottom.color),
        get_color_score(top.color, shoes.color),
        get_color_score(bottom.color, shoes.color),
    ]

    style_scores = [
        get_style_score(top.style, bottom.style),
        get_style_score(top.style, shoes.style),
        get_style_score(bottom.style, shoes.style),
    ]

    occasion_scores = [
        get_occasion_score(top.occasion, bottom.occasion),
        get_occasion_score(top.occasion, shoes.occasion),
        get_occasion_score(bottom.occasion, shoes.occasion),
    ]

    color_match = sum(color_scores) / len(color_scores)
    style_match = sum(style_scores) / len(style_scores)
    occasion_match = sum(occasion_scores) / len(occasion_scores)

    overall_match = (
        color_match * 0.40
        + style_match * 0.30
        + occasion_match * 0.30
    )

    return {
        "color_match": round(color_match),
        "style_match": round(style_match),
        "occasion_match": round(occasion_match),
        "overall_match": round(overall_match),
    }



def calculate_item_score(selected_item, recommended_item):
    color_score = get_color_score(
        selected_item.color,
        recommended_item.color,
    )

    style_score = get_style_score(
        selected_item.style,
        recommended_item.style
    )

    occasion_score = get_occasion_score(
        selected_item.occasion,
        recommended_item.occasion
    )

    overall_score = (
        color_score * 0.40
        + style_score * 0.30
        + occasion_score * 0.30
    )

    return {
        "color_match": round(color_score),
        "style_match": round(style_score),
        "occasion_match": round(occasion_score),
        "overall_match": round(overall_score),
    }


def recommend_items(selected_item, recommended_category):
    
    items = ClothingItem.objects.filter(
        category=recommended_category,
        is_active=True
    ).exclude(
        id=selected_item.id
    )

    recommendations = []

    for item in items:
        score = calculate_item_score(
            selected_item,
            item
        )

        recommendations.append({
            "item": item,
            "score": score
        })

    recommendations.sort(
        key=lambda recommendation: recommendation["score"]["overall_match"],
        reverse=True
    )

    return recommendations

