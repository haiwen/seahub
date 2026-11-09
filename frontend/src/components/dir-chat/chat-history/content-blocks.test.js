import { parseContentBlocks } from './content-blocks';
import fixtures from './content-blocks.fixtures.json';
import { buildReplyParts, REPLY_BLOCK_HANDLERS } from './reply-blocks';

jest.mock('@/utils/constants', () => ({ gettext: (text) => text }));
jest.mock('@/utils/url-decorator', () => ({ getUrl: () => '/file' }));

test.each(fixtures)('$name', ({ value, tags, types, blockTags, complete }) => {
  const blocks = parseContentBlocks(value, tags);
  expect(blocks.map((block) => block.type)).toEqual(types);
  expect(blocks.filter((block) => block.type === 'block').map((block) => block.tag)).toEqual(blockTags);
  expect(blocks.filter((block) => block.type === 'block').map((block) => block.complete)).toEqual(complete);
  expect(blocks.map((block) => block.raw).join('')).toBe(value);
});

test('new registered types protect their bodies without modifying existing handlers', () => {
  const nested = '<seafile-ai-seadoc status="failed"></seafile-ai-seadoc>';
  const handler = jest.fn((block) => ({ type: 'text', value: block.content }));
  REPLY_BLOCK_HANDLERS.image = handler;
  try {
    const parts = buildReplyParts(`<image>${nested}<seafile-ai-markdown>body</seafile-ai-markdown></image>`);
    expect(handler).toHaveBeenCalledTimes(1);
    expect(parts).toEqual([{ type: 'text', value: `${nested}<seafile-ai-markdown>body</seafile-ai-markdown>` }]);
    buildReplyParts('<image />');
    expect(handler).toHaveBeenCalledTimes(2);
  } finally {
    delete REPLY_BLOCK_HANDLERS.image;
  }
});

test('code and Markdown artifact content are not rewritten or dispatched recursively', () => {
  const code = '`<seafile-ai-markdown file_name="code.md">example</seafile-ai-markdown>`';
  const body = '<seafile-ai-markdown file_name="inner.md">example</seafile-ai-markdown><seafile-ai-seadoc status="failed"></seafile-ai-seadoc>';
  const mdFiles = [];
  const parts = buildReplyParts(`${code}\n<seafile-ai-markdown file_name="outer.md">${body}</seafile-ai-markdown>`, { mdFiles });
  expect(parts).toHaveLength(1);
  expect(parts[0].value).toContain(code);
  expect(mdFiles).toHaveLength(1);
  expect(mdFiles[0].content).toBe(body);
});

test('incomplete protocol content stays hidden throughout streaming', () => {
  const tag = '<seafile-ai-seadoc status="failed"></seafile-ai-seadoc>';
  for (let length = '<seafile-ai-'.length; length <= tag.length; length++) {
    expect(buildReplyParts(`Before${tag.slice(0, length)}`, { isStreaming: true })).toEqual([{ type: 'text', value: 'Before' }]);
  }
});

test('fenced SDoc examples do not render cards, but following real results do', () => {
  const tag = '<seafile-ai-seadoc status="created" file_name="Plan.sdoc" path="/AI Generated/Plan.sdoc"></seafile-ai-seadoc>';
  for (const example of [
    '```js\nconst marker = "```";\n' + tag + '\n```\n',
    '````js\n```\n' + tag + '\n`````\n',
    '   ~~~~\n~~~~suffix\n' + tag + '\n  ~~~~~ \t\n',
    '``start `\n' + tag + '\n``` still code ``',
  ]) {
    expect(buildReplyParts(example).filter((part) => part.type === 'seadoc')).toEqual([]);
    expect(buildReplyParts(example + tag).filter((part) => part.type === 'seadoc')).toHaveLength(1);
  }
});
