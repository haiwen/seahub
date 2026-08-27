import Search from './search';
import { seafileAPI } from '../../utils/seafile-api';

jest.mock('../../metadata', () => ({
  CollaboratorsProvider: ({ children }) => children,
}));

jest.mock('../../utils/seafile-api', () => ({
  seafileAPI: {
    getSource: jest.fn(),
    searchFiles: jest.fn(),
    searchFilesInPublishedRepo: jest.fn(),
  },
}));

jest.mock('../../utils/search-api', () => ({
  __esModule: true,
  default: {
    searchRepos: jest.fn(),
  },
}));

jest.mock('../../utils/utils', () => ({
  debounce: (callback) => {
    callback.cancel = jest.fn();
    return callback;
  },
  Utils: {
    getErrorMsg: jest.fn(),
    isMac: jest.fn(() => false),
    onKeyDown: jest.fn(),
  },
}));

jest.mock('../icon', () => () => null);
jest.mock('../loading', () => () => null);
jest.mock('../op-icon', () => () => null);
jest.mock('../toast', () => ({ danger: jest.fn() }));
jest.mock('../tooltip', () => () => null);
jest.mock('./details', () => () => null);
jest.mock('./search-filters', () => () => null);
jest.mock('./search-result-item', () => () => null);
jest.mock('./search-result-library', () => () => null);
jest.mock('./search-tags', () => () => null);

const createSearchResult = (repoID, path) => ({
  content_highlight: '',
  fullpath: path,
  is_dir: false,
  name: path.split('/').pop(),
  repo_id: repoID,
  repo_name: repoID,
});

const createSearch = () => {
  const search = new Search({
    onSearchedClick: jest.fn(),
    path: '/folder',
    repoID: 'current-repo',
  });

  search.setState = (update, callback) => {
    const nextState = typeof update === 'function' ? update(search.state, search.props) : update;
    search.state = { ...search.state, ...nextState };
    if (callback) callback();
  };

  return search;
};

const flushPromises = () => new Promise(resolve => setTimeout(resolve, 0));

describe('Search', () => {
  beforeEach(() => {
    seafileAPI.getSource.mockImplementation(() => ({
      cancel: jest.fn(),
      token: 'search-token',
    }));
    seafileAPI.searchFiles.mockReset();
  });

  it('keeps the original query snapshot and deduplicates expanded results', async () => {
    const initialResults = Array.from({ length: 20 }, (_, index) => createSearchResult('all-repo', `/initial-${index}.md`));
    const expandedResults = [
      createSearchResult('all-repo', '/duplicate.md'),
      createSearchResult('all-repo', '/duplicate.md'),
      createSearchResult('another-repo', '/duplicate.md'),
    ];
    seafileAPI.searchFiles
      .mockResolvedValueOnce({ data: { total: 20, results: initialResults, has_more: false } })
      .mockResolvedValueOnce({ data: { total: 3, results: expandedResults, has_more: false } });

    const search = createSearch();
    const queryData = {
      input_fexts: 'md,txt',
      q: ' node & docs ',
      search_filename_only: true,
      search_ftypes: 'custom',
      search_path: '/folder',
      search_repo: 'all',
    };

    search.getSearchResult(queryData);
    await flushPromises();

    expect(seafileAPI.searchFiles).toHaveBeenNthCalledWith(1, {
      ...queryData,
      q: 'node & docs',
      page: 1,
      per_page: 20,
    }, 'search-token');
    expect(search.state.hasMore).toBe(true);

    search.loadMore();
    await flushPromises();

    expect(seafileAPI.searchFiles).toHaveBeenNthCalledWith(2, {
      input_fexts: 'md,txt',
      q: 'node & docs',
      search_filename_only: true,
      search_ftypes: 'custom',
      search_path: '/folder',
      search_repo: 'all',
      page: 1,
      per_page: 100,
    }, 'search-token');
    expect(search.state.resultItems).toHaveLength(2);
    expect(search.state.resultItems.map(item => `${item.repo_id}:${item.path}`)).toEqual([
      'all-repo:/duplicate.md',
      'another-repo:/duplicate.md',
    ]);
  });
});
