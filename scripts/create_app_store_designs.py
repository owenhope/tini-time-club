from pathlib import Path
from textwrap import wrap

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app-store-designs"
W, H = 1242, 2688

SCREENSHOTS = ROOT / "scripts" / "screenshots" / "output" / "raw"
FONT_HEADLINE = "/System/Library/Fonts/Supplemental/Arial Black.ttf"
FONT_SUBHEAD = "/System/Library/Fonts/SFNS.ttf"
FONT_LABEL = "/System/Library/Fonts/SFNS.ttf"


DESIGNS = [
    {
        "slug": "feed",
        "source": "01-feed.png",
        "headline": "REVIEW",
        "subhead": "Rate it. Share it. Repeat.",
        "background": "#6B50A9",
        "ink": "#FFFFFF",
        "sub_ink": "#FFFFFF",
        "accent": "#BFA7F2",
    },
    {
        "slug": "review-detail",
        "source": "02-review.png",
        "headline": "RATE",
        "subhead": "Taste and presentation, olive by olive.",
        "background": "#6B50A9",
        "ink": "#FFFFFF",
        "sub_ink": "#FFFFFF",
        "accent": "#BFA7F2",
    },
    {
        "slug": "comments",
        "source": "03-comments.png",
        "headline": "TALK",
        "subhead": "Compare notes with the club.",
        "background": "#6B50A9",
        "ink": "#FFFFFF",
        "sub_ink": "#FFFFFF",
        "accent": "#BFA7F2",
    },
    {
        "slug": "explore-map",
        "source": "04-map.png",
        "headline": "DISCOVER",
        "subhead": "Explore nearby pours.",
        "background": "#6B50A9",
        "ink": "#FFFFFF",
        "sub_ink": "#FFFFFF",
        "accent": "#BFA7F2",
    },
    {
        "slug": "regulars",
        "source": "05-regulars.png",
        "headline": "REGULARS",
        "subhead": "See where locals return.",
        "background": "#6B50A9",
        "ink": "#FFFFFF",
        "sub_ink": "#FFFFFF",
        "accent": "#BFA7F2",
    },
    {
        "slug": "profile",
        "source": "06-profile.png",
        "headline": "HISTORY",
        "subhead": "Your pours, remembered.",
        "background": "#6B50A9",
        "ink": "#FFFFFF",
        "sub_ink": "#FFFFFF",
        "accent": "#BFA7F2",
    },
    {
        "slug": "passport",
        "source": "07-passport.png",
        "headline": "PASSPORT",
        "subhead": "Earn stamps. Climb the ranks.",
        "background": "#6B50A9",
        "ink": "#FFFFFF",
        "sub_ink": "#FFFFFF",
        "accent": "#BFA7F2",
    },
    {
        "slug": "golden-glass",
        "source": "08-golden-glass.png",
        "headline": "TOP SPOTS",
        "subhead": "Vancouver’s best martinis.",
        "background": "#6B50A9",
        "ink": "#FFFFFF",
        "sub_ink": "#FFFFFF",
        "accent": "#BFA7F2",
    },
    {
        "slug": "martini-index",
        "source": "09-index.png",
        "headline": "LEARN",
        "subhead": "Know your classics.",
        "background": "#6B50A9",
        "ink": "#FFFFFF",
        "sub_ink": "#FFFFFF",
        "accent": "#BFA7F2",
    },
]


def font(path: str, size: int):
    return ImageFont.truetype(path, size)


def fit_text(draw, text, max_width, preferred_size, path):
    size = preferred_size
    while size >= 48:
        f = font(path, size)
        if draw.textbbox((0, 0), text, font=f)[2] <= max_width:
            return f
        size -= 2
    return font(path, 48)


def draw_wrapped(
    draw,
    text,
    xy,
    max_width,
    fnt,
    fill,
    line_gap=14,
    max_lines=2,
    center_x=None,
):
    words = text.split()
    lines = []
    current = ""
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textbbox((0, 0), candidate, font=fnt)[2] <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        raise ValueError(f"Text exceeds {max_lines} lines: {text}")

    x, y = xy
    line_height = fnt.getbbox("Ag")[3] - fnt.getbbox("Ag")[1]
    max_bottom = y
    for line in lines:
        line_width = draw.textbbox((0, 0), line, font=fnt)[2]
        line_x = center_x - line_width / 2 if center_x is not None else x
        draw.text((line_x, y), line, font=fnt, fill=fill)
        max_bottom = max(max_bottom, draw.textbbox((line_x, y), line, font=fnt)[3])
        y += line_height + line_gap
    return max_bottom + line_gap


def rounded_screenshot(source: Image.Image, width: int, height: int, radius: int):
    source = source.convert("RGB")
    source_ratio = source.width / source.height
    target_ratio = width / height
    if source_ratio > target_ratio:
        crop_width = int(source.height * target_ratio)
        left = (source.width - crop_width) // 2
        source = source.crop((left, 0, left + crop_width, source.height))
    else:
        crop_height = int(source.width / target_ratio)
        top = (source.height - crop_height) // 2
        source = source.crop((0, top, source.width, top + crop_height))
    source = source.resize((width, height), Image.Resampling.LANCZOS)

    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, width - 1, height - 1), radius, fill=255)
    card = Image.new("RGB", (width, height), "white")
    card.paste(source, (0, 0), mask)
    return card, mask


def create_design(design):
    canvas = Image.new("RGB", (W, H), design["background"])
    draw = ImageDraw.Draw(canvas)

    # Small brand marker gives the set a shared system without competing with the copy.
    label_font = font(FONT_LABEL, 27)
    draw.text((90, 76), "TINI TIME CLUB", font=label_font, fill=design["accent"])

    headline_font = fit_text(draw, design["headline"], 1062, 132, FONT_HEADLINE)
    headline_y = 142
    headline_bottom = draw_wrapped(
        draw,
        design["headline"],
        (90, headline_y),
        1062,
        headline_font,
        design["ink"],
        line_gap=5,
        max_lines=2,
        center_x=W / 2,
    )

    subhead_font = font(FONT_SUBHEAD, 48)
    subhead_y = headline_bottom + 30
    subhead_bottom = draw_wrapped(
        draw,
        design["subhead"],
        (90, subhead_y),
        1062,
        subhead_font,
        design["sub_ink"],
        line_gap=6,
        max_lines=2,
        center_x=W / 2,
    )

    # Keep the complete source screen visible, including the status bar and bottom navigation.
    card_width = 940
    card_height = round(card_width * 2622 / 1206)
    card_x = (W - card_width) // 2
    card_y = max(590, subhead_bottom + 90)
    if card_y + card_height > H - 48:
        raise ValueError(f"Card does not fit without cropping: {design['slug']}")

    source_path = SCREENSHOTS / design["source"]
    screenshot = Image.open(source_path)
    card, mask = rounded_screenshot(screenshot, card_width, card_height, 48)

    shadow = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle(
        (card_x + 10, card_y + 18, card_x + card_width + 10, card_y + card_height + 18),
        48,
        fill=(0, 0, 0, 66),
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    canvas = Image.alpha_composite(canvas.convert("RGBA"), shadow)
    canvas.paste(card, (card_x, card_y), mask)

    # A thin accent rim separates the screenshot from the background like the reference cards.
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (card_x, card_y, card_x + card_width - 1, card_y + card_height - 1),
        48,
        outline=design["accent"],
        width=5,
    )
    return canvas.convert("RGB")


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    for design in DESIGNS:
        output = OUT / f"{design['slug']}-1242x2688.png"
        create_design(design).save(output, format="PNG", optimize=True)
        print(output)


if __name__ == "__main__":
    main()
