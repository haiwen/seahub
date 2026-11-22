import React from 'react';
import { MarkdownViewer } from '@seafile/seafile-editor';
import { renderToStaticMarkup } from 'react-dom/server';
import { CHAT_MESSAGE_TYPE } from '../../constants';
import CustomizeMarkdownViewer from './index';

jest.mock('@seafile/seafile-editor', () => ({
  ELementTypes: { LINK_REFERENCE: 'reference', DEFINITION: 'definition', LINK: 'link' },
  MarkdownViewer: jest.fn(({ value }) => <div className="markdown">{value}</div>),
}));
jest.mock('@/utils/constants', () => ({ gettext: (text) => text, mediaUrl: '/media/', siteRoot: '/' }));
jest.mock('@/utils/utils', () => ({ Utils: { encodePath: encodeURI } }));
jest.mock('@/utils/url-decorator', () => ({
  getUrl: ({ repoID, filePath }) => `/lib/${repoID}/file${encodeURI(filePath)}`,
}));
jest.mock('../../hooks', () => ({ useDocuments: () => ({ openDocument: jest.fn() }) }));
jest.mock('../customize-definition', () => () => null);
jest.mock('../customize-link', () => () => null);
jest.mock('../customize-link-reference', () => () => null);

const tag = '<seafile-ai-seadoc status="created" file_name="Plan.sdoc" path="/AI Generated/Plan.sdoc" description="Project plan"></seafile-ai-seadoc>';
const renderReply = (reply, sources = [], isStreaming = false) => renderToStaticMarkup(
  <CustomizeMarkdownViewer
    chatId="message-id"
    repoID="repo"
    isStreaming={isStreaming}
    message={{ [CHAT_MESSAGE_TYPE.AI_REPLY]: reply, [CHAT_MESSAGE_TYPE.SOURCES]: sources }}
  />
);

beforeEach(() => MarkdownViewer.mockClear());

test('renders a card-only reply without creating an empty Markdown viewer', () => {
  expect(renderReply(tag)).toContain('sea-ai-seadoc-name');
  expect(MarkdownViewer).not.toHaveBeenCalled();
});

test('preserves text/card order and resolves citations in each Markdown viewer', () => {
  const html = renderReply(`Before [Reference 1]\n${tag}\nAfter [Reference 1]`, [{ title: 'Source', path: '/source.txt' }]);
  expect(html.indexOf('Before')).toBeLessThan(html.indexOf('sea-ai-seadoc-name'));
  expect(html.indexOf('sea-ai-seadoc-name')).toBeLessThan(html.indexOf('After'));
  expect(MarkdownViewer).toHaveBeenCalledTimes(2);
  MarkdownViewer.mock.calls.forEach(([props]) => {
    expect(props.value).toContain('[Source][1]');
    expect(props.value.match(/\[1\]: #reference-1/g)).toHaveLength(1);
  });
});

test('matches Markdown artifact preview links even when a card separates the pair', () => {
  renderReply(`<seafile-ai-markdown file_name="notes.md"># Notes</seafile-ai-markdown>\n${tag}\n<seafile-ai-markdown-link url="/lib/repo/file/notes.md"></seafile-ai-markdown-link>`);
  const props = MarkdownViewer.mock.calls[0][0];
  expect(props.options.link.render.props.mdFiles).toEqual([
    expect.objectContaining({ name: 'notes.md', content: '# Notes', fileUrl: '/lib/repo/file/notes.md' }),
  ]);
  expect(props.value).toContain('[notes.md](file:///seafile-ai/notes.md?t=message-id)');
  expect(props.value).not.toContain('seafile-ai-markdown');
});

test('keeps saved result cards hidden while a reply is streaming', () => {
  const html = renderReply(`Before\n${tag}\nAfter`, [], true);
  expect(html).toContain('Before');
  expect(html).toContain('After');
  expect(html).not.toContain('sea-ai-seadoc');
});
