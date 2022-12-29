import React from 'react';
import ReactDom from 'react-dom';
import { navigate } from '@gatsbyjs/reach-router';
import moment from 'moment';
import { Utils } from './utils/utils';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
import Paginator from './components/paginator';
import ModalPortal from './components/modal-portal';
import CommonToolbar from './components/toolbar/common-toolbar';
import CommitDetails from './components/dialog/commit-details';
import UpdateRepoCommitLabels from './components/dialog/edit-repo-commit-labels';

import './css/toolbar.css';
import './css/search.css';

import './css/repo-history.css';

const {
  repoID,
  repoName,
  userPerm,
  showLabel
} = window.app.pageOptions;

class RepoHistory extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isLoading: true,
      errorMsg: '',
      currentPage: 1,
      perPage: 25,
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
    seafileAPI.getRepoHistory(repoID, page, this.state.perPage).then((res) => {
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
  }

  resetPerPage = (perPage) => {
    this.setState({
      perPage: perPage
    }, () => {
      this.getItems(1);
    });
  }

  onSearchedClick = (selectedItem) => {
    if (selectedItem.is_dir === true) {
      let url = siteRoot + 'library/' + selectedItem.repo_id + '/' + selectedItem.repo_name + selectedItem.path;
      navigate(url, {repalce: true});
    } else {
      let url = siteRoot + 'lib/' + selectedItem.repo_id + '/file' + Utils.encodePath(selectedItem.path);
      let newWindow = window.open('about:blank');
      newWindow.location.href = url;
    }
  }

  goBack = (e) => {
    e.preventDefault();
    window.history.back();
  }

  render() {
    return (
      <React.Fragment>
        <div className="h-100 d-flex flex-column">
          <div className="top-header d-flex justify-content-between">
            <a href={siteRoot}>
              <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
            </a>
            <CommonToolbar onSearchedClick={this.onSearchedClick} />
          </div>
          <div className="flex-auto container-fluid pt-4 pb-6 o-auto">
            <div className="row">
              <div className="col-md-10 offset-md-1">
                <h2>{Utils.generateDialogTitle(gettext('{placeholder} Modification History'), repoName)}</h2>
                <a href="#" className="go-back" title={gettext('Back')} onClick={this.goBack} role="button" aria-label={gettext('Back')}>
                  <span className="fas fa-chevron-left"></span>
                </a>
                {userPerm == 'rw' && <p className="tip">{gettext('Tip: a snapshot will be generated after modification, which records the library state after the modification.')}</p>}
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
    this.theadData = showLabel ? [
      {width: '43%', text: gettext('Description')},
      {width: '12%', text: gettext('Time')},
      {width: '9%', text: gettext('Modifier')},
      {width: '12%', text: `${gettext('Device')} / ${gettext('Version')}`},
      {width: '12%', text: gettext('Labels')},
      {width: '12%', text: ''}
    ] : [
      {width: '43%', text: gettext('Description')},
      {width: '15%', text: gettext('Time')},
      {width: '15%', text: gettext('Modifier')},
      {width: '15%', text: `${gettext('Device')} / ${gettext('Version')}`},
      {width: '12%', text: ''}
    ];
  }

  getPreviousPage = () => {
    this.props.getListByPage(this.props.currentPage - 1);
  }

  getNextPage = () => {
    this.props.getListByPage(this.props.currentPage + 1);
  }

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
              item.showDetails = hasNextPage || (index != items.length - 1);
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

class Item extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      labels: this.props.item.tags,
      isIconShown: false,
      isCommitLabelUpdateDialogOpen: false,
      isCommitDetailsDialogOpen: false
    };
  }

  handleMouseOver = () => {
    this.setState({isIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isIconShown: false});
  }

  showCommitDetails = (e) => {
    e.preventDefault();
    this.setState({
      isCommitDetailsDialogOpen: !this.state.isCommitDetailsDialogOpen
    });
  }

  toggleCommitDetailsDialog = () => {
    this.setState({
      isCommitDetailsDialogOpen: !this.state.isCommitDetailsDialogOpen
    });
  }

  editLabel = (e) => {
    e.preventDefault();
    this.setState({
      isCommitLabelUpdateDialogOpen: !this.state.isCommitLabelUpdateDialogOpen
    });
  }

  toggleLabelEditDialog = () => {
    this.setState({
      isCommitLabelUpdateDialogOpen: !this.state.isCommitLabelUpdateDialogOpen
    });
  }

  updateLabels = (labels) => {
    this.setState({
      labels: labels
    });
  }

  render() {
    const item = this.props.item;
    const { isIconShown, isCommitLabelUpdateDialogOpen, isCommitDetailsDialogOpen, labels } = this.state;

    let name = '';
    if (item.email) {
      if (!item.second_parent_id) {
        name = <a href={`${siteRoot}profile/${encodeURIComponent(item.email)}/`}>{item.name}</a>;
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
            {item.showDetails &&
            <a href="#" className="details" onClick={this.showCommitDetails} role="button">{gettext('Details')}</a>
            }
          </td>
          <td title={moment(item.time).format('LLLL')}>{moment(item.time).format('YYYY-MM-DD')}</td>
          <td>{name}</td>
          <td>
            {item.client_version ? `${item.device_name} / ${item.client_version}` : 'API / --'}
          </td>
          {showLabel &&
          <td>
            {labels.map((item, index) => {
              return <span key={index} className="commit-label">{item}</span>;
            })}
            {userPerm == 'rw' &&
            <a href="#" role="button" className={`attr-action-icon fa fa-pencil-alt ${isIconShown ? '': 'invisible'}`} title={gettext('Edit')} aria-label={gettext('Edit')} onClick={this.editLabel}></a>
            }
          </td>
          }
          <td>
            {userPerm == 'rw' && (
              item.isFirstCommit ?
                <span className={isIconShown ? '': 'invisible'}>{gettext('Current Version')}</span> :
                <a href={`${siteRoot}repo/${repoID}/snapshot/?commit_id=${item.commit_id}`} className={isIconShown ? '': 'invisible'}>{gettext('View Snapshot')}</a>
            )}
          </td>
        </tr>
        {isCommitDetailsDialogOpen &&
          <ModalPortal>
            <CommitDetails
              repoID={repoID}
              commitID={item.commit_id}
              commitTime={item.time}
              toggleDialog={this.toggleCommitDetailsDialog}
            />
          </ModalPortal>
        }
        {isCommitLabelUpdateDialogOpen &&
          <ModalPortal>
            <UpdateRepoCommitLabels
              repoID={repoID}
              commitID={item.commit_id}
              commitLabels={labels}
              updateCommitLabels={this.updateLabels}
              toggleDialog={this.toggleLabelEditDialog}
            />
          </ModalPortal>
        }
      </React.Fragment>
    );
  }
}

ReactDom.render(<RepoHistory />, document.getElementById('wrapper'));
