import React from 'react';
import { createRoot } from 'react-dom/client';
import WikiRepoView from './pages/wiki-repo-view';

const root = createRoot(document.getElementById('wrapper'));
root.render(<WikiRepoView/>);
