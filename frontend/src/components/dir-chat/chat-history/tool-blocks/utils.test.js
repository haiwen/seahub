import { isSafeDocumentPath, transformToolBlocks } from './utils';

const tag = '<seadoc status="created" name="计划.sdoc" path="/AI Generated/计划.sdoc" doc_uuid="doc-id" />';

describe('tool message blocks', () => {
  it('preserves text and the order of multiple blocks', () => {
    const result = transformToolBlocks(`Before\n\n${tag}\n\nMiddle\n\n${tag}\n\nAfter`);
    expect(result.blocks).toHaveLength(2);
    expect(result.value).toBe('Before\n\n[tool result](file:///seafile-ai-tool/0)\n\nMiddle\n\n[tool result](file:///seafile-ai-tool/1)\n\nAfter');
    expect(result.blocks[0].data.path).toBe('/AI Generated/计划.sdoc');
  });

  it('decodes escaped attribute values without interpreting HTML', () => {
    const result = transformToolBlocks('<seadoc description="&lt;img src=x onerror=alert(1)&gt;" path="/AI Generated/A.sdoc" name=\'A &amp; &quot;B&quot;.sdoc\' status="created" />');
    expect(result.blocks[0].data.name).toBe('A & "B".sdoc');
    expect(result.blocks[0].data.description).toBe('<img src=x onerror=alert(1)>');
  });

  it.each([
    `\`\`\`html\n${tag}\n\`\`\``,
    `~~~html\n${tag}\n~~~`,
    `\`${tag}\``,
    `    ${tag}`,
    `\`\`\`html\n${tag}`,
  ])('does not interpret tags inside code: %s', (value) => {
    expect(transformToolBlocks(value)).toEqual({ value, blocks: [] });
  });

  it('handles failures and unconfirmed creation', () => {
    expect(transformToolBlocks('<seadoc status="unknown" error_code="creation_unconfirmed" />').blocks[0].data.status).toBe('unknown');
    expect(transformToolBlocks('<seadoc status="failed" error_code="permission_denied" />').blocks[0].data.error_code).toBe('permission_denied');
  });

  it.each([
    '<seadoc status="created" />',
    '<seadoc status="created" name="A.sdoc" path="/../A.sdoc" />',
    '<seadoc status="created" name="A.sdoc" path="javascript:alert(1)" />',
    '<seadoc status="failed" onclick="alert(1)" />',
    '<seadoc status="failed" status="created" />',
  ])('rejects invalid metadata: %s', (value) => {
    expect(transformToolBlocks(value).blocks[0].data).toEqual({ status: 'failed', error_code: 'invalid_artifact' });
  });

  it('hides an incomplete streaming tag and shows it once complete', () => {
    expect(transformToolBlocks('Before\n<seadoc status="created"', true)).toEqual({ value: 'Before\n', blocks: [] });
    expect(transformToolBlocks(tag, true).blocks).toHaveLength(1);
    expect(transformToolBlocks('<seadoc status="created"').blocks[0].data.error_code).toBe('invalid_artifact');
  });

  it('does not expose attributes at any chunk boundary', () => {
    for (let length = '<seadoc'.length; length < tag.length; length++) {
      expect(transformToolBlocks(tag.slice(0, length), true)).toEqual({ value: '', blocks: [] });
    }
  });

  it('leaves unknown tags alone', () => {
    const value = '<other-tool id="1" />';
    expect(transformToolBlocks(value)).toEqual({ value, blocks: [] });
  });

  it('rejects unsafe document paths', () => {
    expect(isSafeDocumentPath('/AI Generated/A.sdoc')).toBe(true);
    expect(isSafeDocumentPath('/AI Generated/../A.sdoc')).toBe(false);
    expect(isSafeDocumentPath('/AI Generated/A\\B.sdoc')).toBe(false);
    expect(isSafeDocumentPath('/AI Generated/A.md')).toBe(false);
  });
});
