import { useEffect, useRef, useState } from "react";
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { Plus, Minus, Home, Maximize2 } from "lucide-react";
import { feature, merge } from "topojson-client";

const GEO_URL = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

const countries: { name: string; coords: [number, number] }[] = [
  { name: "France", coords: [2.5, 46.6] }, { name: "Italie", coords: [12.6, 42.8] },
  { name: "Russie", coords: [90, 61.5] }, { name: "Allemagne", coords: [10.4, 51.2] },
  { name: "Espagne", coords: [-3.7, 40.4] }, { name: "Grèce", coords: [22.0, 39.1] },
  { name: "Pays-Bas", coords: [5.3, 52.1] }, { name: "Belgique", coords: [4.5, 50.5] },
  { name: "Mexique", coords: [-102.5, 23.6] }, { name: "États-Unis", coords: [-98.6, 39.8] },
  { name: "Vietnam", coords: [107.8, 16.0] }, { name: "Inde", coords: [79.0, 22.0] },
  { name: "Malaisie", coords: [102.0, 4.2] }, { name: "Indonésie", coords: [117.0, -2.5] },
  { name: "Brésil", coords: [-51.9, -14.2] }, { name: "Ukraine", coords: [31.2, 48.4] },
  { name: "Irlande", coords: [-8.2, 53.4] }, { name: "Turquie", coords: [35.2, 38.9] },
  { name: "Iran", coords: [53.7, 32.4] }, { name: "Kazakhstan", coords: [66.9, 48.0] },
  { name: "Australie", coords: [133.8, -25.3] }, { name: "Nouvelle-Zélande", coords: [174.0, -41.0] },
  { name: "Suisse", coords: [8.2, 46.8] }, { name: "Afrique du Sud", coords: [22.9, -30.6] },
  { name: "Maroc", coords: [-7.1, 31.8] },
];

const WorldPresenceSection = () => {
  const [position, setPosition] = useState<{ coordinates: [number, number]; zoom: number }>({ coordinates: [15, 25], zoom: 1 });
  const [activeMarker, setActiveMarker] = useState<string | null>(null);
  const [geoData, setGeoData] = useState<any>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(GEO_URL).then((r) => r.json()).then((topology: any) => {
      const geoms = topology.objects.countries.geometries;
      const moroccoGeoms = geoms.filter((g: any) => g.id === "504" || g.id === "732");
      const others = geoms.filter((g: any) => g.id !== "504" && g.id !== "732");
      const mergedMorocco = merge(topology, moroccoGeoms);
      const otherFeatures = feature(topology, { type: "GeometryCollection", geometries: others } as any) as any;
      const features = [...otherFeatures.features, { type: "Feature", properties: { name: "Maroc" }, geometry: mergedMorocco }];
      setGeoData({ type: "FeatureCollection", features });
    }).catch(() => setGeoData(GEO_URL));
  }, []);

  const handleZoomIn = () => setPosition((p) => (p.zoom >= 8 ? p : { ...p, zoom: p.zoom * 1.5 }));
  const handleZoomOut = () => setPosition((p) => (p.zoom <= 1 ? p : { ...p, zoom: p.zoom / 1.5 }));
  const handleReset = () => setPosition({ coordinates: [15, 25], zoom: 1 });
  const handleFullscreen = () => {
    const el = wrapperRef.current;
    if (!el) return;
    if (!document.fullscreenElement) el.requestFullscreen?.();
    else document.exitFullscreen?.();
  };

  return (
    <section className="sec world">
      <div className="wrap">
        <img src="/impulse-logo.png" alt="Impulse" className="world-logo reveal" />
        <h2 className="display-md reveal">Une présence mondiale</h2>

        <div ref={wrapperRef} className="worldmap reveal" onClick={() => setActiveMarker(null)}>
          <ComposableMap projection="geoEquirectangular" projectionConfig={{ scale: 145, center: [10, 10] }} width={980} height={500} style={{ width: "100%", height: "100%", background: "transparent" }}>
            <ZoomableGroup zoom={position.zoom} center={position.coordinates} onMoveEnd={(pos) => setPosition({ coordinates: pos.coordinates as [number, number], zoom: pos.zoom })} maxZoom={8} minZoom={1}
              filterZoomEvent={(evt: any) => { if (evt.type === "touchstart" || evt.type === "touchmove") { if (evt.touches && evt.touches.length > 1) return false; } return true; }}>
              <Geographies geography={geoData ?? GEO_URL}>
                {({ geographies }) =>
                  geographies.filter((geo) => geo.properties.name !== "Antarctica").map((geo) => (
                    <Geography key={geo.rsmKey} geography={geo} style={{
                      default: { fill: "#9ca3af", stroke: "#141416", strokeWidth: 0.4, outline: "none" },
                      hover: { fill: "#b5bbc4", stroke: "#141416", strokeWidth: 0.4, outline: "none" },
                      pressed: { fill: "#9ca3af", outline: "none" },
                    }} />
                  ))
                }
              </Geographies>
              {countries.map((c) => {
                const isActive = activeMarker === c.name;
                return (
                  <Marker key={c.name} coordinates={c.coords} onClick={(e) => { e.stopPropagation(); setActiveMarker(isActive ? null : c.name); }}
                    style={{ default: { cursor: "pointer" }, hover: { cursor: "pointer" }, pressed: { cursor: "pointer" } }}>
                    <circle r={5 / Math.sqrt(position.zoom)} fill="#e30613" stroke="#ffffff" strokeWidth={1.2 / Math.sqrt(position.zoom)}
                      onMouseEnter={() => setActiveMarker(c.name)} onMouseLeave={() => setActiveMarker((prev) => (prev === c.name ? null : prev))} />
                    {isActive && (
                      <g style={{ pointerEvents: "none" }}>
                        <rect x={-((c.name.length * 4.2) / 2) - 6} y={-22 / Math.sqrt(position.zoom)} width={c.name.length * 4.2 + 12} height={14} rx={3} fill="#141419" opacity={0.9} transform={`scale(${1 / Math.sqrt(position.zoom)})`} />
                        <text textAnchor="middle" y={-12} style={{ fontFamily: "system-ui, sans-serif", fontSize: 10, fill: "#ffffff", fontWeight: 600 }} transform={`scale(${1 / Math.sqrt(position.zoom)})`}>{c.name}</text>
                      </g>
                    )}
                    <title>{c.name}</title>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        <div className="worldmap-controls">
          <button aria-label="Zoom avant" onClick={handleZoomIn}><Plus className="h-4 w-4" /></button>
          <button aria-label="Zoom arrière" onClick={handleZoomOut}><Minus className="h-4 w-4" /></button>
          <button aria-label="Réinitialiser" onClick={handleReset}><Home className="h-4 w-4" /></button>
          <button aria-label="Plein écran" onClick={handleFullscreen}><Maximize2 className="h-4 w-4" /></button>
        </div>
        <div className="worldmap-legend"><span className="dot" /> Centres et partenaires Impulse</div>

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
