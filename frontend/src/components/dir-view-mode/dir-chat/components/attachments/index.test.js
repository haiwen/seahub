import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Attachments from './index';
import URLDecorator from '../../../../../utils/url-decorator';

jest.mock('../../../../icon', () => {
  return function MockIcon() {
    return null;
  };
});

jest.mock('../../../../../utils/constants', () => ({
  gettext: (text) => text,
}));

jest.mock('../../../../../utils/url-decorator', () => ({
  getUrl: jest.fn(() => '/lib/repo-id/file/docs/formulas.md'),
}));

const attachment = {
  key: 'repo-id:/docs/formulas.md',
  repo_id: 'repo-id',
  path: '/docs/formulas.md',
  name: 'formulas.md',
};

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
