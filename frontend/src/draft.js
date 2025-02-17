import React from 'react';
import { createRoot } from 'react-dom/client';

import './css/draft.css';

export default function Draft() {
  return (
    <div id="draft">
      <h1>Draft module</h1>
      <div>The current module is no longer supported</div>
    </div>
  );
}

const root = createRoot(document.getElementById('wrapper'));
root.render(<Draft />);
