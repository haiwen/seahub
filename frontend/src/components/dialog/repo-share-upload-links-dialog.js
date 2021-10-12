import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody, NavLink } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { siteRoot, gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import Loading from '../loading';
import EmptyTip from '../empty-tip';

const repoShareUploadLinkItemPropTypes = {
  item: PropTypes.object.isRequired,
  activeTab: PropTypes.string.isRequired,
  deleteItem: PropTypes.func.isRequired
};

class RepoShareUploadLinkItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false
    };
  }

  onMouseEnter = () => {
    this.setState({isOperationShow: true});
  };

  onMouseLeave = () => {
    this.setState({isOperationShow: false});
  };

  onDeleteLink = (e) => {
    e.preventDefault();
    this.props.deleteItem(this.props.item.token);
  };

  render() {

    let objUrl;
    let item = this.props.item;
    let path = item.path === '/' ? '/' : item.path.slice(0, item.path.length - 1);

    if (this.props.activeTab === 'shareLinks') {
      if (item.is_dir) {
        objUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}${Utils.encodePath(path)}`;
      } else {
        objUrl = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
      }
    }

    if (this.props.activeTab === 'uploadLinks') {
      objUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}${Utils.encodePath(path)}`;
    }

    return (
      <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter}>
        <td className="name">{item.creator_name}</td>
        <td>
          <a href={objUrl} target="_blank" className="text-inherit" rel="noreferrer">{item.obj_name}</a>
        </td>
        <td>
          <a href={item.link} target="_blank" className="text-inherit" rel="noreferrer">{item.link}</a>
        </td>
        <td>
          <span
            tabIndex="0"
            role="button"
            className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'invisible'}`}
            onClick={this.onDeleteLink}
            onKeyDown={Utils.onKeyDown}
            title={gettext('Delete')}
            aria-label={gettext('Delete')}
          />
        </td>
      </tr>
    );
  }
}

RepoShareUploadLinkItem.propTypes = repoShareUploadLinkItemPropTypes;

const RepoShareUploadLinksDialogPropTypes = {
  repo: PropTypes.object.isRequired,
  toggleDialog: PropTypes.func.isRequired
};

class RepoShareUploadLinksDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      activeTab: 'shareLinks',
      repoShareUploadLinkList: [],
      errorMsg: ''
    };
  }

  componentDidMount() {
    this.getItems('share-link');
  }

  getItems = (itemType) => {
    const repoID = this.props.repo.repo_id;
    const request = itemType == 'share-link' ?
      seafileAPI.listRepoShareLinks(repoID) :
      seafileAPI.listRepoUploadLinks(repoID);
    request.then((res) => {
      this.setState({
        loading: false,
        repoShareUploadLinkList: res.data,
      });
    }).catch(error => {
      this.setState({
        isLoading: false,
        errorMsg: Utils.getErrorMsg(error, true)
      });
    });
  }

  deleteItem = (token) => {
    const repoID = this.props.repo.repo_id;
    const request = this.state.activeTab == 'shareLinks' ?
      seafileAPI.deleteRepoShareLink(repoID, token) :
      seafileAPI.deleteRepoUploadLink(repoID, token);
    request.then((res) => {
      const repoShareUploadLinkList = this.state.repoShareUploadLinkList.filter(item => {
        return item.token !== token;
      });
      this.setState({
        repoShareUploadLinkList: repoShareUploadLinkList
      });
    }).catch(error => {
      toaster.danger(Utils.getErrorMsg(error));
    });
  };

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({activeTab: tab});
    }
    if (tab == 'shareLinks') {
      this.getItems('share-link');
    }
    if (tab == 'uploadLinks') {
      this.getItems('upload-link');
    }
  };

  render() {

    const { loading, errorMsg, activeTab, repoShareUploadLinkList } = this.state;

    const itemName = '<span class="op-target">' + Utils.HTMLescape(this.props.repo.repo_name) + '</span>';
    const title = gettext('{placeholder} Share/Upload Links').replace('{placeholder}', itemName);

    return (
      <Modal isOpen={true} style={{maxWidth: '800px'}}>
        <ModalHeader toggle={this.props.toggleDialog}>
          <span dangerouslySetInnerHTML={{__html: title}}></span>
        </ModalHeader>
        <ModalBody className="p-0 pb-4">
          <div className="main-panel-center">
            <div className="cur-view-container" role="tablist">
              <div className="cur-view-path share-upload-nav">
                <ul className="nav">
                  <li className="nav-item" role="tab" aria-selected={activeTab === 'shareLinks'} aria-controls="share-links-panel">
                    <NavLink className={activeTab === 'shareLinks' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareLinks')} tabIndex="0" onKeyDown={Utils.onKeyDown}>{gettext('Share Links')}</NavLink>
                  </li>
                  <li className="nav-item" role="tab" aria-selected={activeTab === 'uploadLinks'} aria-controls="upload-links-panel">
                    <NavLink className={activeTab === 'uploadLinks' ? 'active' : ''} onClick={this.toggle.bind(this, 'uploadLinks')} tabIndex="0" onKeyDown={Utils.onKeyDown}>{gettext('Upload Links')}</NavLink>
                  </li>
                </ul>
              </div>
              <div className="cur-view-content" style={{minHeight: '20rem', maxHeight: '20rem'}} role="tabpanel" id={activeTab === 'shareLinks' ? 'share-links-panel' : 'upload-links-panel'}>
                {loading && <Loading />}
                {!loading && errorMsg && <p className="error text-center mt-8">{errorMsg}</p>}
                {!loading && !errorMsg && !repoShareUploadLinkList.length &&
                  <EmptyTip forDialog={true}>
                    <p className="text-secondary">{activeTab == 'shareLinks' ? gettext('No share links') : gettext('No upload links')}</p>
                  </EmptyTip>
                }
                {!loading && !errorMsg && repoShareUploadLinkList.length > 0 &&
                <table>
                  <thead>
                    <tr>
                      <th width="22%">{gettext('Creator')}</th>
                      <th width="20%">{gettext('Name')}</th>
                      <th width="48%">{gettext('Link')}</th>
                      <th width="10%"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {this.state.repoShareUploadLinkList.map((item, index) => {
                      return (
                        <RepoShareUploadLinkItem
                          key={index}
                          item={item}
                          activeTab={this.state.activeTab}
                          deleteItem={this.deleteItem}
                        />
                      );
                    })}
                  </tbody>
                </table>
                }
              </div>
            </div>
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

RepoShareUploadLinksDialog.propTypes = RepoShareUploadLinksDialogPropTypes;

export default RepoShareUploadLinksDialog;
