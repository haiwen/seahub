import { seafileAPI } from '@/api/seafile-api';
import {
  AI_CHAT_IMAGE_ACCEPT,
  AI_CHAT_IMAGE_MAX_SIZE,
  buildTimestampedImageName,
  genImageAttachmentId,
  getImageExtension,
  isSupportedImage,
  isWithinSizeLimit,
  resolveImageExtension,
  uploadImageToAiChatDir,
} from './upload-image';

jest.mock('@/api/seafile-api', () => ({
  seafileAPI: {
    getFileServerUploadLink: jest.fn(),
    uploadImage: jest.fn(),
  },
}));

describe('getImageExtension', () => {
  it('returns the lowercased extension', () => {
    expect(getImageExtension('Photo.PNG')).toBe('png');
  });

  it('returns an empty string when there is no extension', () => {
    expect(getImageExtension('photo')).toBe('');
    expect(getImageExtension('.gitignore')).toBe('');
  });
});

describe('resolveImageExtension', () => {
  it('prefers the file name extension', () => {
    expect(resolveImageExtension({ name: 'a.jpg', type: 'image/jpeg' })).toBe('jpg');
  });

  it('falls back to the MIME type when the file name has no usable extension', () => {
    expect(resolveImageExtension({ name: 'blob', type: 'image/png' })).toBe('png');
    expect(resolveImageExtension({ name: '', type: 'image/webp' })).toBe('webp');
  });

  it('rejects MIME types that are not in the supported list', () => {
    expect(resolveImageExtension({ name: 'a.svg', type: 'image/svg+xml' })).toBe('');
  });
});

describe('isSupportedImage', () => {
  it('accepts the image extensions used by the chat file search', () => {
    expect(isSupportedImage({ name: 'a.png' })).toBe(true);
    expect(isSupportedImage({ name: 'a.jpeg' })).toBe(true);
    expect(isSupportedImage({ name: 'a.webp' })).toBe(true);
  });

  it('accepts a pasted image that only carries a MIME type', () => {
    expect(isSupportedImage({ name: 'blob', type: 'image/png' })).toBe(true);
  });

  it('rejects non-image and extensionless files', () => {
    expect(isSupportedImage({ name: 'a.svg' })).toBe(false);
    expect(isSupportedImage({ name: 'a.pdf' })).toBe(false);
    expect(isSupportedImage({ name: 'photo' })).toBe(false);
    expect(isSupportedImage(null)).toBe(false);
  });
});

describe('isWithinSizeLimit', () => {
  it('accepts files up to the limit and rejects anything above it', () => {
    expect(isWithinSizeLimit({ name: 'a.png', size: AI_CHAT_IMAGE_MAX_SIZE })).toBe(true);
    expect(isWithinSizeLimit({ name: 'a.png', size: AI_CHAT_IMAGE_MAX_SIZE + 1 })).toBe(false);
  });
});

describe('buildTimestampedImageName', () => {
  it('keeps the extension and appends the timestamp', () => {
    expect(buildTimestampedImageName('架构图.png', 1758700000000)).toBe('架构图-1758700000000.png');
  });

  it('strips path separators from the base name', () => {
    expect(buildTimestampedImageName('a/b\\c.jpg', 1)).toBe('a_b_c-1.jpg');
  });

  it('falls back to a default base name when the base name is blank', () => {
    expect(buildTimestampedImageName(' .png', 1)).toBe('image-1.png');
  });

  it('uses an explicit extension without mangling a name that lacks it', () => {
    expect(buildTimestampedImageName('blob', 1, 'png')).toBe('blob-1.png');
    expect(buildTimestampedImageName('image', 1, 'png')).toBe('image-1.png');
  });
});

describe('genImageAttachmentId', () => {
  it('returns a unique id per call', () => {
    expect(genImageAttachmentId()).not.toBe(genImageAttachmentId());
  });
});

describe('AI_CHAT_IMAGE_ACCEPT', () => {
  it('lists the supported extensions for the file picker', () => {
    expect(AI_CHAT_IMAGE_ACCEPT).toBe('.png,.jpg,.jpeg,.gif,.webp,.bmp,.avif');
  });
});

describe('uploadImageToAiChatDir', () => {
  const repoID = 'repo-id';

  beforeEach(() => {
    seafileAPI.getFileServerUploadLink.mockReset();
    seafileAPI.uploadImage.mockReset();
  });

  it('uploads to images/ai-chat under the library root and returns the attachment location', async () => {
    seafileAPI.getFileServerUploadLink.mockResolvedValue({ data: 'http://fileserver/upload' });
    seafileAPI.uploadImage.mockResolvedValue({ data: [{ name: 'photo-1758700000000.png' }] });

    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    const result = await uploadImageToAiChatDir({ repoID, file });

    expect(seafileAPI.getFileServerUploadLink).toHaveBeenCalledWith(repoID, '/');

    const [uploadLink, formData] = seafileAPI.uploadImage.mock.calls[0];
    expect(uploadLink).toBe('http://fileserver/upload?ret-json=1');
    expect(formData.get('parent_dir')).toBe('/');
    expect(formData.get('relative_path')).toBe('images/ai-chat');
    expect(formData.get('file').name).toMatch(/^photo-\d+\.png$/);

    expect(result).toEqual({ name: 'photo-1758700000000.png', path: '/images/ai-chat/photo-1758700000000.png' });
  });

  it('falls back to the generated name when the upload response has no file entry', async () => {
    seafileAPI.getFileServerUploadLink.mockResolvedValue({ data: 'http://fileserver/upload' });
    seafileAPI.uploadImage.mockResolvedValue({ data: [] });

    const file = new File(['content'], 'photo.png', { type: 'image/png' });
    const result = await uploadImageToAiChatDir({ repoID, file });

    expect(result.path).toMatch(/^\/images\/ai-chat\/photo-\d+\.png$/);
  });
});
