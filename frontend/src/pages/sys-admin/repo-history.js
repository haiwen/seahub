import React from 'react';
import { createRoot } from 'react-dom/client';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from '../../utils/constants';
import { systemAdminAPI } from '../../utils/system-admin-api';
import Loading from '../../components/loading';
import Paginator from '../../components/paginator';
import { formatWithTimezone } from '../../utils/time';
import Icon from '../../components/icon';
import CommonToolbar from '../../components/toolbar/common-toolbar';

import '../../css/repo-history.css';

const {
  repoID,
  repoName,
} = window.app.pageOptions;

class RepoHistory extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      currentPage: 1,
      perPage: 100,
      hasNextPage: false,
      items: []
    };
  }

  componentDidMount() {
    let urlParams = (new URL(window.location)).searchParams;
    const {
      currentPage, perPage
    } = this.state;
    this.setState({
      perPage: parseInt(urlParams.get('per_page') || perPage),
      currentPage: parseInt(urlParams.get('page') || currentPage)
    }, () => {
      this.getItems(this.state.currentPage);
    });
  }

  getItems = (page) => {
    systemAdminAPI.sysAdminGetRepoHistory(repoID, page, this.state.perPage).then((res) => {
      this.setState({
        isLoading: false,
        currentPage: page,
        items: res.data.data,
        hasNextPage: res.data.more
      });
    }).catch((error) => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getItems(1);
    });
  };

  goBack = (e) => {
    e.preventDefault();
    window.history.back();
  };

  render() {
    let title = gettext('{placeholder} Modification History');
    title = title.replace('{placeholder}', '<span class="op-target text-truncate mx-1">' + Utils.HTMLescape(repoName) + '</span>');

    return (
      <React.Fragment>
        <div className="h-100 d-flex flex-column">
          <div className="top-header d-flex justify-content-between">
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
            <CommonToolbar isShowSearch={false} isShowNotice={false} />
          </div>
          <div className="flex-auto container-fluid pt-4 pb-6 o-auto">
            <div className="row">
              <div className="col-md-10 offset-md-1">
                <h2 dangerouslySetInnerHTML={{ __html: title }} className="d-flex text-nowrap"></h2>
                <a href="#" className="go-back" title={gettext('Back')} onClick={this.goBack} role="button" aria-label={gettext('Back')}>
                  <Icon symbol="down" className="rotate-90" />
                </a>
                {<p className="tip">{gettext('Tip: a snapshot will be generated after modification, which records the library state after the modification.')}</p>}
                <Content
                  isLoading={this.state.isLoading}
                  errorMsg={this.state.errorMsg}
                  items={this.state.items}
                  currentPage={this.state.currentPage}
                  hasNextPage={this.state.hasNextPage}
                  curPerPage={this.state.perPage}
                  resetPerPage={this.resetPerPage}
                  getListByPage={this.getItems}
                />
              </div>
            </div>
          </div>
        </div>
      </React.Fragment>
    );
  }
}

class Content extends React.Component {

  constructor(props) {
    super(props);
    this.theadData = [
      { width: '43%', text: gettext('Description') },
      { width: '15%', text: gettext('Time') },
      { width: '15%', text: gettext('Modifier') },
      { width: '15%', text: `${gettext('Device')} / ${gettext('Version')}` },
      { width: '12%', text: '' }
    ];
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  };

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  };

  render() {
    const {
      isLoading, errorMsg, items,
      curPerPage, currentPage, hasNextPage
    } = this.props;

    if (isLoading) {
      return <Loading />;
    }

    if (errorMsg) {
      return <p className="error mt-6 text-center">{errorMsg}</p>;
    }

    return (
      <React.Fragment>
        <table className="table-hover">
          <thead>
            <tr>
              {this.theadData.map((item, index) => {
                return <th key={index} width={item.width}>{item.text}</th>;
              })}
            </tr>
          </thead>
          <tbody>
            {items.map((item, index) => {
              item.isFirstCommit = (currentPage == 1) && (index == 0);
              return <Item key={index} item={item} />;
            })}
          </tbody>
        </table>
        <Paginator
          gotoPreviousPage={this.getPreviousPage}
          gotoNextPage={this.getNextPage}
          currentPage={currentPage}
          hasNextPage={hasNextPage}
          curPerPage={curPerPage}
          resetPerPage={this.props.resetPerPage}
        />
      </React.Fragment>
    );
  }
}

Content.propTypes = {
  isLoading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  currentPage: PropTypes.number.isRequired,
  hasNextPage: PropTypes.bool.isRequired,
  curPerPage: PropTypes.number.isRequired,
  resetPerPage: PropTypes.func.isRequired,
  getListByPage: PropTypes.func.isRequired,
};

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isIconShown: false,
    };
  }

  handleMouseOver = () => {
    this.setState({ isIconShown: true });
  };

  handleMouseOut = () => {
    this.setState({ isIconShown: false });
  };

  render() {
    const item = this.props.item;
    const { isIconShown } = this.state;

    let name = '';
    if (item.email) {
      if (!item.second_parent_id) {
        name = <a href={`${siteRoot}sys/users/${encodeURIComponent(item.email)}/`}>{item.name}</a>;
      } else {
        name = gettext('None');
      }
    } else {
      name = gettext('Unknown');
    }

    return (
      <React.Fragment>
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut} onFocus={this.handleMouseOver}>
          <td>
            {item.description}
          </td>
          <td title={formatWithTimezone(item.time)}>{dayjs(item.time).format('YYYY-MM-DD')}</td>
          <td>{name}</td>
          <td>
            {item.client_version ? `${item.device_name} / ${item.client_version}` : 'API / --'}
          </td>
          <td>
            {item.isFirstCommit ?
              <span className={isIconShown ? '' : 'invisible'}>{gettext('Current Version')}</span> :
              <a href={`${siteRoot}sys/libraries/${repoID}/history/snapshot/?commit_id=${item.commit_id}`} className={isIconShown ? '' : 'invisible'}>{gettext('View Snapshot')}</a>
            }
          </td>
        </tr>
      </React.Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
};

const root = createRoot(document.getElementById('wrapper'));
root.render(<RepoHistory />);
