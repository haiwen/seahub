import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import LibraryFilesSelector from './library-files-selector';

jest.mock('@/utils/constants', () => ({
  gettext: (text) => text,
}));

jest.mock('../../icon', () => {
  return function MockIcon() {
    return null;
  };
});

// SelectorDisplay passes its ref to Tooltip, which expects a DOM id; the
// resulting prop-type warning is pre-existing and unrelated to this test.
jest.mock('../../tooltip', () => {
  return function MockTooltip() {
    return null;
  };
});

jest.mock('@/api/seafile-api', () => ({
  seafileAPI: {
    searchFiles: jest.fn(() => Promise.resolve({ data: { results: [] } })),
  },
}));

describe('LibraryFilesSelector', () => {
  it('renders the add trigger', () => {
    const html = renderToStaticMarkup(
      <LibraryFilesSelector repoID="repo-id" value={[]} onChange={() => {}} />
    );

    expect(html).toContain('attach-files-btn');
  });
});
