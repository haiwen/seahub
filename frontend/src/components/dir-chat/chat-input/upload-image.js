import { seafileAPI } from '@/api/seafile-api';

export const AI_CHAT_IMAGE_DIR = '/images/ai-chat';
export const AI_CHAT_IMAGE_RELATIVE_DIR = 'images/ai-chat';
export const AI_CHAT_IMAGE_EXTENSIONS = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'avif'];
export const AI_CHAT_IMAGE_ACCEPT = AI_CHAT_IMAGE_EXTENSIONS.map((extension) => `.${extension}`).join(',');
// Aligned with the AI OCR limit in seahub/ai/apis.py, which rejects files above 5 MB.
export const AI_CHAT_IMAGE_MAX_SIZE = 5 * 1024 * 1024;

// The AI server (seafile_ai/chat_manager/utils/__init__.py) only recognizes an
// attachment as an image by its file suffix, so a usable extension is required.
const MIME_TYPE_EXTENSIONS = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/bmp': 'bmp',
  'image/avif': 'avif',
};

const MAX_BASE_NAME_LENGTH = 120;

export const getImageExtension = (fileName = '') => {
  const index = fileName.lastIndexOf('.');
  return index > 0 ? fileName.slice(index + 1).toLowerCase() : '';
};

// Pasted or dropped images may arrive without a usable file name, so fall back
// to the MIME type reported by the browser.
export const resolveImageExtension = (file) => {
  const extension = getImageExtension(file.name);
  if (AI_CHAT_IMAGE_EXTENSIONS.includes(extension)) {
    return extension;
  }
  return MIME_TYPE_EXTENSIONS[file.type] || '';
};

export const isSupportedImage = (file) => {
  return Boolean(file) && Boolean(resolveImageExtension(file));
};

export const isWithinSizeLimit = (file) => {
  return Boolean(file) && file.size <= AI_CHAT_IMAGE_MAX_SIZE;
};

export const buildTimestampedImageName = (fileName, timestamp = Date.now(), extension = getImageExtension(fileName)) => {
  const suffix = `.${extension}`;
  const hasSuffix = Boolean(extension) && fileName.toLowerCase().endsWith(suffix);
  const baseName = hasSuffix ? fileName.slice(0, fileName.length - suffix.length) : fileName;
  const safeBaseName = (baseName || 'image').replace(/[/\\]/g, '_').trim().slice(0, MAX_BASE_NAME_LENGTH) || 'image';
  return `${safeBaseName}-${timestamp}.${extension}`;
};

export const genImageAttachmentId = () => {
  return `image-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
};

// Uploads to <library root>/images/ai-chat; the file server creates the folders
// for `relative_path`, so no explicit mkdir is needed.
export const uploadImageToAiChatDir = ({ repoID, file }) => {
  const extension = resolveImageExtension(file);
  const name = buildTimestampedImageName(file.name, Date.now(), extension);
  const formData = new FormData();
  formData.append('parent_dir', '/');
  formData.append('relative_path', AI_CHAT_IMAGE_RELATIVE_DIR);
  formData.append('file', new File([file], name, { type: file.type }));

  return seafileAPI.getFileServerUploadLink(repoID, '/').then((res) => {
    return seafileAPI.uploadImage(`${res.data}?ret-json=1`, formData);
  }).then((res) => {
    const uploadedName = Array.isArray(res.data) && res.data[0] ? res.data[0].name : name;
    return { name: uploadedName, path: `${AI_CHAT_IMAGE_DIR}/${uploadedName}` };
  });
};
