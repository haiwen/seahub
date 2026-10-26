import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import URLDecorator from '@/utils/url-decorator';
import Attachments from './index';

jest.mock('../../../icon', () => {
  return function MockIcon() {
    return null;
  };
});

jest.mock('../../../../utils/constants', () => ({
  gettext: (text) => text,
}));

jest.mock('../../../../utils/url-decorator', () => ({
  getUrl: jest.fn(() => '/lib/repo-id/file/docs/formulas.md'),
}));

const attachment = {
  key: 'repo-id:/docs/formulas.md',
  repo_id: 'repo-id',
  path: '/docs/formulas.md',
  name: 'formulas.md',
};

const imageAttachment = (overrides = {}) => ({
  key: 'image-1',
  _id: 'image-1',
  type: 'image',
  repo_id: 'repo-id',
  path: '/images/ai-chat/parrot.png',
  name: 'parrot.png',
  status: 'done',
  ...overrides,
});

describe('Attachments', () => {
  beforeEach(() => {
    URLDecorator.getUrl.mockClear();
  });

  it('renders a sent attachment as a link that opens in a new tab', () => {
    const html = renderToStaticMarkup(<Attachments attachments={[attachment]} isOpenable />);

    expect(html).toContain('href="/lib/repo-id/file/docs/formulas.md"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(URLDecorator.getUrl).toHaveBeenCalledWith({
      type: 'open_with_default',
      repoID: 'repo-id',
      filePath: '/docs/formulas.md',
    });
  });

  it('keeps a pending attachment removable and non-openable', () => {
    const onRemove = jest.fn();
    const html = renderToStaticMarkup(<Attachments attachments={[attachment]} isOpenable onRemove={onRemove} />);

    expect(html).not.toContain('<a');
    expect(html).toContain('<button');
    expect(URLDecorator.getUrl).not.toHaveBeenCalled();
  });

  it('does not make an attachment openable by default', () => {
    const html = renderToStaticMarkup(<Attachments attachments={[attachment]} />);

    expect(html).not.toContain('<a');
    expect(URLDecorator.getUrl).not.toHaveBeenCalled();
  });

  it('does not create a link when the attachment path is missing', () => {
    const html = renderToStaticMarkup(<Attachments attachments={[{ ...attachment, path: '' }]} isOpenable />);

    expect(html).not.toContain('<a');
    expect(URLDecorator.getUrl).not.toHaveBeenCalled();
  });
});

describe('Attachments with an image', () => {
  beforeEach(() => {
    URLDecorator.getUrl.mockClear();
  });

  it('shows a loading mask and hides the delete button while the image is uploading', () => {
    const html = renderToStaticMarkup(
      <Attachments
        attachments={[imageAttachment({ status: 'uploading', path: 'blob:local' })]}
        onRemove={jest.fn()}
        isOpenable
      />
    );

    expect(html).toContain('sea-ai-chat-message-attachments-item-mask');
    expect(html).not.toContain('aria-label="Delete"');
    expect(html).not.toContain('<a');
  });

  it('offers a retry on a failed image and still lets it be removed', () => {
    const html = renderToStaticMarkup(
      <Attachments
        attachments={[imageAttachment({ status: 'failed', path: 'blob:local', image: { name: 'parrot.png' } })]}
        onRemove={jest.fn()}
        onReupload={jest.fn()}
      />
    );

    expect(html).toContain('aria-label="Retry"');
    expect(html).toContain('aria-label="Delete"');
  });

  it('does not offer a retry when no retry handler is given', () => {
    const html = renderToStaticMarkup(
      <Attachments
        attachments={[imageAttachment({ status: 'failed', path: 'blob:local', image: { name: 'parrot.png' } })]}
      />
    );

    expect(html).not.toContain('aria-label="Retry"');
  });

  it('loads a finished image from the library and lets it open', () => {
    const html = renderToStaticMarkup(<Attachments attachments={[imageAttachment()]} isOpenable />);

    expect(URLDecorator.getUrl).toHaveBeenCalledWith({
      type: 'raw_file',
      repoID: 'repo-id',
      filePath: '/images/ai-chat/parrot.png',
    });
    expect(html).toContain('<a');
  });

  it('prefers the local preview of a finished image', () => {
    const html = renderToStaticMarkup(
      <Attachments attachments={[imageAttachment({ preview_path: 'blob:local-preview' })]} />
    );

    expect(html).toContain('blob:local-preview');
    expect(URLDecorator.getUrl).not.toHaveBeenCalled();
  });

  it('treats an image restored from the chat history as finished and openable', () => {
    const html = renderToStaticMarkup(
      <Attachments
        attachments={[{ type: 'image', repo_id: 'repo-id', path: '/images/ai-chat/old.png', name: 'old.png' }]}
        isOpenable
      />
    );

    expect(html).not.toContain('sea-ai-chat-message-attachments-item-mask');
    expect(html).toContain('<a');
  });
});
