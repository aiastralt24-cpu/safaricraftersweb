"""Import the six remaining supplied journeys without changing existing URLs.

Usage: bundled-python scripts/import-remaining-journey-docs.py [Journeys-2 folder]
Only these six records are changed. Photographs come from the reviewed local
selection manifest, independently of Word document content.
"""
from pathlib import Path
import json
import re
import sys
from docx import Document
from journey_editorial import apply_editorial_corrections

ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path(sys.argv[1]) if len(sys.argv) > 1 else Path.home() / 'Downloads/Journeys-2'
CONFIG = {
 'deserts-lions-dunesan-expedition-into-indias-wild-heart': ('Desert Dune Lions', 'Safari Crafters Journey – Desert Dune Lions.docx', ['Mumbai','Gir','Velavadar','Rann of Kutch','Jawai','Desert National Park','Jaisalmer']),
 'phantoms-of-the-wild-indias-elusive-small-cats-safari': ('Small Cats of India', 'Safari Crafters Journey – Small Cats of India.docx', ['Kolkata','Velavadar','Jawai','Desert National Park','Jaisalmer']),
 'where-rivers-forests-tigers-thriveterrific-terai': ('Terrific Terai', 'Safari Crafters Journey – Terrific Terai.docx', ['Delhi','Corbett','Rajaji','Pilibhit','Dudhwa']),
 'roar-trumpet-wingbeat-uttarakhands-wilderness-circuit': ('Uttarakhand Circuit', 'Safari Crafters Journey – Uttarakhand Circuit.docx', ['Delhi','Corbett','Rajaji','Chopta','Pangot','Sattal']),
 'where-sky-meets-earthladakh-realm-of-the-snow-leopard': ('Wildlife of Ladakh', 'Safari Crafters Journey – Wildlife of Ladakh.docx', ['Delhi','Leh','Hemis National Park','Pangong Lake','Hanle']),
 'palaces-and-tigers': ('Palaces and Tigers', 'Safari Crafters Journey – .docx', ['Delhi','Jaipur','Ranthambhore','Agra']),
}

def between(items, start, end):
    a = items.index(start) + 1
    b = items.index(end, a)
    return items[a:b]

def following(items, label):
    return items[items.index(label) + 1]

def parse_document(file):
    # Preserve Word line breaks: some questions and answers share a paragraph.
    return [line.strip() for para in Document(file).paragraphs for line in para.text.splitlines() if line.strip()]

def days_from(items):
    result = []
    for line in between(items, 'Day by Day', 'Before We Begin'):
        match = re.match(r'^(Days?\s+\d+(?:\s*[-–]\s*\d+)?)\s*:\s*(.+)$', line)
        if match:
            label = match[1]
            if re.fullmatch(r'Days \d+', label):
                label = label.replace('Days', 'Day')
            result.append({'label': label, 'title': match[2], 'copy': ''})
        elif result:
            result[-1]['copy'] += ('\n\n' if result[-1]['copy'] else '') + line
        else:
            raise ValueError('Itinerary body without a day heading')
    assert result and all(day['copy'] for day in result), 'Incomplete itinerary'
    return result

def faqs_from(items):
    result = []
    for line in between(items, 'Before We Begin', 'Specialist Recommendation'):
        if line.endswith('?'):
            result.append({'question': line, 'answer': ''})
        elif result:
            result[-1]['answer'] += ('\n\n' if result[-1]['answer'] else '') + line
        else:
            raise ValueError('FAQ body without a question')
    assert result and all(faq['answer'] for faq in result), 'Incomplete FAQ'
    return result

def main():
    file = ROOT / 'content/site-content.json'
    content = json.loads(file.read_text())
    photos = json.loads((ROOT / 'content/journey-photo-selections.json').read_text())
    records = {j['slug']: j for j in content['journeys']}
    for slug, (title, source_file, locations) in CONFIG.items():
        items = parse_document(SOURCE / source_file)
        record = records[slug]
        narrative = between(items, 'Signature Safari Route', 'Private Brief')
        highlights = following(items, 'HIGHLIGHTS')
        # Retain the supplied destination chapters as well as the introduction.
        extra = between(items, 'HIGHLIGHTS', 'Day by Day')[1:]
        body = narrative + extra
        # The source document used the old, swapped journey name.
        source_title = 'Royal Rajasthan Safari' if slug == 'palaces-and-tigers' else title
        desc = following(items, source_title)
        body = [text.replace('Royal Rajasthan Safari', title).replace('Royal Rajasthan', title) for text in body]
        duration = int(re.match(r'\d+', following(items, 'Duration'))[0])
        days = days_from(items)
        covered = []
        for day in days:
            numbers = list(map(int, re.findall(r'\d+', day['label'])))
            covered.extend(range(numbers[0], numbers[-1] + 1))
        assert covered == list(range(1, duration + 1)), f'{title}: day coverage mismatch'
        selection = photos[slug]
        images = [selection['hero'], *selection['gallery']]
        for image in images:
            assert (ROOT / 'public' / image['src'].lstrip('/')).is_file(), image['src']
            assert 'generated' not in json.dumps(image).lower(), 'Generated image selected'
        difficulty = following(items, 'Difficulty Level')
        if slug == 'palaces-and-tigers':
            difficulty = 'Gentle to moderate, with jeep safaris and guided cultural exploration'
        # Correct a source counting typo (five habitats are listed, not four).
        if slug.startswith('deserts-'):
            highlights = highlights.replace('Explore four contrasting habitats', 'Explore five contrasting habitats')
        record.update({
            'title': title, 'tagline': selection['tagline'], 'description': desc,
            'category': 'Signature Safari Route', 'style': 'Customisable private journey',
            'duration': f'{duration} days, customisable',
            'route': following(items, 'Route'), 'locations': locations, 'destinations': locations,
            'statesOrRegions': [x.strip() for x in following(items, 'States/Regions').split('·')],
            'region': following(items, 'States/Regions').replace(' · ', ', ').title(),
            'groupSize': following(items, 'Group Size'),
            'difficulty': difficulty,
            'bestMonths': next(x.split(':',1)[1].strip() for x in items if x.startswith('Best Time:')),
            'price': next(x.split(':',1)[1].strip() for x in items if x.startswith('Budget:')),
            'intro': '\n\n'.join(body[:3]), 'body': body, 'highlights': [highlights],
            'idealGuest': following(items,'IDEAL FOR'), 'accessApproach': following(items,'TRANSFERS'),
            'accommodation': following(items,'LODGES AND COMFORT'),
            'wildlifeExpectation': following(items,'WILDLIFE EXPECTATION'),
            'photography': following(items,'PHOTOGRAPHY'), 'pace': following(items,'PACE'),
            'wildlifeFocus': selection['wildlifeFocus'],
            'days': days, 'faqs': faqs_from(items),
            'inclusions': between(items,'Inclusions:','Exclusions:'),
            'exclusions': [x for x in items[items.index('Exclusions:')+1:] if not x.startswith(('Best Time:', 'Budget:'))],
            'image': selection['hero'], 'heroImage': selection['hero'], 'gallery': selection['gallery'],
            'specialist': 'Safari Crafters',
            'seo': {'title': f'{title} | Private Journeys', 'description': desc, 'reviewedAt': 'November 2026'},
        })
        # Old embedded films can depict the previous route.
        record.pop('video', None)
        apply_editorial_corrections(record)
        print(f'{title}: {duration} days, {len(days)} stages, {len(record["faqs"])} FAQs, {len(images)} photographs')
    file.write_text(json.dumps(content, ensure_ascii=False, indent=2) + '\n')

if __name__ == '__main__':
    main()
