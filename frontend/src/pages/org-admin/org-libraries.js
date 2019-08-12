import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import MainPanelTopbar from './main-panel-topbar';
import OrgAdminRepo from '../../models/org-admin-repo';
import toaster from '../../components/toast';
import TransferDialog from '../../components/dialog/transfer-dialog';
import ModalPortal from '../../components/modal-portal';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { mediaUrl, siteRoot, gettext, orgID } from '../../utils/constants';

class OrgLibraries extends Component {

  constructor(props) {
    super(props);
    this.state = {
      page: 1,
      pageNext: false,
      orgRepos: [],
      isItemFreezed: false  
    };
  }

  componentDidMount() {
    let page = this.state.page;
    this.initData(page);
  }

  initData = (page) => {
    seafileAPI.orgAdminListOrgRepos(orgID, page).then(res => {
      let orgRepos = res.data.repo_list.map(item => {
        return new OrgAdminRepo(item);
      });

      this.setState({
        orgRepos: orgRepos,
        pageNext: res.data.page_next,
        page: res.data.page,
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }


  onChangePageNum = (e, num) => {
    e.preventDefault();
    let page = this.state.page;

    if (num == 1) {
      page = page + 1;
    } else {
      page = page - 1;
    }
    this.initData(page);
  } 

  onFreezedItem = () => {
    this.setState({isItemFreezed: true});
  }

  onUnfreezedItem = () => {
    this.setState({isItemFreezed: false});
  }

  deleteRepoItem = (repo) => {
    seafileAPI.orgAdminDeleteOrgRepo(orgID, repo.repoID).then(res => {
      this.setState({
        orgRepos: this.state.orgRepos.filter(item => item.repoID != repo.repoID)
      });
      let msg = gettext('Successfully deleted {name}');
      msg = msg.replace('{name}', repo.repoName);
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  transferRepoItem = (repoID, user) => {
    this.setState({
      orgRepos: this.state.orgRepos.map(item =>{
        if (item.repoID == repoID) {
          item.ownerEmail = user.email;
          item.ownerName = user.value;
        }
        return item;
      })
    });
  }

  render() {
    let repos = this.state.orgRepos;
    return (
      <Fragment>
        <MainPanelTopbar/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <div className="cur-view-path">
              <h3 className="sf-heading">{gettext('All Libraries')}</h3>
            </div>
            <div className="cur-view-content">
              <table>
                <thead>
                  <tr>
                    <th width="4%"></th>
                    <th width="27%">{gettext('Name')}</th>
                    <th width="30%">ID</th>
                    <th width="24%">{gettext('Owner')}</th>
                    <th width="15%" className="text-center">{gettext('Operations')}</th>
                  </tr>
                </thead>
                <tbody>
                  {repos.map(item => {
                    return (
                      <RepoItem
                        key={item.repoID}
                        repo={item}
                        isItemFreezed={this.state.isItemFreezed}
                        onFreezedItem={this.onFreezedItem} 
                        onUnfreezedItem={this.onUnfreezedItem}
                        deleteRepoItem={this.deleteRepoItem}
                        transferRepoItem={this.transferRepoItem}
                      />
                    );}
                  )}
                </tbody>
              </table>
              <div className="paginator">
                {this.state.page != 1 && <a href="#" onClick={(e) => this.onChangePageNum(e, -1)}>{gettext('Previous')}</a>}
                {(this.state.page != 1 && this.state.pageNext) && <span> | </span>}
                {this.state.pageNext && <a href="#" onClick={(e) => this.onChangePageNum(e, 1)}>{gettext('Next')}</a>}
              </div>
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

const propTypes = {
  repo: PropTypes.object.isRequired,
  isItemFreezed: PropTypes.bool,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  deleteRepoItem: PropTypes.func.isRequired,
  transferRepoItem: PropTypes.func.isRequired,
};

class RepoItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      showMenu: false,
      isItemMenuShow: false,
      isTransferDialogShow: false
    };
  }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: true,
        highlight: true,
      });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        showMenu: false,
        highlight: false
      });
    }
  } 

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    this.toggleOperationMenu(e);
  }

  toggleOperationMenu = (e) => {
    e.stopPropagation();
    this.setState(
      {isItemMenuShow: !this.state.isItemMenuShow }, () => {
        if (this.state.isItemMenuShow) {
          this.props.onFreezedItem();
        } else {
          this.setState({
            highlight: false,
            showMenu: false,
          });
          this.props.onUnfreezedItem();
        }
      }
    );
  }

  toggleDelete = () => {
    this.props.deleteRepoItem(this.props.repo);
  }

  toggleTransfer = () => {
    this.props.transferRepoItem(this.props.repo);
  }

  renderLibIcon = (repo) => {
    let href;
    let iconTitle;
    if (repo.encrypted) {
      href = mediaUrl + 'img/lib/48/lib-encrypted.png';
      iconTitle = gettext('Encrypted library'); 
    } else {
      href = mediaUrl + 'img/lib/48/lib.png';
      iconTitle = gettext('Read-Write library');
    } 
    return <img src={href} title={iconTitle} alt={iconTitle} width="24" />;
  }

  renderRepoOwnerHref = (repo) => {
    let href;
    if (repo.isDepartmentRepo) {
      href = siteRoot + 'org/admin/#address-book/groups/' + repo.groupID + '/';
    } else {
      href = siteRoot + 'org/useradmin/info/' + repo.ownerEmail + '/';
    }
    return href;
  }

  toggleTransfer = () => {
    this.setState({isTransferDialogShow: !this.state.isTransferDialogShow});
  }

  onTransferRepo = (user) => {
    let repo = this.props.repo;
    seafileAPI.orgAdminTransferOrgRepo(orgID, repo.repoID, user.email).then(res => {
      this.props.transferRepoItem(repo.repoID, user);
      let msg = gettext('Successfully transferred the library.');
      toaster.success(msg);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
    this.toggleTransfer();
  }

  render() {
    let { repo } = this.props;
    
    let isOperationMenuShow = this.state.showMenu && !repo.isDepartmentRepo;
    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td>{this.renderLibIcon(repo)}</td>
          <td>{repo.repoName}</td>
          <td style={{'fontSize': '11px'}}>{repo.repoID}</td>
          <td><a href={this.renderRepoOwnerHref(repo)}>{repo.ownerName}</a></td>
          <td className="text-center cursor-pointer">
            {isOperationMenuShow &&
              <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleOperationMenu}>
                <DropdownToggle
                  tag="a"
                  className="attr-action-icon fas fa-ellipsis-v"
                  title={gettext('More Operations')}
                  data-toggle="dropdown"
                  aria-expanded={this.state.isItemMenuShow}
                  onClick={this.onDropdownToggleClick}
                />
                <DropdownMenu>
                  <DropdownItem onClick={this.toggleDelete}>{gettext('Delete')}</DropdownItem>
                  <DropdownItem onClick={this.toggleTransfer}>{gettext('Transfer')}</DropdownItem>
                </DropdownMenu>
              </Dropdown>
            }
          </td>
        </tr>
        {this.state.isTransferDialogShow && (
          <ModalPortal>
            <TransferDialog
              itemName={repo.repoName}
              submit={this.onTransferRepo}
              toggleDialog={this.toggleTransfer}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

RepoItem.propTypes = propTypes;

export default OrgLibraries;
