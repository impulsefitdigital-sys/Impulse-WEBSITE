import { useEffect, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker } from "react-simple-maps";
import { feature, merge } from "topojson-client";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

/**
 * Carte de la présence Impulse : image fixe (demande du client 04/11/2026) — pas de zoom, pas de
 * déplacement, pas de boutons : sur téléphone, le doigt fait défiler la page normalement.
 * Un point par pays desservi (liste indicative, à compléter au besoin) ; le Maroc est mis en avant.
 */
const countries: [string, number, number][] = [
  // Europe
  ["France", 2.5, 46.6], ["Italie", 12.6, 42.8], ["Allemagne", 10.4, 51.2], ["Espagne", -3.7, 40.4], ["Portugal", -8.2, 39.6],
  ["Royaume-Uni", -1.8, 52.8], ["Irlande", -8.2, 53.4], ["Belgique", 4.5, 50.5], ["Pays-Bas", 5.3, 52.4], ["Suisse", 8.2, 46.8],
  ["Autriche", 14.5, 47.5], ["Pologne", 19.1, 52.0], ["Tchéquie", 15.5, 49.8], ["Slovaquie", 19.7, 48.7], ["Hongrie", 19.5, 47.2],
  ["Slovénie", 14.9, 46.1], ["Croatie", 16.2, 45.1], ["Serbie", 20.9, 44.0], ["Roumanie", 25.0, 45.9], ["Bulgarie", 25.5, 42.7],
  ["Grèce", 22.0, 39.1], ["Chypre", 33.2, 35.1], ["Danemark", 9.5, 56.0], ["Suède", 16.0, 62.0], ["Norvège", 9.0, 61.0],
  ["Finlande", 26.0, 63.0], ["Estonie", 25.0, 58.6], ["Lettonie", 24.6, 56.9], ["Lituanie", 23.9, 55.2], ["Ukraine", 31.2, 48.4],
  ["Russie", 37.6, 55.7], ["Russie (Sibérie)", 90.0, 61.5], ["Turquie", 35.2, 38.9], ["Géorgie", 43.4, 42.3], ["Arménie", 45.0, 40.1],
  ["Azerbaïdjan", 47.6, 40.1],
  // Moyen-Orient
  ["Arabie saoudite", 45.0, 24.0], ["Émirats arabes unis", 54.3, 23.9], ["Qatar", 51.2, 25.3], ["Koweït", 47.5, 29.3],
  ["Oman", 57.0, 21.0], ["Jordanie", 36.2, 31.0], ["Liban", 35.9, 33.9], ["Irak", 43.7, 33.2], ["Iran", 53.7, 32.4],
  // Afrique
  ["Algérie", 2.6, 28.0], ["Tunisie", 9.5, 34.0], ["Égypte", 30.8, 26.8], ["Sénégal", -14.5, 14.5], ["Côte d'Ivoire", -5.5, 7.5],
  ["Ghana", -1.0, 7.9], ["Nigeria", 8.7, 9.1], ["Cameroun", 12.4, 5.4], ["Gabon", 11.6, -0.8], ["Kenya", 37.9, 0.0],
  ["Tanzanie", 34.9, -6.4], ["Éthiopie", 40.5, 9.1], ["Angola", 17.9, -11.2], ["Afrique du Sud", 22.9, -30.6], ["Madagascar", 46.9, -18.8],
  ["Maurice", 57.6, -20.3],
  // Asie
  ["Kazakhstan", 66.9, 48.0], ["Ouzbékistan", 64.6, 41.4], ["Pakistan", 69.3, 30.4], ["Inde", 79.0, 22.0], ["Sri Lanka", 80.8, 7.9],
  ["Bangladesh", 90.4, 23.7], ["Chine", 104.0, 35.0], ["Mongolie", 103.8, 46.9], ["Corée du Sud", 127.8, 36.5], ["Japon", 138.3, 36.2],
  ["Taïwan", 121.0, 23.7], ["Vietnam", 107.8, 16.0], ["Thaïlande", 101.0, 15.9], ["Malaisie", 102.0, 4.2], ["Singapour", 103.8, 1.35],
  ["Indonésie", 117.0, -2.5], ["Philippines", 122.0, 12.9],
  // Océanie
  ["Australie", 133.8, -25.3], ["Nouvelle-Zélande", 174.0, -41.0],
  // Amériques
  ["Canada", -106.0, 56.0], ["États-Unis", -98.6, 39.8], ["Mexique", -102.5, 23.6], ["Guatemala", -90.2, 15.8], ["Costa Rica", -84.0, 9.7],
  ["Panama", -80.0, 8.5], ["République dominicaine", -70.2, 18.7], ["Jamaïque", -77.3, 18.1], ["Trinité-et-Tobago", -61.2, 10.7],
  ["Colombie", -74.3, 4.6], ["Équateur", -78.2, -1.8], ["Pérou", -75.0, -9.2], ["Bolivie", -64.7, -16.3], ["Brésil", -51.9, -14.2],
  ["Paraguay", -58.4, -23.4], ["Uruguay", -55.8, -32.5], ["Argentine", -63.6, -38.4], ["Chili", -71.5, -35.7],
];
const MOROCCO: [number, number] = [-7.1, 31.8];

const WorldPresenceSection = () => {
  const [geoData, setGeoData] = useState<unknown>(null);
  // points lisibles sur téléphone : la carte y est réduite ~3 fois, les points sont donc agrandis d'autant
  const [dot, setDot] = useState(1);
  useEffect(() => {
    const size = () => setDot(window.innerWidth < 700 ? 2.1 : window.innerWidth < 1100 ? 1.4 : 1);
    size();
    window.addEventListener("resize", size);
    return () => window.removeEventListener("resize", size);
  }, []);

  useEffect(() => {
    // Maroc et Sahara réunis en un seul territoire
    fetch(GEO_URL).then((r) => r.json()).then((topology: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const geoms = topology.objects.countries.geometries;
      const moroccoGeoms = geoms.filter((g: { id: string }) => g.id === "504" || g.id === "732");
      const others = geoms.filter((g: { id: string }) => g.id !== "504" && g.id !== "732");
      const mergedMorocco = merge(topology, moroccoGeoms);
      const otherFeatures = feature(topology, { type: "GeometryCollection", geometries: others } as any) as any; // eslint-disable-line @typescript-eslint/no-explicit-any
      setGeoData({ type: "FeatureCollection", features: [...otherFeatures.features, { type: "Feature", properties: { name: "Maroc" }, geometry: mergedMorocco }] });
    }).catch(() => setGeoData(GEO_URL));
  }, []);

  const land = { fill: "#9ca3af", stroke: "#141416", strokeWidth: 0.4, outline: "none" };

  return (
    <section className="sec world">
      <div className="wrap">
        <img src="/impulse-logo.png" alt="Impulse" className="world-logo reveal" />
        <h2 className="display-md reveal">Une présence mondiale</h2>

        <div className="worldmap worldmap-static reveal" role="img" aria-label={`Carte du monde : Impulse est présent dans plus de 100 pays, dont ${countries.slice(0, 12).map((c) => c[0]).join(", ")}…`}>
          <ComposableMap projection="geoEquirectangular" projectionConfig={{ scale: 145, center: [10, 10] }} width={980} height={500}
            style={{ width: "100%", height: "100%", background: "transparent", pointerEvents: "none" }} aria-hidden="true">
            <Geographies geography={geoData ?? GEO_URL}>
              {({ geographies }) =>
                geographies.filter((geo) => geo.properties.name !== "Antarctica").map((geo) => (
                  <Geography key={geo.rsmKey} geography={geo} tabIndex={-1} style={{ default: land, hover: land, pressed: land }} />
                ))
              }
            </Geographies>
            {countries.map(([name, lon, lat]) => (
              <Marker key={name} coordinates={[lon, lat]}>
                <circle r={2.6 * dot} fill="#e30613" stroke="#ffffff" strokeWidth={0.7 * dot} />
              </Marker>
            ))}
            {/* Maroc : point plus grand avec un halo */}
            <Marker coordinates={MOROCCO}>
              <circle r={9 * dot} fill="#e30613" opacity={0.25} />
              <circle r={4.6 * dot} fill="#e30613" stroke="#ffffff" strokeWidth={1.4 * dot} />
            </Marker>
          </ComposableMap>
        </div>

        <div className="worldmap-legend"><span className="dot" /> Pays desservis par Impulse</div>

        <div className="world-stats">
          <div className="ws reveal"><div className="n">100<small>+</small></div><div className="l">Pays desservis</div></div>
          <div className="ws reveal"><div className="n">5</div><div className="l">Continents</div></div>
          <div className="ws reveal"><div className="n">1975</div><div className="l">Depuis</div></div>
        </div>
      </div>
    </section>
  );
};

export default WorldPresenceSection;
