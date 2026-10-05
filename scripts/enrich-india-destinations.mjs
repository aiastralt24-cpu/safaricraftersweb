import fs from "node:fs";

const path = new URL("../content/site-content.json", import.meta.url);
const content = JSON.parse(fs.readFileSync(path, "utf8"));
const reviewedAt = "2026-07-18";

const sources = {
  ranthambhore: [["Ranthambore National Park", "Rajasthan Tourism", "https://www.tourism.rajasthan.gov.in/ranthambore.html"]],
  jawai: [["Jawai Leopard Conservation Reserve reference", "Government of Rajasthan", "https://www.greentribunal.gov.in/sites/default/files/news_updates/List%20of%20Document%20by%20R-%208%20%26%209%20in%20OA%20No.%20252%20of%202023%20%28Bhera%20lal%20Goyal%20%26%20Ors.%20Vs.%20MoEF%26CC%20%26%20Ors.%29.pdf"]],
  "spiti-valley": [["Spiti Valley", "Himachal Tourism", "https://himachaltourism.gov.in/destination/spiti-valley/"]],
  singalila: [["Singalila National Park", "Incredible India", "https://www.incredibleindia.gov.in/en/west-bengal/darjeeling/singalila-national-park"]],
  ladakh: [["Ladakh Wildlife and Travel Essentials", "Ladakh Tourism", "https://tourism.ladakh.gov.in/"], ["Hemis National Park", "Incredible India", "https://www.incredibleindia.gov.in/en/ladakh/leh/hemis-national-park"]],
  bandhavgarh: [["Bandhavgarh Tiger Reserve", "Madhya Pradesh Forest Department", "https://forest.mponline.gov.in/eBrochure/eBrochureDetailsV2.aspx?parkid=1"]],
  kanha: [["Kanha Tiger Reserve", "Madhya Pradesh Forest Department", "https://forest.mponline.gov.in/eBrochure/eBrochureDetailsV2.aspx?parkid=2"]],
  pench: [["Pench Tiger Reserve", "Madhya Pradesh Forest Department", "https://forest.mponline.gov.in/eBrochure/eBrochureDetailsV2.aspx?parkid=4"]],
  tadoba: [["Tadoba Andhari Tiger Reserve", "Maharashtra Tourism", "https://maharashtratourism.gov.in/wildlife/tadoba-andhari-tiger-reserve/"]],
  panna: [["Panna Tiger Reserve", "Madhya Pradesh Forest Department", "https://forest.mponline.gov.in/eBrochure/eBrochureDetailsV2.aspx?parkid=3"]],
  satpura: [["Satpura Tiger Reserve", "Madhya Pradesh Forest Department", "https://forest.mponline.gov.in/eBrochure/eBrochureDetailsV2.aspx?parkid=5"]],
  kaziranga: [["Kaziranga National Park", "Assam Tourism", "https://assamtourism.gov.in/Kaziranga1.php"]],
  bandipur: [["Bandipur National Park", "Karnataka Tourism", "https://karnatakatourism.org/en/experiences/bandipur-national-park"]],
  kabini: [["Nagarhole Wildlife Experience", "Karnataka Tourism", "https://karnatakatourism.org/en/experiences/nagarhole-wildlife-experience/"], ["Kabini Landscapes and Wildlife", "Karnataka Tourism", "https://old.karnatakatourism.org/kabini-the-land-of-spectacular-landscapes-and-wildlife/"]],
  sunderbans: [["Sundarbans National Park", "UNESCO World Heritage Centre", "https://whc.unesco.org/en/list/452"], ["Sundarbans", "West Bengal Tourism", "https://www.wbtourism.gov.in/Wildlife/details?id=638f90b09e20437bfb0ce140&template_id=1"]],
  dudhwa: [["Dudhwa National Park", "Uttar Pradesh Eco-Tourism Development Board", "https://upecoboard.up.gov.in/en/article/dudhwa-national-park"]],
  pilibhit: [["Pilibhit Tiger Reserve", "Uttar Pradesh Eco-Tourism Development Board", "https://upecoboard.up.gov.in/en/article/pilibhit-tiger-reserve"]],
  gir: [["Gir National Park", "Gujarat Tourism", "https://www.gujarattourism.com/content/dam/gujrattourism/images/ebroucher/gir_national_park_9.pdf"]]
};

const research = {
  ranthambhore: {
    bestMonths: "October to June; November to February for cooler drives, March to May for hotter, drier conditions",
    wildlife: "Bengal tiger, leopard, sloth bear, sambar, chital, nilgai, marsh crocodile and dry-forest birdlife",
    habitat: "Dry deciduous dhok forest, rocky Aravalli-Vindhya hills, lakes, rivulets, meadows and historic ruins",
    idealStay: "3-4 nights, allowing several drives across different requested zones",
    gateway: "Sawai Madhopur rail station; Jaipur is the practical air gateway",
    access: "Private road transfer from Jaipur or rail from Delhi, Mumbai or Jaipur. Safari zones and permits should be reserved well in advance.",
    safariRhythm: "Morning and afternoon vehicle safaris, with zone requests balanced across lake, hill and dry-forest habitat.",
    photography: "Tiger behaviour within a layered fort-and-lake landscape; long lenses are useful, while a wider body records ruins, water and habitat.",
    bestFor: ["First India safari", "Tiger photography", "Rajasthan pairings"],
    description: "Ranthambhore is a dry-forest tiger landscape of lakes, escarpments and ruins near Sawai Madhopur, open for park tourism from October to June.",
    intro: "Ranthambhore sits where the Aravalli and Vindhya ranges meet. Dhok woodland, open meadows, seasonal water and the silhouette of a 10th-century fort give the reserve a visual identity unlike any other major tiger park.\n\nThe park is deservedly associated with Bengal tigers, but a considered visit also watches for leopard, sloth bear, sambar, marsh crocodile and raptors. Permit demand is high, so the quality of a journey depends on early booking, sensible zone requests and enough drives to let the forest reveal more than a single sighting."
  },
  jawai: {
    bestMonths: "October to March for cooler weather; leopard tracking operates seasonally and should be locally reconfirmed",
    wildlife: "Indian leopard, striped hyena, mugger crocodile, flamingos and other waterbirds around the Jawai reservoir",
    habitat: "Granite outcrops, scrub, village commons, grazing land and the Jawai reservoir in Rajasthan's Pali district",
    idealStay: "2-3 nights for dawn and late-afternoon tracking plus time in the wider landscape",
    gateway: "Udaipur or Jodhpur, selected around the wider Rajasthan route",
    access: "Private road transfer into the Jawai-Bera landscape. This is a lived-in conservation landscape, so guiding and local conduct matter as much as vehicle access.",
    safariRhythm: "Early and late drives scan granite ridges and cave systems, leaving the middle of the day for rest, reservoir birding or village context.",
    photography: "Leopards against exposed granite, broad environmental frames, pastoral life and changing desert light rather than close forest portraiture.",
    bestFor: ["Leopard tracking", "Human-wildlife coexistence", "Rajasthan extensions"],
    description: "Jawai is a leopard landscape of granite hills, scrub and pastoral settlements in Rajasthan, where wildlife viewing takes place beyond a conventional national park.",
    intro: "Jawai is defined by weathered granite, open scrub and villages rather than a fenced reserve. Leopards use caves and ridgelines within a landscape shared with pastoral communities, making local knowledge and respectful field practice central to the experience.\n\nThe reservoir adds a second ecological register, drawing crocodiles and seasonal birdlife. A private stay works best at an unhurried pace, with repeated dawn and evening scans rather than any promise of a particular animal appearing on command."
  },
  "spiti-valley": {
    bestMonths: "January to March for specialist snow-leopard tracking; May to October for general valley travel",
    wildlife: "Snow leopard, bharal or blue sheep, ibex, red fox, Himalayan wolf and high-altitude raptors",
    habitat: "Cold-desert valleys, cliffs, scree, high plateaux and village landscapes around Kibber and the upper Spiti basin",
    idealStay: "7-10 nights in winter, including acclimatisation and weather buffers",
    gateway: "Chandigarh or Delhi, followed by a staged high-altitude road journey",
    access: "Winter access is weather-dependent and requires acclimatisation, warm local accommodation, experienced trackers and schedule flexibility.",
    safariRhythm: "Long, patient scans from fixed vantage points, short repositioning walks and warm returns; the day is governed by tracks, weather and altitude.",
    photography: "Distant wildlife in vast scale, snow texture and environmental storytelling; long lenses, batteries protected from cold and realistic expectations are essential.",
    bestFor: ["Snow leopard tracking", "Experienced wildlife travellers", "High-altitude photography"],
    description: "Spiti is a high-altitude cold desert where specialist winter journeys around Kibber search patiently for snow leopard and its mountain prey.",
    intro: "The upper Spiti landscape is a world of eroded cliffs, frozen watercourses and high villages. Himachal Tourism identifies the country around Kibber as recognised snow-leopard habitat, but seeing one remains a matter of tracking skill, time and considerable patience.\n\nThis is not a conventional vehicle safari. Days involve prolonged scanning in cold conditions, moderate walking and a flexible response to weather. Acclimatisation and the welfare of guests, trackers and wildlife take precedence over a fixed checklist."
  },
  singalila: {
    bestMonths: "March to May and October to early December, subject to park access and monsoon conditions",
    wildlife: "Red panda, Himalayan black bear, barking deer and more than 120 reported Himalayan and Indo-Burma bird species",
    habitat: "Eastern Himalayan ridge with oak, bamboo, magnolia, rhododendron forest and high-elevation grassland",
    idealStay: "4-6 nights for repeated forest walks and weather flexibility",
    gateway: "Bagdogra Airport or New Jalpaiguri, followed by a road transfer into the Darjeeling hills",
    access: "Tracking is primarily on foot with local naturalists. Ridge weather and visibility change quickly, and park access should be reconfirmed before travel.",
    safariRhythm: "Slow morning and afternoon forest walks focused on bamboo understorey, feeding signs, bird calls and quiet observation.",
    photography: "Forest wildlife at close working distances, often in low light; a fast telephoto, weather protection and restrained movement are more useful than heavy vehicle-safari equipment.",
    bestFor: ["Red panda tracking", "Forest walking", "Himalayan birding"],
    description: "Singalila National Park protects oak, bamboo and rhododendron forest on an Eastern Himalayan ridge known for red panda and mountain birdlife.",
    intro: "Singalila rises along the Darjeeling ridge in a transition of oak, magnolia, bamboo and rhododendron. The endangered red panda is the principal wildlife focus, joined by a rich assemblage of Himalayan and Indo-Burma birds.\n\nA visit is shaped by walking, cloud and forest patience rather than road-based safari. Repeated outings with a local tracker create the best chance of reading fresh signs while also leaving room for ridge landscapes and the changing light around Kanchenjunga."
  },
  ladakh: {
    bestMonths: "November to February for specialist winter wildlife; May to September for broader high-altitude exploration",
    wildlife: "Snow leopard, bharal, Ladakh urial, ibex, Tibetan wolf, red fox, marmot and high-altitude birds",
    habitat: "Trans-Himalayan cold desert, Indus tributary valleys, cliffs, alpine steppe and high-altitude wetlands",
    idealStay: "8-12 nights, including acclimatisation in Leh and weather buffers",
    gateway: "Kushok Bakula Rimpochee Airport, Leh",
    access: "A minimum acclimatisation period in Leh is essential. Wildlife routes vary by snow, road conditions and recent tracking information.",
    safariRhythm: "Vehicle-supported valley searches combined with long scans and measured walks, always adjusted for altitude and weather.",
    photography: "Wildlife is often distant and embedded in immense terrain; long lenses, landscape focal lengths, cold-weather battery care and stable support are important.",
    bestFor: ["Snow leopard habitat", "High-altitude natural history", "Landscape photography"],
    description: "Ladakh is a high-altitude wildlife landscape of cold desert, cliffs and river valleys, with Hemis National Park protecting important snow-leopard habitat.",
    intro: "Ladakh's wildlife lives at the scale of mountains. Hemis National Park and neighbouring valleys support snow leopard, blue sheep, urial, ibex, wolf and high-altitude birds across terrain that demands time and acclimatisation.\n\nWinter offers tracking conditions for specialist snow-leopard journeys; summer opens a wider landscape of wetlands, monasteries and alpine routes. In either season, the itinerary must remain secondary to altitude safety, road conditions and responsible local guidance."
  },
  bandhavgarh: {
    bestMonths: "15 October to 15 June; cooler from November to February and hotter, drier from March onward",
    wildlife: "Bengal tiger, leopard, dhole, sambar, chital, nilgai, wild boar and sal-forest birdlife",
    habitat: "Sal and mixed forest, bamboo, steep hills, valleys, marshes, meadows and the Bandhavgarh plateau",
    idealStay: "3-4 nights with drives requested across Tala, Magadhi and Khitauli where practical",
    gateway: "Jabalpur is the principal air gateway; Katni and Umaria are useful railheads",
    access: "Private road transfer to the lodge gate. Permit allocation is zone-specific, so lodge position and confirmed entry gate should be planned together.",
    safariRhythm: "Morning and afternoon drives alternate sal forest, meadow and hill country; repeated drives reduce dependence on a single zone.",
    photography: "Tiger and prey behaviour in enclosed sal woodland and open meadows; fast lenses help in forest shade, while longer focal lengths suit meadow edges.",
    bestFor: ["Tiger-focused safaris", "Sal forest", "Central India circuits"],
    description: "Bandhavgarh is a compact Central Indian tiger landscape of sal forest, meadows, hills and historic plateau country, open from mid-October to mid-June.",
    intro: "Bandhavgarh combines sal woodland with bamboo, marshes, meadow systems and the dramatic rise of its central plateau. The official reserve lists tiger, leopard, wild dog and a wide range of herbivores among its fauna.\n\nThree principal tourism zones create distinct drive experiences. A good private plan considers lodge location, gate logistics and a spread of confirmed permits, allowing time for both patient tracking and the broader ecology of the forest."
  },
  kanha: {
    bestMonths: "15 October to 30 June; November to February is cooler, while March to May is drier and hotter",
    wildlife: "Hard-ground barasingha, Bengal tiger, dhole, gaur, leopard, sloth bear and more than 300 recorded bird species",
    habitat: "Sal and mixed forest, bamboo, broad meadows and seasonal streams across the Kanha landscape",
    idealStay: "4 nights for a considered spread across gate areas and habitats",
    gateway: "Jabalpur, Raipur or Nagpur, selected according to Khatia, Mukki or Sarhi gate",
    access: "Private road transfer must be matched to the confirmed gate and lodge. Kanha has multiple core and buffer zones with separate permit allocations.",
    safariRhythm: "Dawn and afternoon drives balance meadow edges, sal forest and water systems, with quiet rest between outings.",
    photography: "Barasingha in open meadows, forest atmosphere and patient predator tracking; carry both a long lens and a wider option for habitat.",
    bestFor: ["Forest immersion", "Barasingha conservation", "Longer tiger safaris"],
    description: "Kanha is a large sal-forest and meadow reserve central to the recovery of the hard-ground barasingha, alongside tiger, dhole and gaur.",
    intro: "Kanha's broad meadows open between sal forest and bamboo, creating one of Central India's most complete wildlife landscapes. Its defining conservation story is the recovery of the hard-ground barasingha, found here with tiger, dhole, gaur and rich birdlife.\n\nThe reserve has several entry gates and tourism zones. Rather than treating them as interchangeable, Safari Crafters aligns lodge location, transfer route and confirmed permits so that the days remain calm and time in habitat is protected."
  },
  pench: {
    bestMonths: "15 October to 30 June, with winter birdlife and increasingly dry conditions toward summer",
    wildlife: "Bengal tiger, leopard, dhole, gaur, sambar, chital, wolf and approximately 325 seasonally recorded bird species",
    habitat: "Teak and mixed deciduous forest, open grass, riverine woodland and the Pench-Totladoh water system",
    idealStay: "3 nights, longer when paired with another Central India reserve",
    gateway: "Nagpur is the most practical air gateway for the main Madhya Pradesh gates",
    access: "Private road transfer to Turia, Karmajhiri or Jamtara should follow the confirmed permit gate; Maharashtra-side access is planned separately.",
    safariRhythm: "Two drives daily through teak forest and open clearings, with winter attention to waterbirds and summer focus around remaining water.",
    photography: "Open teak woodland can offer clear sight lines; changing forest light and water-edge activity reward flexible focal lengths.",
    bestFor: ["Teak forest safaris", "Birdlife", "Kanha or Tadoba pairings"],
    description: "Pench protects teak and mixed forest around the Pench River, with tiger, dhole, gaur and substantial seasonal birdlife.",
    intro: "Pench is a teak-dominated forest of river channels, old village clearings and the wider Totladoh water system. Its fauna includes tiger, leopard, wild dog, gaur and a diverse bird community that changes with season.\n\nThe reserve is approached through distinct gates on the Madhya Pradesh and Maharashtra sides. A well-built itinerary begins with the permit, then chooses the lodge and transfer, avoiding the common mistake of treating every Pench address as equally close to every safari zone."
  },
  tadoba: {
    bestMonths: "October to May; November to February is cooler, while February to May is drier with intense heat later in the season",
    wildlife: "Bengal tiger, leopard, dhole, sloth bear, gaur, sambar, chital and dry-forest birdlife",
    habitat: "Tropical dry deciduous forest, bamboo, grassland, Tadoba Lake and a network of seasonal and permanent water sources",
    idealStay: "3-4 nights, with gate choice matched to confirmed permits",
    gateway: "Nagpur Airport; Chandrapur is the nearest major rail and road centre",
    access: "Private road transfer from Nagpur or Chandrapur. Moharli, Kolara, Navegaon and other gates serve different sectors and are not interchangeable.",
    safariRhythm: "Morning and afternoon drives; later dry-season visits focus on water while respecting the physical demands of extreme heat.",
    photography: "Dry forest, bamboo corridors and waterhole behaviour; heat haze becomes an important technical consideration in late season.",
    bestFor: ["Tiger-focused travel", "Dry-season safaris", "Pench pairings"],
    description: "Tadoba-Andhari is a dry-deciduous tiger reserve in Maharashtra, reached from Nagpur and explored through several distinct safari gates.",
    intro: "Tadoba-Andhari combines dry deciduous forest, bamboo and lakes with a strong assemblage of tiger, leopard, wild dog, sloth bear and gaur. Conditions change markedly from cool winter mornings to the severe heat of late spring.\n\nGate geography matters. Safari permits, lodge position and transfer time must be planned as one decision, particularly where a multi-night stay uses more than one tourism sector."
  },
  panna: {
    bestMonths: "15 October to 15 June; the cooler months suit comfort, while spring becomes progressively hotter and drier",
    wildlife: "Bengal tiger, leopard, dhole, wolf, sloth bear, chowsingha, vultures and riverine wildlife",
    habitat: "Vindhyan plateaux, gorges, dry deciduous forest, grassland and the Ken River",
    idealStay: "2-3 nights, especially when paired with Khajuraho or another Central India reserve",
    gateway: "Khajuraho is the closest practical air and rail gateway",
    access: "Short private transfer from Khajuraho to the Madla side; permits may also use Hinauta and should determine lodge placement.",
    safariRhythm: "Morning and afternoon drives across plateau and river country, with time for the Ken landscape and vulture observation.",
    photography: "River, gorge and plateau compositions add scale beyond predator portraiture; vultures and changing escarpment light are important subjects.",
    bestFor: ["Quieter Central India", "River landscapes", "Khajuraho extensions"],
    description: "Panna is a restored tiger landscape of Vindhyan plateaux, gorges and the Ken River, within easy reach of Khajuraho.",
    intro: "Panna's dry forest is cut by the Ken River and a sequence of plateaux, gorges and falls. The reserve's wildlife includes tiger, leopard, wild dog and wolf, while its cliffs and river country support significant vulture and aquatic life.\n\nIts proximity to Khajuraho makes Panna unusually easy to combine with cultural travel, but the park deserves more than a brief excursion. Two or three nights allow its quieter landscape and conservation story to register properly."
  },
  satpura: {
    bestMonths: "15 October to 30 June; activity choice and access vary with season",
    wildlife: "Tiger, leopard, sloth bear, gaur, dhole, Indian giant squirrel, flying squirrel, otter and more than 300 bird species",
    habitat: "Teak and sal forest, sandstone hills, ravines, Denwa backwaters and the Pachmarhi plateau",
    idealStay: "3-4 nights for a mix of vehicle, water and approved low-impact activities",
    gateway: "Bhopal is the usual air gateway for Madhai; road routing varies for other sectors",
    access: "Madhai is commonly reached by road and a short boat crossing. Zone, lodge and activity permissions should be confirmed together.",
    safariRhythm: "Vehicle drives can be combined with approved canoeing, boating, walking or cycling, producing a more varied field rhythm than a drive-only park.",
    photography: "Forest layers, backwater reflections, arboreal mammals and landscape work; a lighter kit is useful for non-vehicle activities.",
    bestFor: ["Varied safari activities", "Forest natural history", "Returning safari travellers"],
    description: "Satpura is a biodiverse Central Indian reserve where vehicle safaris can be complemented by approved walking, canoeing, cycling and boat-based exploration.",
    intro: "Satpura lies south of the Narmada across teak lowlands, sal forest, sandstone hills and the Denwa backwaters. The official reserve records an unusually broad fauna, including giant squirrel, flying squirrel and otters alongside the larger predators.\n\nIts distinction is experiential as well as ecological: approved walking, canoeing, cycling and boating can complement conventional drives. The final mix depends on zone access, water level, weather and guest mobility."
  },
  kaziranga: {
    bestMonths: "November to April, with exact opening dates governed by flood recovery and local conditions",
    wildlife: "Greater one-horned rhinoceros, Asian elephant, tiger, wild water buffalo, eastern swamp deer and wetland birdlife",
    habitat: "Brahmaputra floodplain, tall elephant grass, wetlands, riverine forest and seasonally inundated channels",
    idealStay: "3 nights to explore several of the park's principal ranges",
    gateway: "Jorhat is the closest airport cited by Assam Tourism; Guwahati supports wider flight choice",
    access: "Private road transfer to the chosen lodge. The Central, Western, Eastern and Burapahar ranges differ in habitat and drive time.",
    safariRhythm: "Morning and afternoon jeep safaris across different ranges, planned around grassland light, wetlands and bird activity.",
    photography: "Rhino and elephant in tall grass, wetland birds and broad floodplain scenes; early light and range variety matter more than chasing one species.",
    bestFor: ["One-horned rhinoceros", "Floodplain ecology", "Birding"],
    description: "Kaziranga is a UNESCO-listed Brahmaputra floodplain of tall grass, wetlands and riverine forest, celebrated for the greater one-horned rhinoceros.",
    intro: "Kaziranga is shaped by the Brahmaputra and its annual floods. Tall grass, wetlands and riverine woodland support greater one-horned rhinoceros, wild buffalo, elephant, eastern swamp deer, tiger and abundant birdlife.\n\nAssam Tourism recommends two to three days to cover the principal ranges. That range-to-range variation is the point: one sector may favour open grassland and rhino, another wetlands, woodland or concentrated bird activity."
  },
  bandipur: {
    bestMonths: "October to March for cooler conditions; the park remains a year-round landscape with seasonal variation",
    wildlife: "Asian elephant, Bengal tiger, leopard, dhole, gaur, sloth bear, sambar and more than 200 bird species",
    habitat: "Dry and moist deciduous forest, scrub and open woodland within the Nilgiri Biosphere Reserve",
    idealStay: "2-3 nights, longer when combined thoughtfully with Nagarhole rather than rushed as a transit stop",
    gateway: "Mysuru is the nearest major city; Bengaluru and Coimbatore provide wider air access",
    access: "Private road transfer to the chosen lodge. Forest Department bus safaris and licensed jeep operations follow defined sessions and current regulations.",
    safariRhythm: "Morning and afternoon organized safaris, with the quieter hours reserved for rest and natural history around the lodge.",
    photography: "Elephants, gaur and dry-forest mammals in mixed light; vehicle type and seating position influence photographic freedom.",
    bestFor: ["Elephants", "Nilgiri landscape", "Southern India circuits"],
    description: "Bandipur is a major Nilgiri Biosphere Reserve landscape of deciduous forest and scrub, supporting elephant, tiger, dhole and gaur.",
    intro: "Bandipur forms part of the connected Nilgiri conservation landscape with Nagarhole, Mudumalai and Wayanad. Its dry and moist deciduous habitats support major populations of elephant as well as tiger, leopard, wild dog and gaur.\n\nSafari operations are regulated and vehicle formats differ. A private plan should set expectations around the available experience, select accommodation for access rather than branding alone, and avoid treating the Mysuru-Ooty road as a substitute for time inside the forest."
  },
  kabini: {
    bestMonths: "October to May; post-monsoon brings full backwaters, while March to May concentrates wildlife as water recedes",
    wildlife: "Asian elephant, Bengal tiger, leopard, dhole, gaur, deer, crocodile and more than 250 reported bird species",
    habitat: "Nagarhole forest, Kabini River, reservoir backwaters, grassy edges and deciduous woodland",
    idealStay: "3 nights for repeated land safaris and a possible boat-based perspective",
    gateway: "Mysuru is the closest major rail and road gateway; Bengaluru provides the main international air access",
    access: "Private road transfer to the Kabini side of Nagarhole. Safari seat allocation, vehicle type and boat availability should be confirmed before choosing a lodge.",
    safariRhythm: "Morning and afternoon forest safaris, with boat time considered when water and operations allow; summer activity often gathers near receding backwaters.",
    photography: "Elephants and deer along backwater edges, forest predators and water-level landscapes; both long glass and a wider lens earn a place.",
    bestFor: ["Elephants", "Backwater landscapes", "Wildlife photography"],
    description: "Kabini is the river-and-backwater edge of Nagarhole, known for elephants, predators and a productive meeting of forest and water.",
    intro: "Kabini refers to the river and reservoir landscape along Nagarhole rather than a separate national park. Its forest, grassy backwater edges and water systems support elephant, tiger, leopard, dhole, gaur and extensive birdlife.\n\nWater level changes the experience. Post-monsoon months bring full, reflective backwaters; the dry season exposes grass and can concentrate animals near remaining water. Safari allocation and lodge access should be settled before the stay is confirmed."
  },
  sunderbans: {
    bestMonths: "November to February for cooler, generally more comfortable boat exploration",
    wildlife: "Bengal tiger, estuarine crocodile, Ganges and Irrawaddy dolphins, water monitor, king cobra, turtles and estuarine birdlife",
    habitat: "Tidal mangrove forest, mudflats, creeks, estuaries and islands in the Ganges-Brahmaputra delta",
    idealStay: "3 nights for an unhurried boat-based understanding of the delta",
    gateway: "Kolkata, followed by road to a jetty such as Godkhali and onward travel by boat",
    access: "The experience is boat-led. Tide, weather, cyclone conditions and forest permissions determine routes; tiger sightings are rare and never the sole measure of the journey.",
    safariRhythm: "Long, quiet navigation through tidal creeks with watchtower stops where permitted, timed around tide and daylight.",
    photography: "Mangrove ecology, channels, mudflats, birds and distant wildlife; stable support and weather protection matter more than close-range expectations.",
    bestFor: ["Mangrove ecology", "Boat-based wilderness", "Conservation context"],
    description: "The Indian Sundarbans protect a UNESCO-listed tidal mangrove ecosystem where creeks, mudflats and islands support tigers, dolphins, crocodiles and rich birdlife.",
    intro: "The Sundarbans are not a conventional tiger safari. They are a tidal world of mangrove islands, estuaries and shifting mudflats, part of the largest mangrove forest on Earth and a UNESCO World Heritage Site.\n\nExploration is by boat and governed by tide, weather and forest permission. Tigers are present but difficult to see; the deeper reward is understanding an ecosystem adapted to salt, flood and constant change, including dolphins, crocodiles, reptiles and waterbirds."
  },
  dudhwa: {
    bestMonths: "November to mid-June, with the coolest and most comfortable conditions generally from November to February",
    wildlife: "Bengal tiger, greater one-horned rhinoceros, Asian elephant, swamp deer, leopard, hispid hare and Bengal florican habitat",
    habitat: "Terai sal forest, tall elephant grass, marsh, river systems and alluvial grassland near the Nepal border",
    idealStay: "3 nights, with additional time when including Kishanpur or Katarniaghat in the wider Terai landscape",
    gateway: "Lucknow, followed by a private road transfer into the Dudhwa landscape",
    access: "Road and rail approaches vary by lodge and park sector. Opening dates and safari permissions should be reconfirmed with the official eco-tourism authority.",
    safariRhythm: "Morning and afternoon safaris through sal forest and grassland, with patient observation around marsh and rhino habitat.",
    photography: "Tall-grass mammals, swamp deer and forest-edge birdlife; low visibility in elephant grass makes anticipation and ethical distance important.",
    bestFor: ["Terai ecology", "Swamp deer", "Returning India travellers"],
    description: "Dudhwa is a Terai landscape of sal forest, marsh and tall grass near the Nepal border, supporting tiger, rhino, swamp deer and rare grassland species.",
    intro: "Dudhwa protects a surviving reach of the Terai, where sal forest meets tall alluvial grass and wetland. The official tourism board identifies tiger, rhinoceros, swamp deer, elephant, hispid hare and Bengal florican among its conservation significance.\n\nThe landscape rewards guests who already understand that wildlife quality is not measured by big-cat frequency alone. Grassland, marsh and forest require different ways of looking, with enough time to appreciate the ecological whole."
  },
  pilibhit: {
    bestMonths: "November to mid-June, subject to annual forest opening and local weather",
    wildlife: "Bengal tiger, leopard, swamp deer, hog deer, sambar, chital and Terai birdlife",
    habitat: "Terai-Bhabar sal forest, tall grassland, river channels and the Sharda reservoir edge",
    idealStay: "2-3 nights for safari sectors and the Chuka landscape",
    gateway: "Bareilly is the practical regional gateway; road routing continues to Pilibhit and the chosen forest entry",
    access: "Jungle safaris are booked through the official reserve system. Gate, lodge and Chuka access should be confirmed together before travel.",
    safariRhythm: "Morning and afternoon vehicle safaris with time around grassland, sal forest and reservoir-edge habitat.",
    photography: "Terai forest, water-edge landscapes and tracks through tall grass; sightings can be brief, favouring ready equipment and patient positioning.",
    bestFor: ["Terai tiger habitat", "Quieter reserves", "Dudhwa pairings"],
    description: "Pilibhit Tiger Reserve protects a quieter Terai mosaic of sal forest, grassland and river-reservoir habitat in northern Uttar Pradesh.",
    intro: "Pilibhit lies in the Terai arc against the Nepal border, combining sal forest, grasslands and water shaped by the Sharda system. Its ecological identity extends beyond tiger to deer, forest mammals and rich birdlife.\n\nThe reserve suits returning wildlife travellers who value a less familiar landscape and are comfortable with patient tracking. Current safari gates, Chuka access and seasonal operations must be reconfirmed through the official booking system."
  },
  gir: {
    bestMonths: "Mid-October to mid-June; the official park is closed during the monsoon and on Wednesdays",
    wildlife: "Asiatic lion, leopard, chital, sambar, nilgai, chowsingha, mugger crocodile and dry-forest birds",
    habitat: "Dry deciduous teak forest, thorn scrub, savanna, rocky hills and seasonal river systems",
    idealStay: "2-3 nights for repeated permit-based drives",
    gateway: "Rajkot is cited by Gujarat Tourism; road routing may also use Ahmedabad depending on the wider itinerary",
    access: "Private road transfer to the Sasan Gir area. Official safari permits are limited and should be booked through the authorised system.",
    safariRhythm: "Morning and afternoon drives through dry forest and scrub, with heat-aware pacing and attention to the wider prey and bird community.",
    photography: "Lions in dry forest and open scrub, family behaviour and environmental portraiture; harsh midday light makes safari timing important.",
    bestFor: ["Asiatic lions", "Gujarat wildlife", "Big-cat journeys"],
    description: "Gir is the last natural home of the Asiatic lion, a dry-forest and thorn-scrub landscape in Gujarat explored through limited official safari permits.",
    intro: "Gir's global importance rests on its population of wild Asiatic lions. The wider dry-forest ecosystem also supports leopard, deer, antelope, crocodile and a diverse bird community across teak woodland, scrub and seasonal watercourses.\n\nPermits and timing are fundamental to a smooth visit. A private plan secures the official safari framework first, then chooses lodge, transfer and any Gujarat extension around those confirmed drives."
  }
};

for (const destination of content.destinations) {
  const update = research[destination.slug];
  if (!update) continue;
  Object.assign(destination, update, {
    status: "rich",
    planningNote: `Plan ${destination.title} around verified seasonal access, the right gateway, ethical field time and a realistic wildlife brief. Current permits and local conditions are reconfirmed before proposal.`,
    seo: {
      title: `Luxury ${destination.title} Safari Planning`,
      description: `Plan a private ${destination.title} wildlife journey with researched guidance on habitat, season, access, ideal stay and photography.`,
      reviewedAt
    },
    sources: sources[destination.slug].map(([title, publisher, url]) => ({ title, publisher, url, accessedAt: reviewedAt }))
  });
  destination.faqs = [
    { question: `When is the best time to visit ${destination.title}?`, answer: update.bestMonths },
    { question: `How long should I stay in ${destination.title}?`, answer: update.idealStay },
    { question: `What wildlife and habitat define ${destination.title}?`, answer: `${update.wildlife}. The landscape is characterised by ${update.habitat.toLowerCase()}.` },
    { question: `How do I reach ${destination.title}?`, answer: `${update.gateway}. ${update.access}` },
    { question: `What is a typical day in ${destination.title}?`, answer: update.safariRhythm }
  ];
}

fs.writeFileSync(path, `${JSON.stringify(content, null, 2)}\n`);
console.log(`Enriched ${Object.keys(research).length} India destinations with sourced field intelligence.`);
