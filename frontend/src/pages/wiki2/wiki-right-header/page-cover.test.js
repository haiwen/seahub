import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import PageCover from './page-cover';

jest.mock('@/api/seafile-api', () => ({ seafileAPI: {} }));
jest.mock('./use-ai-cover', () => () => ({ saving: false }));
jest.mock('@/components/icon', () => () => null);
jest.mock('@/components/loading', () => () => null);
jest.mock('@/components/toast', () => ({}));
jest.mock('@/utils/constants', () => ({ gettext: s => s, wikiPermission: 'rw' }));
jest.mock('@/utils/utils', () => ({ Utils: { isDesktop: () => true } }));
jest.mock('reactstrap', () => ({
  Popover: ({ children, isOpen, target }) => isOpen ? <div data-testid="cover-popover" data-target={target}>{children}</div> : null,
}));
jest.mock('./ai-cover-panel', () => {
  const React = require('react');
  return function Panel() {
    const [value, setValue] = React.useState('');
    return <input aria-label="AI prompt" value={value} onChange={e => setValue(e.target.value)} />;
  };
});

const page = { id: 'page', name: 'Page', docUuid: 'doc', cover_img_url: '/cover.png' };

function Cover({ currentPageConfig = page, isPopoverOpen = true }) {
  const [activePanel, onPanelChange] = React.useState('ai');
  return (
    <PageCover currentPageConfig={currentPageConfig} onUpdatePageConfig={jest.fn()}
      aiAvailable isPopoverOpen={isPopoverOpen} onPopoverChange={jest.fn()}
      activePanel={activePanel} onPanelChange={onPanelChange} />
  );
}

beforeEach(() => {
  window.seafile = { docUuid: 'doc', serviceUrl: '', mediaUrl: '/media/' };
});

test('AI tab is inline and retains input across tab switches', () => {
  render(<Cover />);
  const input = screen.getByLabelText('AI prompt');
  fireEvent.change(input, { target: { value: 'mountains' } });
  fireEvent.click(screen.getByText('Gallery'));
  expect(input.closest('[hidden]')).toBeTruthy();
  fireEvent.click(screen.getByText('AI generate'));
  expect(input.closest('[hidden]')).toBeNull();
  expect(input.value).toBe('mountains');
  expect(screen.queryByRole('dialog')).toBeNull();
});

test('closing popover hides the presentation panel', () => {
  const view = render(<Cover />);
  fireEvent.change(screen.getByLabelText('AI prompt'), { target: { value: 'mountains' } });
  view.rerender(<Cover isPopoverOpen={false} />);
  expect(screen.queryByLabelText('AI prompt')).toBeNull();
  view.rerender(<Cover />);
  expect(screen.getByLabelText('AI prompt').value).toBe('');
});

test('page without a cover does not render a standalone AI popover', () => {
  render(<Cover currentPageConfig={{ ...page, cover_img_url: '' }} />);
  expect(screen.queryByTestId('cover-popover')).toBeNull();
  expect(screen.queryByLabelText('AI prompt')).toBeNull();
  expect(screen.queryByAltText('Cover')).toBeNull();
});
