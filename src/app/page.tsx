import InteractiveImage, { ClickableArea } from "@/components/InteractiveImage";

export default function Home() {
  // Example clickable areas for the Azorian's Bounty
  const clickableAreas: ClickableArea[] = [
    {
      id: "area-1753030930140",
      name: "Sandhaven",
      x: 30.372293030643476,
      y: 87.44027480048555,
      width: 7.314144035950875,
      height: 4.132338128567369,
      description:
        "Sandhaven thrives as a vital oasis city ruled by a Caliphate. It's known for its exotic goods, bustling markets, and the golden shimmer of the surrounding dunes.",
      link: "/locations/sandhaven",
    },
    {
      id: "area-1753031405938",
      name: "Stormharbor",
      x: 42.397241699918645,
      y: 50.910405743949994,
      width: 9.669546352613018,
      height: 3.1405769777112056,
      description:
        "Stormharbor is the largest city in [[Azorian's Bounty]], and sits on [[Whispering Depths]].",
      link: "/locations/stormharbor",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center p-4 gap-8">
      <header className="text-center">
        <h2 className="text-3xl font-bold">Azorian&apos;s Bounty</h2>
      </header>
      <main className="flex items-center justify-center">
        <InteractiveImage
          src="/images/azorians_bounty.jpg"
          alt="Azorian's Bounty"
          width={2048}
          height={1536}
          clickableAreas={clickableAreas}
          sizes="(max-width: 480px) 100vw, (max-width: 768px) 95vw, (max-width: 1024px) 90vw, (max-width: 1440px) 85vw, 2048px"
          className="mx-auto"
        />
      </main>
      <footer className="text-center">
        {/* Footer content can go here */}
      </footer>
    </div>
  );
}
