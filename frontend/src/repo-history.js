import React from 'react';
import ReactDOM from 'react-dom';
import { navigate } from '@reach/router';
import moment from 'moment';
import { Utils } from './utils/utils';
import { gettext, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './utils/constants';
import { seafileAPI } from './utils/seafile-api';
import Loading from './components/loading';
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
      page: 1,
      perPage: 100,
      items: [],
      more: false
    };
  }

  componentDidMount() {
    this.getItems(this.state.page);
  }

  getItems = (page) => {
    seafileAPI.getRepoHistory(repoID, page, this.state.perPage).then((res) => {
      this.setState({
        isLoading: false,
        page: page,
        items: res.data.data,
        more: res.data.more
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            isLoading: false,
            errorMsg: gettext('Permission denied')
          }); 
        } else {
          this.setState({
            isLoading: false,
            errorMsg: gettext('Error')
          }); 
        }   
      } else {
        this.setState({
          isLoading: false,
          errorMsg: gettext('Please check the network.')
        }); 
      }   
    });
  }

  getPrevious = () => {
    this.getItems(this.state.page - 1);
  }

  getNext = () => {
    this.getItems(this.state.page + 1);
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
                <h2 dangerouslySetInnerHTML={{__html: Utils.generateDialogTitle(gettext('{placeholder} Modification History'), repoName)}}></h2>
                <a href="#" className="go-back" title={gettext('Back')} onClick={this.goBack}>
                  <span className="fas fa-chevron-left"></span>
                </a>
                {userPerm == 'rw' && <p className="tip">{gettext('Tip: a snapshot will be generated after modification, which records the library state after the modification.')}</p>}
                <Content 
                  data={this.state}
                  getPrevious={this.getPrevious}
                  getNext={this.getNext}
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

  getPrevious = (e) => {
    e.preventDefault();
    this.props.getPrevious();
  }

  getNext = (e) => {
    e.preventDefault();
    this.props.getNext();
  }

  render() {
    const { isLoading, errorMsg, page, items, more } = this.props.data;

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
              item.isFirstCommit = (page == 1) && (index == 0);
              item.showDetails = more || (index != items.length - 1);
              return <Item key={index} item={item} />;
            })}
          </tbody>
        </table>
        <div className="text-center mt-6">
          {page != 1 &&
          <a href="#" onClick={this.getPrevious} className="m-2">{gettext('Previous')}</a>
          }
          {more && 
          <a href="#" onClick={this.getNext} className="m-2">{gettext('Next')}</a>
          }
        </div>
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

  editLabel = () => {
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
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td>
            {item.description}
            {item.showDetails &&
            <a href="#" className="details" onClick={this.showCommitDetails}>{gettext('Details')}</a>
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
            <span className={`attr-action-icon fa fa-pencil-alt ${isIconShown ? '': 'invisible'}`} title={gettext('Edit')} onClick={this.editLabel}></span>
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

ReactDOM.render(
  <RepoHistory />,
  document.getElementById('wrapper')
);
