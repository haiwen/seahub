import React, { Component, Fragment } from 'react';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import toaster from '../../components/toast';
import OrgAdminUserNav from '../../components/org-admin-user-nav';
import DeleteRepoDialog from '../../components/dialog/delete-repo-dialog';
import MainPanelTopbar from './main-panel-topbar';

import '../../css/org-admin-user.css';

const { orgID } = window.org.pageOptions;

class OrgUserOwnedRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: ''
    };
  }

  componentDidMount() {
    const email = decodeURIComponent(this.props.email);
    seafileAPI.orgAdminGetOrgUserOwnedRepos(orgID, email).then((res) => {
      this.setState(Object.assign({
        loading: false
      }, res.data));
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar/>
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgAdminUserNav email={this.props.email} currentItem='owned-repos' />
            <div className="cur-view-content">
              <Content
                data={this.state}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const {
      loading, errorMsg, repo_list
    } = this.props.data;

    if (loading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    }

    return (
      <Fragment>
        <table className="table-hover">
          <thead>
            <tr>
              <th width="4%">{/*icon*/}</th>
              <th width="35%">{gettext('Name')}</th>
              <th width="16%">{gettext('Size')}</th>
              <th width="25%">{gettext('Last Update')}</th>
              <th width="20%"></th>
            </tr>
          </thead>
          <tbody>
            {repo_list.map((item, index) => {
              return <Item key={index} data={item} />;
            })}
          </tbody>
        </table>
      </Fragment>
    );
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      deleted: false,
      isDeleteRepoDialogOpen: false,
      isRepoDeleted: false,
    };
  }

  handleMouseOver = () => {
    this.setState({
      isOpIconShown: true
    });
  }

  handleMouseOut = () => {
    this.setState({
      isOpIconShown: false
    });
  }

  handleDeleteIconClick = (e) => {
    e.preventDefault();
    this.toggleDeleteRepoDialog();
  }

  toggleDeleteRepoDialog = () => {
    this.setState({
      isDeleteRepoDialogOpen: !this.state.isDeleteRepoDialogOpen
    });
  }

  deleteRepo = () => {
    const repo = this.props.data;
    seafileAPI.orgAdminDeleteOrgRepo(orgID, repo.repo_id).then((res) => {
      this.setState({
        deleted: true,
        isRepoDeleted: true,
      });
      const msg = gettext('Successfully deleted {name}.').replace('{name}', repo.repo_name);
      toaster.success(msg);
    }).catch((error) => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);

      this.setState({isRepoDeleted: false});
    });
  }

  render() {
    const { deleted, isOpIconShown, isDeleteRepoDialogOpen } = this.state;
    const repo = this.props.data;

    if (deleted) {
      return null;
    }

    return (
      <Fragment>
        <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
          <td>
            <img src={Utils.getLibIconUrl(repo, false)} alt={Utils.getLibIconTitle(repo)} title={Utils.getLibIconTitle(repo)} width="24" />
          </td>
          <td>{repo.repo_name}</td>
          <td>{Utils.bytesToSize(repo.size)}</td>
          <td title={moment(repo.last_modified).format('LLLL')}>{moment(repo.last_modified).format('YYYY-MM-DD')}</td>
          <td>
            <a href="#" className={`action-icon sf2-icon-delete${isOpIconShown ? '' : ' invisible'}`} title={gettext('Delete')} onClick={this.handleDeleteIconClick}></a>
          </td>
        </tr>
        {isDeleteRepoDialogOpen && (
          <DeleteRepoDialog
            repo={repo}
            isRepoDeleted={this.state.isRepoDeleted}
            onDeleteRepo={this.deleteRepo}
            toggle={this.toggleDeleteRepoDialog}
          />
        )}
      </Fragment>
    );
  }
}

export default OrgUserOwnedRepos;
