import React from 'react';
import { createRoot } from 'react-dom/client';
import Settings from './pages/settings';

const root = createRoot(document.getElementById('wrapper'));
root.render(<Settings />);
