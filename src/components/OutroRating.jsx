import React, { useState } from 'react';
import PeekRating from './PeekRating.jsx';

const LABELS = [
  'Raw Geology',
  'Refined Tectonics',
  'Harmonic Balance',
  'Sublime Sanctuary',
  'Architectural Masterpiece',
];

export default function OutroRating() {
  const [rating, setRating] = useState(5);

  return (
    <div className="flex flex-col items-start gap-1.5 pointer-events-auto select-none">
      <span className="text-[9px] sm:text-[10px] font-mono tracking-[0.3em] text-amber-400/90 uppercase font-light drop-shadow">
        ARCHITECTURAL IMPRESSION
      </span>

      {/* Pure Floating Star Glyphs - Zero card, zero dome, zero background box */}
      <div className="flex items-center -ml-1">
        <PeekRating
          defaultValue={5}
          value={rating}
          onChange={(val) => setRating(val)}
          count={5}
          shape="star"
          labels={LABELS}
          activeColor="#fbbf24"
          idleColor="#52525b"
          tipColor="#18181b"
          tipTextColor="#fef08a"
          size={26}
          lift={6}
          magnify={1.2}
          riseDuration={300}
          popScale={1.3}
          showTip={true}
          allowClear={true}
        />
      </div>

      {/* Dynamic Feedback Metric */}
      <div className="h-4 flex items-center">
        {rating > 0 ? (
          <span className="text-[10px] font-mono tracking-widest text-neutral-300 font-light drop-shadow transition-all">
            <span className="text-amber-400 font-semibold mr-1.5">★ {rating}.0</span>
            <span className="text-white/80">{LABELS[rating - 1]?.toUpperCase()}</span>
          </span>
        ) : (
          <span className="text-[9px] font-mono tracking-widest text-neutral-500">
            TAP TO RATE RETREAT
          </span>
        )}
      </div>
    </div>
  );
}
