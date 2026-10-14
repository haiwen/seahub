import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { seafileAPI } from '@/api/seafile-api';
import wikiAPI from '@/api/wiki-api';
import AICoverPanel from './ai-cover-panel';
import useAICover from './use-ai-cover';

jest.mock('@/api/wiki-api', () => ({ __esModule: true, default: { generateCoverImage: jest.fn() } }));
jest.mock('@/api/seafile-api', () => ({ seafileAPI: { uploadImage: jest.fn() } }));
jest.mock('@/utils/constants', () => ({ gettext: s => s, wikiId: 'wiki' }));
jest.mock('uuid', () => ({ v4: () => 'unique-name' }));
jest.mock('@/components/loading', () => () => <span>loading</span>);
jest.mock('reactstrap', () => ({
  Button: ({ children, color, ...props }) => <button {...props}>{children}</button>,
  Modal: ({ children }) => <div>{children}</div>,
  ModalBody: ({ children }) => <div>{children}</div>,
  ModalFooter: ({ children }) => <div>{children}</div>,
  ModalHeader: ({ children }) => <h2>{children}</h2>,
}));

const page = { id: 'page', docUuid: 'doc', name: 'Team handbook' };

function PanelWithCallbacks({ visible = true, ...props }) {
  const cover = useAICover(props);
  return visible ? <AICoverPanel page={props.page} cover={cover} onClose={props.onClose} /> : null;
}

beforeEach(() => {
  jest.clearAllMocks();
  window.seafile = { docUuid: 'doc', accessToken: 'token', serviceUrl: '' };
  URL.createObjectURL = jest.fn(() => 'blob:preview');
  URL.revokeObjectURL = jest.fn();
  wikiAPI.generateCoverImage.mockResolvedValue({ data: new Blob(['png'], { type: 'image/png' }) });
  seafileAPI.uploadImage.mockResolvedValue({ data: { relative_path: ['/generated.png'] } });
});

async function generate() {
  fireEvent.click(screen.getByText('Use page title'));
  fireEvent.click(screen.getByText('Generate'));
  await screen.findByAltText('Cover preview');
}

test('preview does not upload; explicit adoption persists first', async () => {
  const save = jest.fn().mockResolvedValue();
  const close = jest.fn();
  render(<PanelWithCallbacks page={page} onUpdatePageConfig={save} onClose={close} />);
  await generate();
  expect(wikiAPI.generateCoverImage.mock.calls[0].slice(0, 3)).toEqual(['wiki', 'page', 'Team handbook']);
  expect(seafileAPI.uploadImage).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText('Use cover'));
  await waitFor(() => expect(close).toHaveBeenCalled());
  expect(save).toHaveBeenCalledWith('page', { cover_img_url: '/generated.png' }, { persistFirst: true });
});

test('save retry reuses uploaded image without regenerating', async () => {
  const save = jest.fn().mockRejectedValueOnce(new Error()).mockResolvedValueOnce();
  render(<PanelWithCallbacks page={page} onUpdatePageConfig={save} onClose={jest.fn()} />);
  await generate();
  fireEvent.click(screen.getByText('Use cover'));
  await screen.findByRole('alert');
  fireEvent.click(screen.getByText('Use cover'));
  await waitFor(() => expect(save).toHaveBeenCalledTimes(2));
  expect(seafileAPI.uploadImage).toHaveBeenCalledTimes(1);
  expect(wikiAPI.generateCoverImage).toHaveBeenCalledTimes(1);
});

test('late generation result after unmount is ignored', async () => {
  let finish;
  wikiAPI.generateCoverImage.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const save = jest.fn();
  const view = render(<PanelWithCallbacks page={page} onUpdatePageConfig={save} onClose={jest.fn()} />);
  fireEvent.click(screen.getByText('Use page title'));
  fireEvent.click(screen.getByText('Generate'));
  const signal = wikiAPI.generateCoverImage.mock.calls[0][3];
  view.unmount();
  expect(signal.aborted).toBe(true);
  await act(async () => { finish({ data: new Blob(['png'], { type: 'image/png' }) }); });
  expect(save).not.toHaveBeenCalled();
  expect(URL.createObjectURL).not.toHaveBeenCalled();
});

test('generation failure preserves the existing preview', async () => {
  render(<PanelWithCallbacks page={page} onUpdatePageConfig={jest.fn()} onClose={jest.fn()} />);
  await generate();
  wikiAPI.generateCoverImage.mockRejectedValueOnce(new Error());
  fireEvent.click(screen.getByText('Generate again'));
  await screen.findByRole('alert');
  expect(screen.getByAltText('Cover preview')).toBeTruthy();
  expect(seafileAPI.uploadImage).not.toHaveBeenCalled();
});

test('generation cannot be submitted twice while pending', async () => {
  wikiAPI.generateCoverImage.mockReturnValue(new Promise(() => {}));
  const view = render(<PanelWithCallbacks page={page} onUpdatePageConfig={jest.fn()} onClose={jest.fn()} />);
  fireEvent.click(screen.getByText('Use page title'));
  const button = screen.getByText('Generate');
  fireEvent.click(button);
  fireEvent.click(button);
  expect(wikiAPI.generateCoverImage).toHaveBeenCalledTimes(1);
  view.unmount();
});

test('close and reopen retains prompt and pending request without resubmitting', async () => {
  let finish;
  wikiAPI.generateCoverImage.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const props = { page, onUpdatePageConfig: jest.fn(), onClose: jest.fn() };
  const view = render(<PanelWithCallbacks {...props} />);
  fireEvent.click(screen.getByText('Use page title'));
  fireEvent.click(screen.getByText('Generate'));
  const signal = wikiAPI.generateCoverImage.mock.calls[0][3];
  view.rerender(<PanelWithCallbacks {...props} visible={false} />);
  expect(signal.aborted).toBe(false);
  view.rerender(<PanelWithCallbacks {...props} />);
  expect(screen.getByLabelText('Describe your cover').value).toBe('Team handbook');
  expect(screen.getByText('Generate').disabled).toBe(true);
  fireEvent.click(screen.getByText('Generate'));
  expect(wikiAPI.generateCoverImage).toHaveBeenCalledTimes(1);
  await act(async () => { finish({ data: new Blob(['png'], { type: 'image/png' }) }); });
  await screen.findByAltText('Cover preview');
});

test('result arriving while closed is available on reopen without adoption', async () => {
  let finish;
  wikiAPI.generateCoverImage.mockReturnValue(new Promise(resolve => { finish = resolve; }));
  const props = { page, onUpdatePageConfig: jest.fn(), onClose: jest.fn() };
  const view = render(<PanelWithCallbacks {...props} />);
  fireEvent.click(screen.getByText('Use page title'));
  fireEvent.click(screen.getByText('Generate'));
  view.rerender(<PanelWithCallbacks {...props} visible={false} />);
  await act(async () => { finish({ data: new Blob(['png'], { type: 'image/png' }) }); });
  expect(props.onUpdatePageConfig).not.toHaveBeenCalled();
  expect(seafileAPI.uploadImage).not.toHaveBeenCalled();
  expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  view.rerender(<PanelWithCallbacks {...props} />);
  expect(screen.getByAltText('Cover preview')).toBeTruthy();
  expect(wikiAPI.generateCoverImage).toHaveBeenCalledTimes(1);
  view.unmount();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview');
});
