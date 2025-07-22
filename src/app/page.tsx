"use client";

import { useState } from "react";
import InteractiveImage from "@/components/InteractiveImage";
import DetailSidebar from "@/components/DetailSidebar";
import { ClickableArea } from "@/types/interfaces";

export default function Home() {
  const [selectedArea, setSelectedArea] = useState<ClickableArea | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const handleAreaClick = (area: ClickableArea) => {
    setSelectedArea(area);
    setIsSidebarOpen(true);
  };

  const handleCloseSidebar = () => {
    setIsSidebarOpen(false);
    // Small delay before clearing the selected area to allow for animation
    setTimeout(() => setSelectedArea(null), 300);
  };
  // Example clickable areas for the Azorian's Bounty
  const clickableAreas: ClickableArea[] = [
    {
      id: "area-1753030930140",
      name: "Sandhaven",
      x: 30.372293030643476,
      y: 87.44027480048555,
      width: 7.314144035950875,
      height: 4.132338128567369,
      teaser:
        "**Sandhaven** thrives as a vital *oasis city* ruled by a Caliphate. It's known for its exotic goods, bustling markets, and the golden shimmer of the surrounding dunes.",
      detail: `
A large desert settlement with a distinct Middle Eastern vibe, Sandhaven thrives as a vital oasis city ruled by a Caliphate. It's known for its exotic goods, bustling markets, and the golden shimmer of the surrounding dunes.

### Population
Approximately 4,000 residents

	Humans: 40%
	Dwarves: 25%
	Half-Orcs: 20%
	Tieflings: 10%
	Other (including Dragonborn and Gnomes): 5%

### City Guard
**Dira' al-Waha (DEE-ra al-WAH-ha) Shield of the Oasis:** A dedicated guard force loyal to the citizens of Sandhaven, heavily tattooed with colorful, swirling symbols. Their primary duty is to ensure the safety and well-being of the city's inhabitants.

### Districts
- **The Oasis Bazaar (Souk Quarter):** The bustling heart of Sandhaven, where trade routes converge. This vibrant district is filled with stalls, shops, and temporary merchant tents offering everything from exotic spices and fine silks to desert-forged tools and rare trinkets. It's the primary point of contact for visitors and the economic engine of the city.

- **The Palm Grove Ward (Hayy al-Nakheel):** The oldest residential area, characterized by its dense palm groves and close proximity to Sandhaven's vital water sources. Homes here are typically built from adobe or stone, offering cool refuge from the desert heat. It's primarily inhabited by long-term residents.

- **The Watcher's Rise (Talat al-Ra'i):** Perched on the highest point, this district centers around Bayt al-Nujum. It primarily houses scholars, mystics, and those associated with the observatory, as well as the more established and secluded residences. The architecture here is often more ornate and reflects a focus on knowledge and contemplation.

- **The Caravanserai Grounds (Ardh al-Qafila):** Located near the city gates, this area is dedicated to accommodating the constant flow of travelers, traders, and their beasts of burden. It features large courtyards, stables, basic inns, and workshops catering to transient needs. It's a rougher, more transient part of the city, bustling with diverse faces.

- **The Crafters' Lane (Darb al-Sanaa):** A less prominent but vital district where local artisans, blacksmiths, potters, and weavers ply their trades. The air often carries the scent of hammered metal, clay, or dyed fabrics. This area serves the daily needs of the city's

### Notable Shops / Taverns / Inns

- **The Oasis Bazaar:** A bustling marketplace offering exotic goods from the desert, including spices, carpets, and magical trinkets. It's especially vibrant during the Oasis Festival.

- **The Golden Scimitar (Tavern & Inn - For Royalty/Dignitaries):** Nestled discreetly in the Watcher's Rise, this opulent establishment caters to visiting dignitaries and those of noble birth. Its private chambers offer unparalleled luxury, and its culinary delights are legendary. Security is paramount, often provided by the Caliphate's own guards, ensuring discretion and safety.

- **The Spice Trader's Respite (Tavern & Inn - For Merchants):** Located within the lively Oasis Bazaar, this sprawling inn is a hub for merchants. It offers comfortable, no-nonsense rooms, ample secure storage for goods, and a large common room where deals are struck over strong tea and hearty stew. The clientele are a mix of seasoned traders and ambitious newcomers.

- **The Shifting Sands Inn (Tavern & Inn - For Sellswords/Mercenaries/Crews):** A raucous, no-frills establishment found in the Caravanserai Grounds, close to the city gates. It caters to the rougher element: sellswords, desert guides, caravanners, and ship's crews seeking coin or passage. The air is thick with boasts, grudges, and whispered rumors of dangerous ventures. Basic beds are offered, and the ale flows freely.

- **Al-Gharib's Curios (Shop - Unusual Items):** Tucked away in a quiet corner of the Oasis Bazaar, this dimly lit shop is run by the enigmatic Al-Gharib, a cloaked figure rarely seen without a rare artifact in hand. It specializes in oddities, forgotten relics, peculiar magical components, and items with mysterious origins from across the desert and beyond. Patrons never quite know what they'll find, from cursed jewelry to potent but unstable powders.

### Points of Interest

- **Bayt al-Nujum (House of Stars):** Perched atop Sandhaven’s highest point, Bayt al-Nujum is a grand domed observatory adorned with intricate brass filigree and sapphire inlays. Its scholars, known as the [[Ruqqab al-Lānihāyah]], once welcomed seekers of celestial wisdom. Recently, the observatory has been mysteriously sealed, its great doors locked with powerful wards. The scholars’ final message to the people of Sandhaven was chilling: "**The sky has broken.**"

- **Sunblade Dunes:** A vast desert expanse with sand dunes that seem to shimmer like gold in the sun, surrounding the city.

### Notable NPCs

- **Sarif al-Sahar:** The charismatic Caliph and leader of Sandhaven, known for his diplomacy and shrewd business sense. (Potentially expand on his family, advisors, etc.)

- **Captain Azar (Tiefling, Androgynous):** The skilled and respected captain of the Dira' al-Waha. Azar is known for their calm demeanor under pressure, their keen sense of justice, and their unwavering loyalty to the citizens of Sandhaven. Their polished obsidian horns and subtly scaled skin are distinctive features.

- **[[Inara al-Sahar]] (Caliph's Daughter):** The Caliph's eldest daughter, known for her sharp intellect and compassionate nature. She is often seen engaging with the citizens in the Bazaar, showing a genuine interest in their well-being, and is a strong advocate for the city's common folk. She possesses a subtle but firm political acumen.

- **Sheikh Omar al-Din (Head Merchant):** The venerable and shrewd leader of the Sandhaven Merchant Council. Sheikh Omar oversees much of the city's trade operations, arbitrates disputes among vendors, and wields considerable influence through his vast network of connections. He is a master negotiator and a guardian of the Bazaar's prosperity.


### Quest Hooks

- **The Sealed Observatory:** Investigate the mysterious sealing of Bayt al-Nujum and the cryptic message "The sky has broken." What celestial event or entity caused the scholars to withdraw? Can the party break the wards and discover the truth?

- **Assassination Aftermath:** Uncover the perpetrators and motivations behind the assassination attempt on Caliph Sarif al-Khalid and his family, which occurred at the beginning of the Oasis Festival. Is it linked to the observatory's sealing?

- **Oasis Bazaar Heist/Contest:** Engage in a high-stakes trade negotiation, stop a theft during the bustling Oasis Festival, or participate in a bazaar-wide competition.

- **Desert Expeditions:** Explore the treacherous Sunblade Dunes, seeking ancient ruins, hidden oases, or encountering dangerous desert creatures.

### Notable Celebrations:

- **The Oasis Festival (Miriander days 1 - 40):** A month-long celebration when the desert blooms after the brief rainy season. The city holds grand market festivals with traders from across the Bounty.

- **The Night of Tales (Pyrthendel 20):** A night of storytelling where the city's elders share tales of the desert's mysteries and the city's history.

### Recent Events:

- An assassination attempt on Caliph Sarif al-Khalid and his family occurred in early Calantheon

- The Bayt al-Nujum observatory was mysteriously sealed, with its scholars leaving the message: "The sky has broken."
      `,
    },
    {
      id: "area-1753031405938",
      name: "Stormharbor",
      x: 42.397241699918645,
      y: 50.910405743949994,
      width: 9.669546352613018,
      height: 3.1405769777112056,
      teaser:
        "**Stormharbor** is the largest city in *Azorian's Bounty*, and sits on the mysterious `Whispering Depths`.",
      detail: `
Stormharbor is the largest city in [[Azorian's Bounty]], and sits on [[Whispering Depths]].

### Population
Approximately 300,000 residents

	Humans: 50%  
	Halflings: 10%  
	Half-Elves: 10%  
	Tritons: 8%  
	Tortles: 5%  
	Water Genasi: 5%  
	Sea Elves: 3%  
	Elves: 3%  
	Dwarves: 3%  
	Gnomes: 2%  
	Tieflings: 1%  
	Other Races: 1%  

### City Guard:
[[Tidekeepers]]

### Districts:
* [[Nobles Respite]]
* [[Craftsman’s Enclave]]
* [[Merchant’s Bazaar]]
* [[Scholar’s Summit]]
* [[Sea Trades]]
* [[Creativity Corner]]
* [[Verdant Tranquility]]
* [[Mystique Mews]]
* [[Global Quarter]]
* [[Seafarer’s Enclave]]

### Points of Interest:
* [[Lighthouse of Radiance]]

### Notable NPCs:
* [[Isabella Quickfoot]]
* [[Wellkeeper Olara]]
* [[Thrain Ironbeard]]
* [[Lightholder Nadira Dawnshroud]]
      `,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      <header className="text-center p-4 z-10">
        <h2 className="text-3xl font-bold">Azorian&apos;s Bounty</h2>
      </header>

      <main
        className={`flex-1 flex items-center justify-center p-4 transition-all duration-300 ease-in-out ${
          isSidebarOpen ? "md:pr-[calc(33.333333%+1rem)]" : ""
        }`}
      >
        <div
          className={`transition-transform duration-300 ${
            isSidebarOpen ? "md:scale-90" : "scale-100"
          }`}
        >
          <InteractiveImage
            src="/images/azorians_bounty.jpg"
            alt="Azorian's Bounty"
            width={2048}
            height={1536}
            clickableAreas={clickableAreas}
            onAreaClick={handleAreaClick}
            sizes="(max-width: 480px) 100vw, (max-width: 768px) 95vw, (max-width: 1024px) 90vw, (max-width: 1440px) 85vw, 2048px"
            className="max-w-full h-auto"
          />
        </div>
      </main>

      <DetailSidebar
        area={selectedArea}
        isOpen={isSidebarOpen}
        onClose={handleCloseSidebar}
      />
    </div>
  );
}
