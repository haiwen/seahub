import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { transformToolBlocks } from './utils';
import ToolBlock, { transformToolBlocksForCopy } from './index';

jest.mock('@/utils/constants', () => ({ gettext: (text) => text, siteRoot: '/' }));
jest.mock('@/utils/utils', () => ({ Utils: { encodePath: (path) => path.split('/').map(encodeURIComponent).join('/') } }));

describe('tool block rendering', () => {
  it('renders a document reference with a local URL and escapes its text', () => {
    const { blocks } = transformToolBlocks('<seadoc status="created" name="A.sdoc" path="/AI Generated/A.sdoc" description="&lt;img src=x onerror=alert(1)&gt;" />');
    const html = renderToStaticMarkup(<ToolBlock block={blocks[0]} repoID="repo-id" />);
    expect(html).toContain('href="/lib/repo-id/file/AI%20Generated/A.sdoc"');
    expect(html).toContain('target="_blank"');
    expect(html).toContain('rel="noopener noreferrer"');
    expect(html).toContain('&lt;img');
    expect(html).not.toContain('<img');
  });

  it('renders an unconfirmed result without claiming success or linking a file', () => {
    const { blocks } = transformToolBlocks('<seadoc status="unknown" />');
    const html = renderToStaticMarkup(<ToolBlock block={blocks[0]} repoID="repo-id" />);
    expect(html).toContain('creation could not be confirmed');
    expect(html).not.toContain('<a');
    expect(html).not.toContain('Created');
  });

  it('copies normal document links and error messages, not synthetic block URLs', () => {
    const { value, blocks } = transformToolBlocks('Before\n<seadoc status="created" name="A.sdoc" path="/AI Generated/A.sdoc" />\n<seadoc status="failed" />\nAfter');
    const text = transformToolBlocksForCopy(value, blocks, 'repo-id');
    expect(text).toContain('[A.sdoc](/lib/repo-id/file/AI%20Generated/A.sdoc)');
    expect(text).toContain('The document could not be created.');
    expect(text).toContain('Before');
    expect(text).toContain('After');
    expect(text).not.toContain('file:///');
  });
});
