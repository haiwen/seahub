import AttachmentObject, { patchAttachmentById, serializeAttachmentsForServer } from './attachment_object';

const image = (overrides = {}) => new AttachmentObject({
  type: 'image',
  repo_id: 'repo-id',
  path: '/images/ai-chat/parrot.png',
  name: 'parrot.png',
  _id: 'image-1',
  status: 'done',
  ...overrides,
});

describe('patchAttachmentById', () => {
  it('applies the changes to the matching attachment and keeps its other fields', () => {
    const attachments = [image(), image({ _id: 'image-2', name: 'other.png' })];

    const updated = patchAttachmentById(attachments, 'image-1', {
      path: '/images/ai-chat/uploaded.png',
      name: 'uploaded.png',
    });

    expect(updated[0].path).toBe('/images/ai-chat/uploaded.png');
    expect(updated[0].name).toBe('uploaded.png');
    expect(updated[0]._id).toBe('image-1');
    expect(updated[0].repo_id).toBe('repo-id');
    expect(updated[0].status).toBe('done');
    expect(updated[1]).toBe(attachments[1]);
  });

  it('leaves the list unchanged for an unknown attachment id', () => {
    const attachments = [image()];

    const updated = patchAttachmentById(attachments, 'image-unknown', { status: 'done' });

    expect(updated[0]).toBe(attachments[0]);
  });
});

describe('serializeAttachmentsForServer', () => {
  it('sends only the persistent fields of a finished image', () => {
    const attachment = image({
      preview_path: 'blob:local-preview',
      image: { name: 'parrot.png' },
    });

    expect(serializeAttachmentsForServer([attachment])).toEqual([{
      type: 'image',
      repo_id: 'repo-id',
      path: '/images/ai-chat/parrot.png',
      name: 'parrot.png',
    }]);
  });

  it('drops the images that are still uploading or failed', () => {
    const attachments = [
      image({ _id: 'image-1', status: 'uploading' }),
      image({ _id: 'image-2', status: 'failed' }),
      image({ _id: 'image-3', status: 'done' }),
    ];

    expect(serializeAttachmentsForServer(attachments)).toHaveLength(1);
    expect(serializeAttachmentsForServer(attachments)[0].name).toBe('parrot.png');
  });

  it('keeps the document payload shape unchanged', () => {
    const document = { key: 'repo-id:/docs/plan.md', repo_id: 'repo-id', path: '/docs/plan.md', name: 'plan.md' };

    const [serialized] = serializeAttachmentsForServer([document]);

    expect(serialized.repo_id).toBe('repo-id');
    expect(serialized.path).toBe('/docs/plan.md');
    expect(serialized.name).toBe('plan.md');
    expect(serialized.content).toBe('');
  });

  it('treats an image restored from the chat history as finished', () => {
    const fromHistory = { type: 'image', repo_id: 'repo-id', path: '/images/ai-chat/old.png', name: 'old.png' };

    expect(serializeAttachmentsForServer([fromHistory])).toEqual([{
      type: 'image',
      repo_id: 'repo-id',
      path: '/images/ai-chat/old.png',
      name: 'old.png',
    }]);
  });
});
