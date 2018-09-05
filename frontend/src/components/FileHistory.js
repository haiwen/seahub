import React from 'react';
import { gettext as _, siteRoot, lang, getUrl } from '../globals';
import Moment from 'react-moment';
import filesize from 'filesize';
import PropTypes from 'prop-types';
import { compose } from 'recompose';

const PER_PAGE = 25;
const REPO_ID = window.app.pageOptions.repoID;
const FILE_PATH = window.app.pageOptions.filePath;

const applySetResult = (result) => (prevState) => ({
  data: result.data,
  page: result.page,
  isLoading: false,
  isError: false,
  hasMore: result.data && result.data.length === PER_PAGE,
});

const applyUpdateResult = (result) => (prevState) => ({
  data: [...prevState.data, ...result.data],
  page: result.page,
  isLoading: false,
  isError: false,
  hasMore: result.data && result.data.length === PER_PAGE,
});

const getFileHistoryUrl = (repo_id, path, page=1, per_page=PER_PAGE) => {
  return `${siteRoot}api/v2.1/repos/${repo_id}/file/new_history/?path=${encodeURIComponent(path)}&page=${page}&per_page=${per_page}`;
};

class FileHistory extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      data: [],
      page: null,
      isLoading: true,
      isError: false,
      hasMore: true,
    };
  }

  fetchData = (repo_id, path, page, per_page) => {
    this.setState({ isLoading: true });
    fetch(getFileHistoryUrl(repo_id, path, page, per_page),
      {credentials: 'same-origin'})
      .then(response => response.json())
      .then(result => this.onSetResult(result, page))
      .catch(error => this.onHandleErrors(error));
  }

  onSetResult = (result, page) => {
    if (result.error_msg) {
      throw new Error(result.error_msg);
    }
    
    return page === 1
      ? this.setState(applySetResult(result))
      : this.setState(applyUpdateResult(result));
  }

  onHandleErrors = (error) => {
    this.setState({
      isLoading: false,
      isError: true,
    });
    alert(error);               // TODO: better error message
    return;
  }

  componentDidMount() {
    this.fetchData(REPO_ID, FILE_PATH, 1, PER_PAGE);
  }

  onPaginatedGet = (e) =>
    this.fetchData(REPO_ID, FILE_PATH, this.state.page + 1, PER_PAGE)

  render() {
    return (
      <div>
        <Header />
        <BackNav />
        <Tip />

        <Breadcrumb
          repoID={REPO_ID}
          repoName={window.app.pageOptions.repoName}
          filePath={FILE_PATH} />

        <TableWithInfinite
          data={this.state.data}
          loadMore={this.onPaginatedGet}
          isLoading={this.state.isLoading}
          isError={this.state.isError}
          hasMore={this.state.hasMore}
          page={this.state.page}
          />

      </div>
    );
  }
}

// presentational components
const Header = () => (
  <h2><span className="op-target">{window.app.pageOptions.fileName}</span> Version History</h2>
);

const BackNav = () => (
  <a href="javascript:window.history.back()" className="go-back" title="Back">
    <span className="icon-chevron-left"></span>
  </a>
);

const Tip = () => (
  <p className="tip">Tip: a new version will be generated after each modification, and you can restore the file to a previous version.</p>
);

const TableRow = ({ item, idx, onMouseLeave=f=>f, onMouseEnter=f=>f, isHovered=false }) => (
  <tr onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}
    className={isHovered ? 'hl' : ''}>
    <td className="time"><span title={item.ctime}><Moment locale={lang} fromNow>{item.ctime}</Moment></span> {idx === 0 && '(current version)'}</td>
    <td><img src={item.creator_avatar_url} width="16" height="16" alt="" className="avatar" /> <a href={getUrl({name: 'user_profile', username: item.creator_email})} className="vam">{item.creator_name}</a></td>
    <td>{filesize(item.size, {base: 10})}</td>

    { isHovered ?
      <td>
        {idx !== 0 && <a href="#" className="op" target="_blank">Restore</a>}
        <a href={getUrl({name: 'download_historic_file', repoID: REPO_ID, objID: item.rev_file_id, filePath: FILE_PATH})} className="op" target="_blank">Download</a>
        <a href={getUrl({name: 'view_historic_file', repoID: REPO_ID, commitID: item.commit_id, objID: item.rev_file_id, filePath: FILE_PATH})} className="op" target="_blank">View</a>
        <a href={getUrl({name: 'diff_historic_file', repoID: REPO_ID, commitID: item.commit_id, filePath: FILE_PATH})} className="op" target="_blank">Diff</a>
      </td> :
      <td></td>
    }
  </tr>
);
TableRow.propTypes = {
  idx: PropTypes.number.isRequired,
  item: PropTypes.shape({
    ctime: PropTypes.string.isRequired,
    commit_id: PropTypes.string.isRequired,
    rev_file_id: PropTypes.string.isRequired,
    size: PropTypes.number.isRequired,
    creator_name: PropTypes.string.isRequired,
    creator_avatar_url: PropTypes.string.isRequired,
  })
};

const Table = ({ data }) => (
  <table className="commit-list">
    <thead>
      <tr>
        <th width="25%">Time</th>
        <th width="25%">Modifer</th>
        <th width="20%">Size</th>
        <th width="30%">Operation</th>
      </tr>
    </thead>

    <tbody>
      {data.map(
        (item, idx) => <TableRowWithHover key={item.commit_id} item={item} idx={idx} />
      )}
    </tbody>
  </table>
);
Table.propTypes = {
  data: PropTypes.array.isRequired
};

const Breadcrumb = ({ repoID, repoName, filePath }) => {
  let [, ...rest] = filePath.split('/');

  return (
    <div>
      <div className="commit-list-topbar ovhd">
        <p className="path fleft">Current Path:
          <a href={getUrl({name: 'common_lib', repoID: repoID, path: '/'})}>{repoName}</a>

          {
            rest.map((item, idx) => {
              let p = '/' + rest.slice(0, idx+1).join('/');
              let href = idx + 1 === rest.length ?
                getUrl({name: 'view_lib_file', repoID: repoID, filePath: p}) :
                getUrl({name: 'common_lib', repoID: repoID, path: p});

              return <span key={idx}> / <a href={href}>{item}</a></span>;
            })
          }
        </p>
      </div>
    </div>
  );
};
Breadcrumb.propTypes = {
  repoID: PropTypes.string.isRequired,
  repoName: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
};

const LoadingIndicator = () =>
  <div id="history-more-loading">
    <span className="loading-icon loading-tip"></span>
  </div>;

const InfiniteScrollErrorIndicator = ({ onClick=f=>f }) =>
  <div id="history-more" className="interactions">
    <button id="history-more-btn" onClick={onClick} className="full-width-btn">{_('Something went wrong. Try Again.')}</button>
  </div>;

// HoC
const withHover = (Component) => (
  class WithHover extends React.Component {
    constructor(props) {
      super(props);
      this.state = {
        isHovered: false
      };
    }

    onMouseEnter = () => {
      this.setState({ isHovered: true });
    }

    onMouseLeave = () => {
      this.setState({ isHovered: false });
    }    

    render() {
      return <Component {...this.state} {...this.props}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
      />;
    }
  }
);

const withInfiniteScroll = (Component) =>
  class WithInfiniteScroll extends React.Component {

  static propTypes = {
    isLoading: PropTypes.bool.isRequired,
    isError: PropTypes.bool.isRequired,
    hasMore: PropTypes.bool.isRequired,
    loadMore: PropTypes.func.isRequired,
    useCapture: PropTypes.bool,
    threshold: PropTypes.number,
  };

  static defaultProps = {
    isLoading: true,
    hasMore: true,
    isError: false,
    ref: null,
    threshold: 250,             // pixels
    useCapture: false,
  };
    
  constructor(props) {
    super(props);

    this.scrollListener = this.scrollListener.bind(this);
  }
    
  componentDidMount() {
    this.attachScrollListener();
  }

  componentDidUpdate() {
    this.attachScrollListener();
  }

  componentWillUnmount() {
    this.detachScrollListener();
    this.detachMousewheelListener();
  }

  detachMousewheelListener() {
    window.removeEventListener(
      'mousewheel',
      this.mousewheelListener,
      this.props.useCapture,
    );
  }

  detachScrollListener() {
    window.removeEventListener(
      'scroll',
      this.scrollListener,
      this.props.useCapture,
    );
    window.removeEventListener(
      'resize',
      this.scrollListener,
      this.props.useCapture,
    );
  }
    
  attachScrollListener() {
    window.addEventListener(
      'mousewheel',             // workaround for Chrome hangups
      this.mousewheelListener,
      this.props.useCapture,
    );
    window.addEventListener(
      'scroll',
      this.scrollListener,
      this.props.useCapture,
    );
    window.addEventListener(
      'resize',
      this.scrollListener,
      this.props.useCapture,
    );

    // initial load
    this.scrollListener();
  }

  mousewheelListener(e) {
    // Prevents Chrome hangups
    // See: https://stackoverflow.com/questions/47524205/random-high-content-download-time-in-chrome/47684257#47684257
    if (e.deltaY === 1) {
      e.preventDefault();
    }
  }

  scrollListener() {
    const scrollEl = window;

    const doc =
        document.documentElement || document.body.parentNode || document.body;
    const scrollTop =
        scrollEl.pageYOffset !== undefined
          ? scrollEl.pageYOffset
          : doc.scrollTop;

    const offset = (doc.offsetHeight - scrollTop - window.innerHeight);
    if (offset < Number(this.props.threshold)) {
      this.detachScrollListener();
      // Call loadMore after detachScrollListener to allow for non-async loadMore functions
      if (this.props.hasMore && !this.props.isLoading && !this.props.isError) {
        this.props.loadMore();
      }

    }
  }

  render() {
    return <div>
      <Component {...this.props} />

      { this.props.isLoading && <LoadingIndicator /> }

      { (!this.props.isLoading && this.props.isError) &&
        <InfiniteScrollErrorIndicator onClick={this.props.loadMore} />
      }
    </div>;
  }
  };


const TableWithInfinite = compose(
  withInfiniteScroll,
)(Table);

const TableRowWithHover = withHover(TableRow);

export default FileHistory;



