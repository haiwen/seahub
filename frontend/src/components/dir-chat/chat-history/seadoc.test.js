import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { parseContentBlocks } from './content-blocks';
import { REPLY_BLOCK_HANDLERS } from './reply-blocks';
import Seadoc, { copySeadocBlock, seadocBlockToPart } from './seadoc';

jest.mock('@/utils/constants', () => ({ gettext: (text) => text }));
jest.mock('@/utils/url-decorator', () => ({
  getUrl: ({ repoID, filePath }) => `/lib/${repoID}/file${encodeURI(filePath)}`,
}));

const tag = '<seafile-ai-seadoc status="created" sdoc_create_uuid="create-id" file_name="计划.sdoc" path="/AI Generated/计划.sdoc" doc_uuid="doc-id" description="A &amp; B"></seafile-ai-seadoc>';

const extractSeadocBlocks = (value, isStreaming = false) => {
  const parts = [];
  parseContentBlocks(value, Object.keys(REPLY_BLOCK_HANDLERS)).forEach((block) => {
    if (block.tag === 'seafile-ai-seadoc') {
      const part = seadocBlockToPart(block, isStreaming);
      if (part) parts.push(part);
    } else {
      const last = parts[parts.length - 1];
      if (last?.type === 'text') last.value += block.raw;
      else parts.push({ type: 'text', value: block.raw });
    }
  });
  return parts;
};

test('renders the created file card with location, description and opening link', () => {
  const [{ data }] = extractSeadocBlocks(tag);
  const html = renderToStaticMarkup(<Seadoc data={data} repoID="repo" />);
  expect(html).toContain('sea-ai-seadoc');
  expect(html).toContain('计划.sdoc');
  expect(html).toContain('/AI Generated/计划.sdoc');
  expect(html).toContain('A &amp; B');
  expect(html).toContain('Open document');
  expect(html).toContain('target="_blank"');
  expect(html).toContain('rel="noopener noreferrer"');
  expect(data.doc_uuid).toBe('doc-id');
});

test('keeps body text and multiple cards in their original order', () => {
  const parts = extractSeadocBlocks(`Before\n${tag}\nBetween\n${tag}\nAfter`);
  expect(parts.map(({ type }) => type)).toEqual(['text', 'seadoc', 'text', 'seadoc', 'text']);
  expect(parts.filter(({ type }) => type === 'text').map(({ value }) => value.trim())).toEqual(['Before', 'Between', 'After']);
});

test('hides JSON drafts, self-closing references and partial streaming tags without swallowing later text', () => {
  const draft = '<seafile-ai-seadoc file_name="A.sdoc" description="A">{"title":"A"}</seafile-ai-seadoc>';
  expect(extractSeadocBlocks(draft)).toEqual([]);
  const reference = '<seafile-ai-seadoc sdoc_create_uuid="id" file_name="A.sdoc" />';
  expect(extractSeadocBlocks(`${reference}After`)).toEqual([{ type: 'text', value: 'After' }]);
  for (let length = '<seafile-ai-seadoc'.length; length < draft.length; length++) {
    expect(extractSeadocBlocks(draft.slice(0, length))).toEqual([]);
  }
  expect(extractSeadocBlocks(tag, true)).toEqual([]);
});

test('preserves code examples and Markdown artifact contents', () => {
  for (const value of ['```\n' + tag + '\n```', '`' + tag + '`', `<seafile-ai-markdown file_name="example.md">${tag}</seafile-ai-markdown>`]) {
    expect(extractSeadocBlocks(value)).toEqual([{ type: 'text', value }]);
  }
});

test('rejects unsafe paths and renders failures without opening links', () => {
  const [{ data }] = extractSeadocBlocks(tag.replace('/AI Generated/计划', '/AI Generated/../计划'));
  expect(data.error_code).toBe('invalid_artifact');
  const html = renderToStaticMarkup(<Seadoc data={data} repoID="repo" />);
  expect(html).toContain('Failed to create the document.');
  expect(html).not.toContain('href=');
  expect(renderToStaticMarkup(<Seadoc data={{ status: 'failed', error_code: 'permission_denied' }} />)).toContain('Permission denied.');
});

test('treats descriptions as text and copies a usable link instead of protocol tags', () => {
  const [{ data }] = extractSeadocBlocks(tag.replace('A &amp; B', '&lt;img src=x onerror=alert(1)&gt;'));
  const html = renderToStaticMarkup(<Seadoc data={data} repoID="repo" />);
  expect(html).not.toContain('<img');
  expect(html).toContain('&lt;img');
  expect(copySeadocBlock(data, 'repo')).toContain('[计划.sdoc](/lib/repo/file');
  expect(copySeadocBlock(data, 'repo')).not.toContain('seafile-ai-seadoc');
});
