from __future__ import annotations

import json
import re
from pathlib import Path

from docx import Document


ROOT = Path(__file__).resolve().parents[1]
CONTENT_PATH = ROOT / "content" / "site-content.json"

SOURCES = {
    "big-cats-of-india": {
        "path": Path("/Users/bunny/Downloads/Journeys/Safari Crafters Journeys – Big Cats of India.docx"),
        "title": "Big Cats of India",
        "region": "Delhi, Ladakh, Rajasthan, Gujarat",
        "duration": "21 days, customisable",
        "route": "Delhi – Ladakh – Ranthambhore – Jawai – Gir",
        "states": ["Delhi", "Ladakh", "Rajasthan", "Gujarat"],
        "locations": ["Delhi", "Ladakh", "Ranthambhore", "Jawai", "Gir"],
        "description": "From the high Himalaya to the last home of the Asiatic lion—a private journey through the landscapes that have always belonged to India’s big cats.",
        "tagline": "Four cats. Four worlds. One India.",
        "wildlife": "Snow leopard · Bengal tiger · Indian leopard · Asiatic lion",
    },
    "trail-of-the-himalayan-firefox-a-red-panda-rhino-expedition": {
        "path": Path("/Users/bunny/Downloads/Journeys/Safari Crafters Journey – Trail of the Himalayan Firefox.docx"),
        "title": "Trail of the Himalayan Firefox",
        "region": "West Bengal, Assam",
        "duration": "12 days, customisable",
        "route": "Delhi – Bagdogra – Singalila – Guwahati – Kaziranga",
        "states": ["West Bengal", "Assam"],
        "locations": ["Delhi", "Bagdogra", "Singalila", "Guwahati", "Kaziranga"],
        "description": "An intimate passage through Northeast India, from Singalila’s cloud forests and red pandas to Kaziranga’s rhinos and great floodplains.",
        "tagline": "Cloud forests. Floodplains. A rare eastern passage.",
        "wildlife": "Red panda · One-horned rhino · Hoolock gibbon · Himalayan birdlife",
    },
    "southern-splendourwhere-forests-hills-wildlife-converge": {
        "path": Path("/Users/bunny/Downloads/Journeys/Safari Crafters Journey – The Southern Arc.docx"),
        "title": "The Southern Arc",
        "region": "Karnataka, Tamil Nadu, Kerala",
        "duration": "11 days, customisable",
        "route": "Bengaluru – Kabini – Bandipur – Anamalais – Eravikulam – Kochi",
        "states": ["Karnataka", "Tamil Nadu", "Kerala"],
        "locations": ["Bengaluru", "Kabini", "Bandipur", "Anamalais", "Eravikulam", "Kochi"],
        "description": "A verdant passage through South India’s forests, waterways and highlands, where exceptional richness is revealed one ecosystem at a time.",
        "tagline": "Water, forest and mountain—South India in one arc.",
        "wildlife": "Tiger · Leopard · Asian elephant · Wild dog · Lion-tailed macaque · Nilgiri tahr",
    },
    "palaces-and-tigers": {
        "path": Path("/Users/bunny/Downloads/Journeys/Safari Crafters Journey – Palaces and Tigers.docx"),
        "title": "Palaces and Tigers",
        "region": "Delhi, Rajasthan, Uttar Pradesh",
        "duration": "15 days, customisable",
        "route": "Delhi – Ranthambhore – Jaipur – Jaisalmer – Jodhpur – Jawai – Udaipur",
        "states": ["Delhi", "Rajasthan", "Uttar Pradesh"],
        "locations": ["Delhi", "Ranthambhore", "Jaipur", "Jaisalmer", "Jodhpur", "Jawai", "Udaipur"],
        "description": "India in its most royal expression—from palatial Rajasthan to tiger forest, leopard country and the shimmering lakes of Udaipur.",
        "tagline": "The royalty of India. The royalty of the wild.",
        "wildlife": "Bengal tiger · Indian leopard · Sloth bear · Rajasthan birdlife",
    },
    "whiskers-stripes-and-roarssafari-adventures-with-indias-big-cats": {
        "path": Path("/Users/bunny/Downloads/Journeys/Safari Crafters Journey – India_s Big Five.docx"),
        "title": "India’s Big Five Safari",
        "region": "Delhi, Assam, Rajasthan, Gujarat",
        "duration": "15 days, customisable",
        "route": "Delhi – Kaziranga – Ranthambhore – Gir – Mumbai",
        "states": ["Delhi", "Assam", "Rajasthan", "Gujarat", "Maharashtra"],
        "locations": ["Delhi", "Guwahati", "Kaziranga", "Jaipur", "Ranthambhore", "Gir", "Mumbai"],
        "description": "India’s most remarkable large mammals brought together across UNESCO-listed floodplains, tiger forest and the last wild home of the Asiatic lion.",
        "tagline": "Five icons. Four wildernesses. One India.",
        "wildlife": "One-horned rhino · Asian elephant · Bengal tiger · Asiatic lion · Indian leopard",
    },
    "heart-of-the-wildcentral-indias-six-park-safari": {
        "path": Path("/Users/bunny/Downloads/Journeys/Safari Crafters Journey – Central India’s Six-Park Safari.docx"),
        "title": "Central India’s Six-Park Safari",
        "region": "Madhya Pradesh, Maharashtra",
        "duration": "22 days, customisable",
        "route": "Delhi – Tadoba – Pench – Kanha – Bandhavgarh – Panna – Satpura – Delhi",
        "states": ["Delhi", "Madhya Pradesh", "Maharashtra"],
        "locations": ["Delhi", "Tadoba", "Pench", "Kanha", "Bandhavgarh", "Panna", "Satpura"],
        "description": "Follow the striped big cat through the wild heart of India—in six forests, discover a hundred ways to experience the tiger.",
        "tagline": "Six forests. One tiger country.",
        "wildlife": "Bengal tiger · Indian leopard · Sloth bear · Wild dog · Gaur",
    },
}


def paragraphs(path: Path) -> list[str]:
    return [paragraph.text.strip() for paragraph in Document(path).paragraphs if paragraph.text.strip()]


def section(items: list[str], start: str, end: str | None) -> list[str]:
    start_index = next((index for index, item in enumerate(items) if item.strip().lower() == start.lower()), -1)
    if start_index < 0:
        return []
    if end is None:
        return items[start_index + 1 :]
    end_index = next((index for index in range(start_index + 1, len(items)) if items[index].strip().lower() == end.lower()), len(items))
    return items[start_index + 1 : end_index]


def parse_days(items: list[str]) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    for item in section(items, "Day by Day", "Before We Begin"):
        match = re.match(r"^((?:Day|Days)\s+\d+(?:\s*[-–]\s*\d+)?)\s*:\s*(.+)$", item, re.I | re.S)
        if match:
            result.append({"label": match.group(1), "title": match.group(2).strip(), "copy": ""})
        elif result:
            result[-1]["copy"] = (result[-1]["copy"] + "\n\n" + item).strip()
    return result


def parse_faqs(items: list[str]) -> list[dict[str, str]]:
    result: list[dict[str, str]] = []
    for item in section(items, "Before We Begin", "Specialist Recommendation"):
        if item.endswith("?"):
            result.append({"question": item, "answer": ""})
        elif result:
            result[-1]["answer"] = (result[-1]["answer"] + "\n\n" + item).strip()
    return result


def parse_list(items: list[str], start: str, end: str | None) -> list[str]:
    return [item for item in section(items, start, end) if item and not item.startswith("—") and not item.lower().startswith(("best time:", "budget:"))]


def parse_narrative(items: list[str]) -> list[str]:
    signature_index = next((index for index, item in enumerate(items) if item == "Signature Safari Route" or item.startswith("Signature Safari Route\n")), -1)
    private_index = next((index for index, item in enumerate(items) if item == "Private Brief"), -1)
    if signature_index < 0 or private_index <= signature_index:
        return []
    first = items[signature_index].split("\n", 1)
    opening = [first[1].strip()] if len(first) > 1 and first[1].strip() else []
    return opening + items[signature_index + 1 : private_index]


def clean_narrative(items: list[str]) -> list[str]:
    labels = {"The Four Worlds"}
    return [item for item in items if item not in labels]


def update_record(record: dict, config: dict) -> None:
    items = paragraphs(config["path"])
    narrative = clean_narrative(parse_narrative(items))
    highlight_index = next((index for index, item in enumerate(items) if item == "HIGHLIGHTS"), -1)
    highlight = items[highlight_index + 1] if highlight_index >= 0 and highlight_index + 1 < len(items) else ""
    best_time = next((item.split(":", 1)[1].strip() for item in items if item.lower().startswith("best time:")), "Seasonal, by specialist recommendation")
    budget = next((item.split(":", 1)[1].strip() for item in items if item.lower().startswith("budget:")), "On request")

    record.update({
        "title": config["title"],
        "tagline": config["tagline"],
        "category": "Signature Safari Route",
        "region": config["region"],
        "duration": config["duration"],
        "groupSize": "Private, bespoke group size",
        "bestMonths": best_time,
        "difficulty": "Gentle to moderate",
        "price": budget,
        "description": config["description"],
        "intro": "\n\n".join(narrative[:3]) or config["description"],
        "body": narrative,
        "highlights": [highlight] if highlight else [],
        "route": config["route"],
        "locations": config["locations"],
        "statesOrRegions": config["states"],
        "inclusions": parse_list(items, "Inclusions:", "Exclusions:"),
        "exclusions": parse_list(items, "Exclusions:", None),
        "destinations": config["locations"],
        "days": parse_days(items),
        "specialist": "Safari Crafters",
        "style": "Customisable private journey",
        "idealGuest": "Private travellers, families and small groups seeking a wildlife-led route shaped around their interests, pace and comfort.",
        "pace": "Unhurried, with the final rhythm shaped around field conditions and guest comfort.",
        "accommodation": "Handpicked wilderness lodges and characterful stays selected for privacy, access, naturalist quality, good food and restorative time between field sessions.",
        "wildlifeFocus": config["wildlife"],
        "accessApproach": "Private transfers and air routing are planned around the final itinerary, with appropriate buffers for terrain, permits and seasonal conditions.",
        "customizationNote": "This is a private journey blueprint. Dates, pacing, accommodation and field priorities are refined around you before confirmation.",
        "faqs": parse_faqs(items),
        "seo": {
            "title": f"{config['title']} | Private Wildlife Journey",
            "description": config["description"],
            "reviewedAt": "September 2026",
        },
    })


def main() -> None:
    content = json.loads(CONTENT_PATH.read_text())
    records = {record["slug"]: record for record in content["journeys"]}
    for slug, config in SOURCES.items():
        update_record(records[slug], config)
    CONTENT_PATH.write_text(json.dumps(content, ensure_ascii=False, indent=2) + "\n")
    print(f"Updated {len(SOURCES)} journey records in {CONTENT_PATH}")


if __name__ == "__main__":
    main()
