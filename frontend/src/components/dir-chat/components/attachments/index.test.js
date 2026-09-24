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
  getUrl: jest.fn(({ type, repoID, filePath }) => {
    return type === 'raw_file' ? `/lib/${repoID}/file${filePath}?raw=1` : `/lib/${repoID}/file${filePath}`;
  }),
}));

const attachment = {
  key: 'repo-id:/docs/formulas.md',
  repo_id: 'repo-id',
  path: '/docs/formulas.md',
  name: 'formulas.md',
};

const imageAttachment = (overrides) => ({
  type: 'image',
  _id: 'img-1',
  key: 'img-1',
  repo_id: 'repo-id',
  path: '/images/ai-chat/shot-1.png',
  name: 'shot-1.png',
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

  describe('image attachments', () => {
    it('renders a local preview and no remove button while uploading', () => {
      const onRemove = jest.fn();
      const html = renderToStaticMarkup(
        <Attachments
          attachments={[imageAttachment({ status: 'uploading', path: 'blob:local', preview_path: '' })]}
          onRemove={onRemove}
        />
      );

      expect(html).toContain('src="blob:local"');
      expect(html).not.toContain('sea-ai-chat-message-attachments-item-remove');
      expect(URLDecorator.getUrl).not.toHaveBeenCalled();
    });

    it('renders the library raw url once the upload is done', () => {
      const html = renderToStaticMarkup(<Attachments attachments={[imageAttachment()]} />);

      expect(html).toContain('src="/lib/repo-id/file/images/ai-chat/shot-1.png?raw=1"');
      expect(html).toContain('sea-ai-chat-message-attachments-item-image');
    });

    it('prefers the local preview over the library url', () => {
      const html = renderToStaticMarkup(
        <Attachments attachments={[imageAttachment({ preview_path: 'blob:preview' })]} />
      );

      expect(html).toContain('src="blob:preview"');
    });

    it('shows a retry button when the upload failed', () => {
      const html = renderToStaticMarkup(
        <Attachments
          attachments={[imageAttachment({ status: 'failed', path: 'blob:local', preview_path: '', image: {} })]}
          onReupload={jest.fn()}
        />
      );

      expect(html).toContain('sea-ai-chat-message-attachments-item-failed');
      expect(html).toContain('Failed');
      expect(html).toContain('aria-label="Retry"');
    });

    it('hides the retry button when no reupload handler is given', () => {
      const html = renderToStaticMarkup(
        <Attachments attachments={[imageAttachment({ status: 'failed', path: 'blob:local', image: {} })]} />
      );

      expect(html).not.toContain('aria-label="Retry"');
    });

    it('treats an image restored from history as done', () => {
      const html = renderToStaticMarkup(
        <Attachments attachments={[imageAttachment({ status: undefined, _id: undefined, key: undefined })]} />
      );

      expect(html).toContain('src="/lib/repo-id/file/images/ai-chat/shot-1.png?raw=1"');
      expect(html).not.toContain('sea-ai-chat-message-attachments-item-failed');
    });

    it('opens the library file when the attachment is openable', () => {
      const html = renderToStaticMarkup(<Attachments attachments={[imageAttachment()]} isOpenable />);

      expect(html).toContain('href="/lib/repo-id/file/images/ai-chat/shot-1.png"');
      expect(html).toContain('target="_blank"');
    });

    it('does not open an image that is not done yet', () => {
      const html = renderToStaticMarkup(
        <Attachments attachments={[imageAttachment({ status: 'failed', path: 'blob:local' })]} isOpenable />
      );

      expect(html).not.toContain('<a');
    });
  });
});
