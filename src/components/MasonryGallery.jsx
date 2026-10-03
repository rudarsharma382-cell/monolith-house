import React from 'react';
import Masonry from './Masonry.jsx';

const ARCHIVE_ITEMS = [
  {
    id: 'slice-1',
    img: '/assets/slices/slice_01.jpg',
    height: 520,
    title: 'EV Vault',
    url: '#',
  },
  {
    id: 'slice-2',
    img: '/assets/slices/slice_02.jpg',
    height: 680,
    title: 'Atrium Staircase',
    url: '#',
  },
  {
    id: 'slice-3',
    img: '/assets/slices/slice_03.jpg',
    height: 480,
    title: 'Wine Cellar',
    url: '#',
  },
  {
    id: 'slice-4',
    img: '/assets/slices/slice_04.jpg',
    height: 600,
    title: 'Culinary Island',
    url: '#',
  },
  {
    id: 'slice-5',
    img: '/assets/slices/slice_05.jpg',
    height: 540,
    title: 'Hydrotherapy Bath',
    url: '#',
  },
  {
    id: 'slice-6',
    img: '/assets/slices/slice_06.jpg',
    height: 660,
    title: 'Canopy Bedroom',
    url: '#',
  },
  {
    id: 'slice-7',
    img: '/assets/slices/slice_07.jpg',
    height: 720,
    title: 'Archive Library',
    url: '#',
  },
  {
    id: 'slice-8',
    img: '/assets/slices/slice_08.jpg',
    height: 500,
    title: 'Art Corridor',
    url: '#',
  },
  {
    id: 'slice-9',
    img: '/assets/slices/slice_09.jpg',
    height: 620,
    title: 'Lakeside Dining',
    url: '#',
  },
  {
    id: 'slice-10',
    img: '/assets/slices/slice_10.jpg',
    height: 560,
    title: 'Wellness Studio',
    url: '#',
  },
  {
    id: 'slice-11',
    img: '/assets/slices/slice_11.jpg',
    height: 680,
    title: 'Hearth Lounge',
    url: '#',
  },
  {
    id: 'slice-12',
    img: '/assets/slices/slice_12.jpg',
    height: 480,
    title: 'Glass Observatory',
    url: '#',
  },
  {
    id: 'slice-13',
    img: '/assets/slices/slice_13.jpg',
    height: 580,
    title: 'Cedar Sauna',
    url: '#',
  },
  {
    id: 'slice-14',
    img: '/assets/slices/slice_14.jpg',
    height: 640,
    title: 'Atelier Studio',
    url: '#',
  },
  {
    id: 'slice-15',
    img: '/assets/slices/slice_15.jpg',
    height: 520,
    title: 'Tectonic Vestibule',
    url: '#',
  },
  {
    id: 'slice-16',
    img: '/assets/slices/slice_16.jpg',
    height: 700,
    title: 'Primary Ensuite',
    url: '#',
  },
];

export default function MasonryGallery({ onRollOverToNight }) {
  const handleScrollToNight = () => {
    if (onRollOverToNight) {
      onRollOverToNight();
    } else {
      const act06 = document.getElementById('act-06');
      if (act06) {
        act06.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14 pointer-events-auto">
      {/* Editorial Header */}
      <div className="text-center max-w-3xl mx-auto mb-12">
        <span className="text-[10px] sm:text-xs tracking-[0.35em] uppercase text-amber-400 font-light block mb-3 font-mono">
          16 SLICES // ARCHITECTURAL TAXONOMY
        </span>
        <h2 className="font-monolith-title text-3xl sm:text-5xl md:text-6xl font-extralight tracking-[0.1em] text-white leading-tight mb-4 headline-text-shadow">
          Spatial Archive In Motion<span className="text-amber-400">.</span>
        </h2>
        <p className="font-monolith-body text-sm sm:text-base md:text-lg font-light text-neutral-300 leading-relaxed max-w-xl mx-auto editorial-text-shadow">
          16 programmatic studies across subterranean rock, lakefront thresholds, and nocturnal shelters.
        </p>
      </div>

      {/* Masonry Fluid Grid */}
      <div className="w-full">
        <Masonry
          items={ARCHIVE_ITEMS}
          ease="power3.out"
          duration={0.8}
        />
      </div>

      {/* Rollover to Night Scene CTA Cue */}
      <div className="mt-16 text-center">
        <button
          onClick={handleScrollToNight}
          className="group glass-pill px-8 py-4 rounded-full text-xs font-mono tracking-[0.25em] text-neutral-300 hover:text-white hover:border-amber-400 transition-all inline-flex items-center gap-3 cursor-pointer shadow-2xl"
        >
          <span>ROLL OVER TOWARDS NIGHT SCENE</span>
          <span className="text-amber-400 group-hover:translate-y-1 transition-transform">↓</span>
        </button>
      </div>
    </div>
  );
}
