import React from 'react';
import { createRoot } from 'react-dom/client';
import HistoryTrashFileView from '@/pages/history-trash-file-view';

const root = createRoot(document.getElementById('wrapper'));
root.render(<HistoryTrashFileView />);
