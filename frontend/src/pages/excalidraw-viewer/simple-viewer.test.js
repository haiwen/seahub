jest.mock('@excalidraw/excalidraw', () => ({
  Excalidraw: () => null,
  MainMenu: () => null,
}));
jest.mock('@excalidraw/excalidraw/index.css', () => ({}), { virtual: true });
jest.mock('@/components/code-mirror-loading', () => () => null);
jest.mock('../excalidraw-editor/utils/element-utils', () => ({}));
jest.mock('../excalidraw-editor/utils/exdraw-utils', () => ({}));

describe('shared whiteboard image URLs', () => {
  let getImageUrl;

  beforeAll(() => {
    window.app = { config: { serviceURL: 'https://seafile.example' } };
    window.shared = { pageOptions: {} };
    ({ getImageUrl } = require('./simple-viewer'));
  });

  beforeEach(() => {
    window.app.config.serviceURL = 'https://seafile.example';
    window.shared.pageOptions = { docUuid: 'board-a', exdrawAccessToken: 'token-a' };
  });

  test('includes the whiteboard token without requiring a share-link token', () => {
    const url = new URL(getImageUrl('image.png'));

    expect(url.pathname).toBe('/api/v2.1/exdraw/download-image/board-a/image.png');
    expect(url.searchParams.get('access_token')).toBe('token-a');
  });

  test('keeps separate tokens for multiple embedded whiteboards', () => {
    const firstUrl = new URL(getImageUrl('first.png'));
    window.shared.pageOptions = { docUuid: 'board-b', exdrawAccessToken: 'token-b' };
    const secondUrl = new URL(getImageUrl('second.png'));

    expect(firstUrl.pathname).toContain('/board-a/');
    expect(firstUrl.searchParams.get('access_token')).toBe('token-a');
    expect(secondUrl.pathname).toContain('/board-b/');
    expect(secondUrl.searchParams.get('access_token')).toBe('token-b');
  });

  test('encodes the access token as a single query parameter', () => {
    window.shared.pageOptions.exdrawAccessToken = 'token+with/&=?characters';

    const url = new URL(getImageUrl('image.png'));

    expect(Array.from(url.searchParams)).toEqual([
      ['access_token', 'token+with/&=?characters'],
    ]);
  });

  test('preserves the deployment subpath', () => {
    window.app.config.serviceURL = 'https://seafile.example/seafile';

    expect(new URL(getImageUrl('image.png')).pathname).toBe(
      '/seafile/api/v2.1/exdraw/download-image/board-a/image.png'
    );
  });

  test('preserves the original image URL when no token is provided', () => {
    delete window.shared.pageOptions.exdrawAccessToken;

    expect(getImageUrl('image.png')).toBe(
      'https://seafile.example/api/v2.1/exdraw/download-image/board-a/image.png'
    );
  });
});
