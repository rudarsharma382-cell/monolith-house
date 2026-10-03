import React from 'react';
import ReactDOM from 'react-dom/client';
import MaterialPortfolio from './MaterialPortfolio.jsx';
import MasonryGallery from './MasonryGallery.jsx';
import OutroRating from './OutroRating.jsx';

export function mountMaterialPortfolio() {
  const container = document.getElementById('material-portfolio-root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <MaterialPortfolio />
      </React.StrictMode>
    );
  }
}

export function mountMasonryGallery(onRollOverToNight) {
  const container = document.getElementById('masonry-gallery-root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <MasonryGallery onRollOverToNight={onRollOverToNight} />
      </React.StrictMode>
    );
  }
}

export function mountOutroRating() {
  const container = document.getElementById('peek-rating-root');
  if (container) {
    const root = ReactDOM.createRoot(container);
    root.render(
      <React.StrictMode>
        <OutroRating />
      </React.StrictMode>
    );
  }
}
