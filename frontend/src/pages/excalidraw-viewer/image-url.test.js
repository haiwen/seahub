import { resolveImageUrl } from './image-url';

const serviceURL = 'https://seafile.example.com/seahub';
const options = { docUuid: 'board-uuid', repoID: 'repo-id', sharedToken: '' };
const rawURL = `${serviceURL}/lib/repo-id/file/images/photo%20%26%201.png?raw=1`;
const element = { fileId: 'image-file', dataURL: rawURL };

describe('whiteboard preview image URLs', () => {
  it('keeps the library raw URL for a logged-in internal sdoc preview', () => {
    expect(resolveImageUrl(element, options, serviceURL)).toBe(rawURL);
  });

  it('uses the existing download API for uploaded attachments', () => {
    expect(resolveImageUrl({ filename: 'photo 1.png' }, options, serviceURL)).toBe(
      `${serviceURL}/api/v2.1/exdraw/download-image/board-uuid/photo%201.png`);
  });

  it('only rewrites library images when a real whiteboard share token exists', () => {
    const result = new URL(resolveImageUrl(element, { ...options, sharedToken: 'share-token' }, serviceURL));
    expect(result.pathname).toBe('/seahub/view-image-via-share-link/');
    expect(result.searchParams.get('token')).toBe('share-token');
    expect(result.searchParams.get('path')).toBe('/images/photo & 1.png');
  });

  it('does not wrap another origin or library in the share image endpoint', () => {
    for (const dataURL of [rawURL.replace('seafile.example.com', 'external.test'), rawURL.replace('repo-id', 'other-repo')]) {
      expect(resolveImageUrl({ ...element, dataURL }, { ...options, sharedToken: 'share-token' }, serviceURL)).toBe(dataURL);
    }
  });

  it('uses the sdoc share gateway mapping without exposing the raw URL', () => {
    expect(resolveImageUrl(element, options, serviceURL, { 'image-file': { url: '/gateway/images/?path=photo' } })).toBe('/gateway/images/?path=photo');
    expect(resolveImageUrl(element, options, serviceURL, {})).toBeUndefined();
  });
});
