import React, {Fragment} from 'react';
import { Link } from '@reach/router';
import PropTypes from 'prop-types';
import {gettext} from '../../utils/constants';
import {Modal, ModalHeader, ModalBody, Button, Input, TabContent, TabPane, Nav, NavItem, NavLink } from 'reactstrap';
import {seafileAPI} from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../toast';
import copy from 'copy-to-clipboard';
import Loading from '../loading';

import '../../css/share-link-dialog.css';

const repoShareUploadLinkItemPropTypes = {
  item: PropTypes.object.isRequired,
  activeTab: PropTypes.string.isRequired,
  onDeleteShareLink: PropTypes.func.isRequired,
  onDeleteUploadLink: PropTypes.func.isRequired,
};

class RepoShareUploadLinkItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isOperationShow: false,
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
    if (this.props.activeTab === 'shareLinks') {
      this.props.onDeleteShareLink(this.props.item);
    }
    if (this.props.activeTab === 'uploadLinks') {
      this.props.onDeleteUploadLink(this.props.item);
    }
  };


  render() {
    const { siteRoot } = window.app.config;

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
      <Fragment>
        <tr onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td className="name">{item.creator_name}</td>
          <td>
            <a href={objUrl} target="_blank">{item.obj_name}</a>
          </td>
          <td>
            <a href={item.link} target="_blank">{item.link}</a>
          </td>
          <td>
            <span
              className={`sf2-icon-x3 action-icon ${this.state.isOperationShow ? '' : 'hide'}`}
              onClick={this.onDeleteLink}
              title={gettext('Delete')}
            />
          </td>
        </tr>
      </Fragment>
    );
  }
}

RepoShareUploadLinkItem.propTypes = repoShareUploadLinkItemPropTypes;

// for share upload links dialog
const RepoShareUploadLinksDialogPropTypes = {
  repo: PropTypes.object.isRequired,
  onRepoShareUploadLinksToggle: PropTypes.func.isRequired,
};

class RepoShareUploadLinksDialog extends React.Component {

  constructor(props) {
    super(props);
    this.repo = this.props.repo;
    this.state = {
      repoShareUploadLinkList: [],
      errorMsg: '',
      loading: true,
      activeTab: 'shareLinks'
    };
  }

  componentDidMount() {
    this.listRepoShareLinks();
  }

  listRepoShareLinks = () => {
    seafileAPI.listRepoShareLinks(this.repo.repo_id).then((res) => {
      this.setState({
        repoShareUploadLinkList: res.data,
        loading: false,
      });
    }).catch(error => {
      if (error.response.status === 403) {
        this.setState({
          errorMsg: gettext('Permission denied'),
        });
      } else {
        this.handleError(error);
      }
    });
  };

  listRepoUploadLinks = () => {
    seafileAPI.listRepoUploadLinks(this.repo.repo_id).then((res) => {
      this.setState({
        repoShareUploadLinkList: res.data,
        loading: false,
      });
    }).catch(error => {
      if (error.response.status === 403) {
        this.setState({
          errorMsg: gettext('Permission denied'),
        });
      } else {
        this.handleError(error);
      }
    });
  };

  onDeleteShareLink = (item) => {
    const repo_id = item.repo_id;
    const token = item.token;
    seafileAPI.deleteRepoShareLink(repo_id, token).then((res) => {
      const repoShareUploadLinkList = this.state.repoShareUploadLinkList.filter(item => {
        return item.token !== token;
      });
      this.setState({
        repoShareUploadLinkList: repoShareUploadLinkList,
      });
    }).catch(error => {
      this.handleError(error);
    });
  };

  onDeleteUploadLink = (item) => {
    const repo_id = item.repo_id;
    const token = item.token;
    seafileAPI.deleteRepoUploadLink(repo_id, token).then((res) => {
      const repoShareUploadLinkList = this.state.repoShareUploadLinkList.filter(item => {
        return item.token !== token;
      });
      this.setState({
        repoShareUploadLinkList: repoShareUploadLinkList,
      });
    }).catch(error => {
      this.handleError(error);
    });
  };

  handleError = (e) => {
    if (e.response) {
      toaster.danger(e.response.data.error_msg || e.response.data.detail || gettext('Error'), {duration: 3});
    } else {
      toaster.danger(gettext('Please check the network.'), {duration: 3});
    }
  };

  toggle = (tab) => {
    if (this.state.activeTab !== tab) {
      this.setState({activeTab: tab});
    }
    if (tab === 'shareLinks') {
      this.listRepoShareLinks();
    }
    if (tab === 'uploadLinks') {
      this.listRepoUploadLinks();
    }
  };

  render() {

    let repo = this.repo;
    let activeTab = this.state.activeTab;

    const { siteRoot } = window.app.config;
    const itemName = '<span class="op-target">' + Utils.HTMLescape(repo.repo_name) + '</span>';
    const title = gettext('{placeholder} Share/Upload Links').replace('{placeholder}', itemName);

    return (
      <Modal isOpen={true} className="share-dialog" style={{maxWidth: '800px'}}>
        <ModalHeader toggle={this.props.onRepoShareUploadLinksToggle}>
          <p dangerouslySetInnerHTML={{__html: title}} className="m-0"></p>
        </ModalHeader>
        <ModalBody className="share-dialog-content">
          <div className="main-panel-center">
            <div className="cur-view-container">
              <div className="cur-view-path share-upload-nav">
                <ul className="nav">
                  <li className="nav-item">
                    <NavLink className={activeTab === 'shareLinks' ? 'active' : ''} onClick={this.toggle.bind(this, 'shareLinks')}>{gettext('Share Links')}</NavLink>
                  </li>
                  <li className="nav-item">
                    <NavLink className={activeTab === 'uploadLinks' ? 'active' : ''} onClick={this.toggle.bind(this, 'uploadLinks')}>{gettext('Upload Links')}</NavLink>
                  </li>
                </ul>
              </div>
              <div className="cur-view-content">
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
                    {this.state.repoShareUploadLinkList.length !== 0 &&
                      this.state.repoShareUploadLinkList.map((item, index) => {
                        return (
                          <RepoShareUploadLinkItem
                            key={index}
                            item={item}
                            activeTab={this.state.activeTab}
                            onDeleteShareLink={this.onDeleteShareLink}
                            onDeleteUploadLink={this.onDeleteUploadLink}
                          />
                        );
                      })
                    }
                  </tbody>
                </table>
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
