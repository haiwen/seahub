import React from 'react';
import { createRoot } from 'react-dom/client';
import Wiki from './pages/wiki';

const root = createRoot(document.getElementById('wrapper'));
root.render(<Wiki />);
