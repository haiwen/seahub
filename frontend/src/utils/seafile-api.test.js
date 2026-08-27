import { seafileAPI } from './seafile-api';

jest.mock('axios', () => ({
  create: jest.fn(() => ({ get: jest.fn() })),
}));

describe('SeafileAPI searchFiles', () => {
  it('encodes spaces and special characters in the search query', () => {
    const get = jest.fn();
    const cancelToken = {};
    seafileAPI.server = '/seafile';
    seafileAPI.req = { get };

    seafileAPI.searchFiles({
      q: 'node & docs#1',
      search_repo: 'all',
    }, cancelToken);

    expect(get).toHaveBeenCalledWith(
      '/seafile/api2/search/?q=node%20%26%20docs%231&search_repo=all',
      { cancelToken }
    );
  });
});
