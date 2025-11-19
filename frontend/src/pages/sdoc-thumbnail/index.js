import React from 'react';
import { createRoot } from 'react-dom/client';

export default function SdocThumbnail() {
  return (
    <div>SdocThumbnail</div>
  );
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<SdocThumbnail />);
