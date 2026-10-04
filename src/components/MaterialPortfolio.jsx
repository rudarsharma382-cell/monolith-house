import React, { useState, useMemo } from 'react';
import CircularCarousel from './CircularCarousel.jsx';

// 5 Curated Primary Architectural Sanctuaries of MONOLITH
const SIGNATURE_SPACES = [
  {
    id: 'observatory',
    index: '01',
    shortName: 'Bedrock Studio',
    title: 'BEDROCK STUDIO',
    subtitle: '8.4M CANTILEVER · STRUCTURAL TRIPLE-GLAZING',
    simpleDescription: 'Cantilever glass study hovering over alpine waters.',
    image: '/assets/space_01_observatory.png',
    src: '/assets/space_01_observatory.png',
    alt: 'Bedrock Studio cantilevered glass study over alpine lake',
    coord: '46°41\'28"N · ZONE S-01',
    narrative:
      'Hovering directly above the alpine tarn, the private study cantilevers 8.4 meters without visible vertical columns. A 38mm walk-on glass floor reveals glacial granite boulders and submerged alpine moss beneath the desk, dissolving the separation between human intellect and raw geology.',
    specs: [
      { label: 'FLOOR ENVELOPE', val: '38mm Triple-Laminated Structural Glass (6.8 kN/m²)' },
      { label: 'GLAZING TECH', val: 'Low-Iron Magnetron Anti-Reflective · 92.4% VLT' },
      { label: 'JOINERY', val: 'Full-Span Bleached White Oak Architectural Bookcases' },
      { label: 'ACOUSTICS', val: 'Double-Layer Vacuum Glazing · <16 dB(A) Floor' },
    ],
    highlight: '8.4M POST-TENSIONED CANTILEVER OVER AIR',
  },
  {
    id: 'lounge',
    index: '02',
    shortName: 'Living Pavilion',
    title: 'LIVING PAVILION',
    subtitle: 'SUNKEN CEDAR HEARTH · RETRACTABLE WATER THRESHOLD',
    simpleDescription: 'Sunken cedar hearth opening directly to the lake threshold.',
    image: '/assets/space_02_lake_lounge.png',
    src: '/assets/space_02_lake_lounge.png',
    alt: 'Living Pavilion sunken hearth and cedar ceiling opening to lake',
    coord: '46°41\'28"N · ZONE L-02',
    narrative:
      'A lowered conversation excavation dropped 45cm into the monolithic concrete slab. Overhead, continuous micro-slatted western red cedar baffles absorb reverb while concealing magnetic 2700K wash lighting. Frameless pocket glass retracts to merge the lounge directly with the lily tarn.',
    specs: [
      { label: 'CEILING BAFFLES', val: '22mm Acoustic Western Red Cedar · NRC 0.85' },
      { label: 'SLAB MATRIX', val: 'Diamond-Burnished Screed · Geothermal Radiant Core' },
      { label: 'CIRCULATION', val: 'Cantilevered Oak Treads with Low-Iron Glass Balustrade' },
      { label: 'POCKET APERTURE', val: 'Motorized Zero-Threshold Recessed Track System' },
    ],
    highlight: 'ZERO EXPANSION SEAMS · 21.5°C RADIANT FLOOR',
  },
  {
    id: 'kitchen',
    index: '03',
    shortName: 'Culinary Sanctuary',
    title: 'CULINARY SANCTUARY',
    subtitle: 'NERO MARQUINA MONOLITH · BIO-FILTERED STREAM',
    simpleDescription: 'Honed marble island paired with live moss and mountain stream.',
    image: '/assets/space_03_biophilic_kitchen.png',
    src: '/assets/space_03_biophilic_kitchen.png',
    alt: 'Culinary Sanctuary with Nero Marquina island and indoor natural stream',
    coord: '46°41\'27"N · ZONE K-01',
    narrative:
      'Native mountain groundwater diverted through an indoor gravel flume nourishes live alpine sphagnum moss and volcanic boulders directly alongside the dining table. A massive 4.2-meter honed Nero Marquina marble island stands in dialogue with a 60cm dry-stacked fieldstone masonry wall.',
    specs: [
      { label: 'MASONRY CORE', val: '60cm Hand-Dressed Dry-Stacked Alpine Gneiss Wall' },
      { label: 'ISLAND MONOLITH', val: 'Honed Nero Marquina Marble with Integrated Induction' },
      { label: 'BIOPHILIC TARN', val: 'Closed-Loop Bio-Filtered Stream with Living Flora' },
      { label: 'REFECTORY TABLE', val: 'Single-Slab Live-Edge European Oak with Cast Joints' },
    ],
    highlight: 'NATURAL BIO-FILTERED HYDROLOGY AT 12°C',
  },
  {
    id: 'great_room',
    index: '04',
    shortName: 'Exoskeleton Hall',
    title: 'EXOSKELETON HALL',
    subtitle: '6.8M STRUCTURAL SPAN · VALSER QUARTZITE HEARTH',
    simpleDescription: 'Double-height steel volume anchored by a monumental hearth.',
    image: '/assets/space_04_great_room.png',
    src: '/assets/space_04_great_room.png',
    alt: 'Exoskeleton Hall double height structural steel with monumental hearth',
    coord: '46°41\'29"N · ZONE G-01',
    narrative:
      'A breathtaking 6.8-meter cathedral of structural HEB-300 charcoal steel. A monumental hand-split quartzite fireplace hearth anchors the double-height volume, while a custom-fabricated geometric brass icosahedron chandelier casts warm architectural silhouettes over a 10-seat live-edge walnut banquet table.',
    specs: [
      { label: 'STRUCTURAL STEEL', val: 'HEB-300 Exposed Structural Beams · Matte Obsidian' },
      { label: 'HEARTH MASONRY', val: 'Hand-Split Valser Quartzite with Guillotine Firebox' },
      { label: 'LIGHTING FOCAL', val: 'Bespoke Patinated Brass Polyhedral 2700K Chandelier' },
      { label: 'UPPER MEZZANINE', val: 'Structural Steel Cantilever Gallery Overlooking Pines' },
    ],
    highlight: '6.8-METER COLUMN-FREE SPAN · SEISMIC RATED',
  },
  {
    id: 'master_suite',
    index: '05',
    shortName: 'Nocturnal Suite',
    title: 'NOCTURNAL SUITE',
    subtitle: 'LIVING SOD OCULUS · BRONZE HELICAL STAIR',
    simpleDescription: 'Living meadow roof oculus with sculptural bronze spiral stair.',
    image: '/assets/space_05_master_suite.jpg',
    src: '/assets/space_05_master_suite.jpg',
    alt: 'Nocturnal Suite with green roof oculus and bronze spiral staircase',
    coord: '46°41\'29"N · ZONE B-01',
    narrative:
      'A subterranean sanctuary crowned by an architectural roof aperture framing native alpine meadow grasses against open sky. A sculptural patinated bronze spiral staircase curves upward to a private rooftop stargazing observatory, while low platform walnut bedding sits level with the water lilies outside.',
    specs: [
      { label: 'CEILING OCULUS', val: 'Walkable Quadruple-Pane Aperture in Alpine Sod Roof' },
      { label: 'VERTICAL ACCESS', val: 'Cold-Cast Patinated Bronze Continuous Spiral Stair' },
      { label: 'PLATFORM BED', val: 'Solid Canaletto Walnut Platform with Raw Linen Drapery' },
      { label: 'HEARTH TOWER', val: 'Textured Fieldstone Flue with Brass Capsule Sconces' },
    ],
    highlight: 'DIRECT HORIZONTAL REFLECTION ACROSS ALPINE TARN',
  },
];

// Expanded 10-Chamber Archive
const COMPLETE_ARCHIVE = [
  ...SIGNATURE_SPACES,
  {
    id: 'slice-01',
    index: '06',
    shortName: 'EV Vault',
    title: 'EV VAULT',
    subtitle: 'SUBTERRANEAN MOBILITY & CHARGING',
    simpleDescription: 'Climate-controlled granite gallery with ultra-fast charging.',
    image: '/assets/slices/slice_01.jpg',
    src: '/assets/slices/slice_01.jpg',
    alt: 'EV Subterranean Vault with charging bays',
    coord: '46°41\'26"N · ZONE V-01',
    narrative: 'Excavated 12 meters into solid granite, this underground vault features dual inductive charging pads, polished terrazzo floors, and precision climate stabilization.',
    specs: [
      { label: 'FLOORING', val: 'Diamond-Honed Basalt Terrazzo · Acid-Etched' },
      { label: 'POWER GRID', val: 'Dual 350kW DC Fast-Charging Arch · Solar Tied' },
      { label: 'AIR EXCHANGE', val: 'Sub-Slab Air Scrubber · 8 Cycles/Hour' },
      { label: 'ACCESS PORT', val: 'Hydraulic Bi-Fold Bronze-Clad Blast Gate' },
    ],
    highlight: '12M SUBTERRANEAN ROCK EXCAVATION',
  },
  {
    id: 'slice-03',
    index: '07',
    shortName: 'Wine Sommelier',
    title: 'WINE SOMMELIER',
    subtitle: 'NATURAL BEDROCK TEMPERATURE VAULT',
    simpleDescription: 'Geothermal passive cooling maintaining perpetual 12.8°C.',
    image: '/assets/slices/slice_03.jpg',
    src: '/assets/slices/slice_03.jpg',
    alt: 'Climate-controlled Wine Sommelier bedrock cave',
    coord: '46°41\'27"N · ZONE R-01',
    narrative: 'Surrounded on three sides by untreated Valser quartzite bedrock, humidity and temperature are naturally balanced by alpine geothermal mass.',
    specs: [
      { label: 'CAPACITY', val: '1,850 Bottles · Custom Blackened Steel Racks' },
      { label: 'THERMAL CORE', val: 'Passive 12.8°C Constant · ±0.4°C Annual Delta' },
      { label: 'HUMIDITY', val: '68% Relative Humidity · Natural Vapor Transfer' },
      { label: 'LIGHTING', val: 'UV-Free 2200K Narrow Beam Tasting Pendants' },
    ],
    highlight: 'ZERO MECHANICAL REFRIGERATION NEEDED',
  },
  {
    id: 'slice-05',
    index: '08',
    shortName: 'Hydrotherapy Spa',
    title: 'HYDROTHERAPY SPA',
    subtitle: 'CARVED TRAVERTINE ONSEN BATH',
    simpleDescription: 'Carved monolithic basin fed by natural alpine mineral springs.',
    image: '/assets/slices/slice_05.jpg',
    src: '/assets/slices/slice_05.jpg',
    alt: 'Carved Travertine Hydrotherapy Spa bath overlooking pine trees',
    coord: '46°41\'29"N · ZONE W-02',
    narrative: 'Carved directly from a single 9-ton block of Silver Travertine, the thermal soaking bath cantilevers out toward the pine canopy with heated overflow rim.',
    specs: [
      { label: 'BATH MONOLITH', val: 'Single Monolithic Block of Navona Travertine' },
      { label: 'WATER SOURCE', val: 'Geothermal Mineral Spring · 39.5°C Natural' },
      { label: 'DRAINAGE', val: 'Zero-Lip Perimeter Overflow Cascade' },
      { label: 'VENTILATION', val: 'Concealed Micro-Slot Dehumidification Core' },
    ],
    highlight: '39.5°C GEOTHERMAL SPRING FEED',
  },
  {
    id: 'slice-07',
    index: '09',
    shortName: 'Archive Library',
    title: 'ARCHIVE LIBRARY',
    subtitle: 'ROCKFACE READING MEZZANINE',
    simpleDescription: 'Three-story library backed by exposed bedrock and leather study nooks.',
    image: '/assets/slices/slice_07.jpg',
    src: '/assets/slices/slice_07.jpg',
    alt: 'Archive Library with rockface wall and reading chair',
    coord: '46°41\'28"N · ZONE L-03',
    narrative: 'Built directly against the vertical gneiss bedrock cliff inside the house. Custom-rolled steel library ladders glide along 12 meters of solid walnut shelving.',
    specs: [
      { label: 'SHELVING', val: 'Solid American Walnut with Hidden Steel Core' },
      { label: 'ROCK WALL', val: 'Sealed Raw Valser Gneiss Face with Accent Wash' },
      { label: 'SEATING', val: 'Hand-Stitched Saddle Leather Wingback Chairs' },
      { label: 'LADDER SYSTEM', val: 'Forged Patinated Steel Gliding Ladder' },
    ],
    highlight: '10,000 ARCHITECTURAL VOLUMES CAPACITY',
  },
  {
    id: 'slice-09',
    index: '10',
    shortName: 'Lakeside Dining',
    title: 'LAKESIDE DINING',
    subtitle: 'CANTILEVERED WATER BANQUET',
    simpleDescription: '12-seat banquet table extending toward open water.',
    image: '/assets/slices/slice_09.jpg',
    src: '/assets/slices/slice_09.jpg',
    alt: 'Lakeside Banquet dining room with floor-to-ceiling glass over lake',
    coord: '46°41\'28"N · ZONE D-01',
    narrative: 'Positioned right at the water’s edge with sliding frameless glass corners that dissolve completely in summer months.',
    specs: [
      { label: 'TABLE SLAB', val: '6.0m Single-Slab Bog Oak (Estimated 400 Years Old)' },
      { label: 'CHANDELIER', val: 'Custom Hand-Blown Murano Smoke Glass Pendants' },
      { label: 'TERRACE DOOR', val: 'Zero-Corner Pocket Track System (9m Opening)' },
      { label: 'FLOORING', val: 'Thermal Basalt Slabs Continuous Out to Dock' },
    ],
    highlight: '9-METER CONTINUOUS COLUMN-FREE OPENING',
  },
];

export default function MaterialPortfolio() {
  const [collection, setCollection] = useState('signature'); // 'signature' | 'all'
  const [projection, setProjection] = useState('orbit'); // 'orbit' | 'cylinder' | 'panorama'
  const [isDrifting, setIsDrifting] = useState(true);
  const [selectedChamber, setSelectedChamber] = useState(null);

  const activeItems = useMemo(() => {
    return collection === 'signature' ? SIGNATURE_SPACES : COMPLETE_ARCHIVE;
  }, [collection]);

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24 pointer-events-auto select-none">
      {/* Editorial Section Header - Authentic Swiss Architectural Typography */}
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 pb-6 border-b border-white/10 gap-6">
        <div>
          <span className="text-[10px] font-mono tracking-[0.35em] uppercase text-amber-400 block mb-2 font-light">
            04 // SPATIAL ARCHAEOLOGY
          </span>
          <h2 className="font-monolith-title text-3xl sm:text-5xl md:text-6xl font-extralight tracking-tight text-white leading-none">
            The Chambers<span className="text-amber-400">.</span>
          </h2>
          <p className="font-monolith-body text-xs sm:text-sm text-neutral-400 mt-2 font-light max-w-lg">
            Structural cantilevers, living rockfaces, and subterranean sanctuaries embedded in the Valser Alps.
          </p>
        </div>

        {/* Minimalist Architectural Switchers */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Collection Scope */}
          <div className="inline-flex rounded-lg p-1 bg-white/[0.03] border border-white/10 text-[10px] font-mono tracking-wider">
            <button
              onClick={() => setCollection('signature')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                collection === 'signature'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              SIGNATURE (05)
            </button>
            <button
              onClick={() => setCollection('all')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                collection === 'all'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              ARCHIVE (10)
            </button>
          </div>

          {/* Camera Projection */}
          <div className="inline-flex rounded-lg p-1 bg-white/[0.03] border border-white/10 text-[10px] font-mono tracking-wider">
            <button
              onClick={() => setProjection('orbit')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                projection === 'orbit'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              ORBITAL
            </button>
            <button
              onClick={() => setProjection('cylinder')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                projection === 'cylinder'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              ROTUNDA
            </button>
            <button
              onClick={() => setProjection('panorama')}
              className={`px-3 py-1.5 rounded transition-all cursor-pointer ${
                projection === 'panorama'
                  ? 'bg-white/15 text-white font-medium shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              PANORAMA
            </button>
          </div>

          {/* Autoplay Drift Toggle */}
          <button
            onClick={() => setIsDrifting(!isDrifting)}
            className="px-3 py-2 rounded-lg bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 text-[10px] font-mono text-neutral-400 hover:text-white transition-all cursor-pointer flex items-center gap-2"
            title={isDrifting ? 'Pause Rotation' : 'Resume Drift'}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isDrifting ? 'bg-amber-400 animate-pulse' : 'bg-neutral-600'}`} />
            <span>{isDrifting ? 'DRIFT' : 'PAUSED'}</span>
          </button>
        </div>
      </div>

      {/* Seamless Floating 3D Orbital Pavilion (Card removed, full atmospheric flow, no clipping) */}
      <div className="relative w-full h-[620px] sm:h-[680px] md:h-[720px] overflow-visible select-none">
        <CircularCarousel
          items={activeItems}
          preset={projection}
          intro="rise"
          cardWidth={330}
          aspectRatio={0.78}
          gap={32}
          speed={8}
          autoplay={isDrifting ? 'drift' : 'off'}
          direction="left"
          draggable={true}
          momentum={0.75}
          snap={true}
          pauseOnHover={false}
          focusOnClick={true}
          parallax={0.25}
          stretch={0.25}
          depthFade={0.45}
          fadeColor="#050505"
          innerShade={0.3}
          cornerRadius={20}
          captions={true}
          onItemClick={(item) => setSelectedChamber(item)}
          className="w-full h-full overflow-visible"
        />
      </div>

      {/* INTERACTIVE BLUEPRINT DOSSIER MODAL (Opens only on click) */}
      {selectedChamber && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 md:p-10 bg-black/85 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setSelectedChamber(null)}
        >
          <div
            className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl bg-[#0e0f13] border border-white/15 p-6 sm:p-10 shadow-[0_30px_100px_rgba(0,0,0,0.95)]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              onClick={() => setSelectedChamber(null)}
              className="absolute top-6 right-6 w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white flex items-center justify-center transition-all cursor-pointer"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 mb-3">
              <span className="text-xs font-mono tracking-[0.3em] uppercase text-amber-400">
                CHAMBER {selectedChamber.index} // ARCHITECTURAL DOSSIER
              </span>
              <span className="text-xs font-mono text-neutral-500">
                {selectedChamber.coord}
              </span>
            </div>

            <h2 className="font-monolith-title text-3xl sm:text-4xl font-extralight text-white tracking-wide mb-2">
              {selectedChamber.title || selectedChamber.shortName}
            </h2>
            <p className="text-amber-400/90 font-mono text-xs tracking-wider mb-6">
              {selectedChamber.subtitle || selectedChamber.simpleDescription}
            </p>

            {/* High-Res Hero Render */}
            <div className="w-full h-72 sm:h-96 rounded-xl overflow-hidden border border-white/10 mb-6 relative">
              <img
                src={selectedChamber.src || selectedChamber.image}
                alt={selectedChamber.shortName}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />
              <div className="absolute bottom-4 left-6 text-xs font-mono text-amber-300">
                ★ {selectedChamber.highlight}
              </div>
            </div>

            {/* Detailed Narrative */}
            <div className="mb-6">
              <h4 className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mb-2">
                SPATIAL NARRATIVE
              </h4>
              <p className="font-monolith-body text-sm text-neutral-200 leading-relaxed font-light">
                {selectedChamber.narrative}
              </p>
            </div>

            {/* Full Tectonic Engineering Specs */}
            <div>
              <h4 className="text-[10px] font-mono tracking-widest text-neutral-400 uppercase mb-3">
                TECTONIC SCHEDULE & SPECIFICATIONS
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {selectedChamber.specs?.map((spec, i) => (
                  <div key={i} className="p-3.5 rounded-lg bg-white/[0.03] border border-white/10">
                    <span className="text-[9px] font-mono uppercase tracking-wider text-amber-400/90 block mb-1">
                      {spec.label}
                    </span>
                    <span className="text-xs font-mono text-white">
                      {spec.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Return Action */}
            <div className="mt-8 pt-6 border-t border-white/10 flex justify-end">
              <button
                onClick={() => setSelectedChamber(null)}
                className="px-6 py-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/15 text-white font-mono text-xs tracking-widest transition-colors cursor-pointer"
              >
                CLOSE DOSSIER
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
