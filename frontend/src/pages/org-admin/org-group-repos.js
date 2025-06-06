import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Link } from '@gatsbyjs/reach-router';
import { orgAdminAPI } from '../../utils/org-admin-api';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Loading from '../../components/loading';
import toaster from '../../components/toast';
import OrgAdminGroupNav from '../../components/org-admin-group-nav';
import DeleteRepoDialog from '../../components/dialog/delete-repo-dialog';
import MainPanelTopbar from './main-panel-topbar';

import '../../css/org-admin-user.css';

const { orgID } = window.org.pageOptions;

class OrgGroupRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: ''
    };
  }

  componentDidMount() {
    orgAdminAPI.orgAdminListGroupRepos(orgID, this.props.groupID).then((res) => {
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
            <OrgAdminGroupNav groupID={this.props.groupID} currentItem='repos' />
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
      loading, errorMsg, libraries
    } = this.props.data;

    if (loading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <p className="error text-center mt-2">{errorMsg}</p>;
    }

    return (
      <Fragment>
        <table>
          <thead>
            <tr>
              <th width="4%">{/* icon*/}</th>
              <th width="35%">{gettext('Name')}</th>
              <th width="20%">{gettext('Size')}</th>
              <th width="26%">{gettext('Shared By')}</th>
              <th width="15%"></th>
            </tr>
          </thead>
          <tbody>
            {libraries.map((item, index) => {
              return <Item key={index} data={item} />;
            })}
          </tbody>
        </table>
      </Fragment>
    );
  }
}

Content.propTypes = {
  data: PropTypes.object.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOpIconShown: false,
      deleted: false,
      isDeleteRepoDialogOpen: false,
      isRepoDeleted: false,
    };
  }

  handleMouseOver = () => {
    this.setState({
      isHighlighted: true,
      isOpIconShown: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShown: false
    });
  };

  handleDeleteIconClick = () => {
    this.toggleDeleteRepoDialog();
  };

  toggleDeleteRepoDialog = () => {
    this.setState({
      isDeleteRepoDialogOpen: !this.state.isDeleteRepoDialogOpen
    });
  };

  deleteRepo = () => {
    const repo = this.props.data;
    orgAdminAPI.orgAdminDeleteOrgRepo(orgID, repo.repo_id).then((res) => {
      this.setState({
        deleted: true,
        isRepoDeleted: true,
      });
      const msg = gettext('Successfully deleted {name}.').replace('{name}', repo.name);
      toaster.success(msg);
    }).catch((error) => {
      const errorMsg = Utils.getErrorMsg(error);
      toaster.danger(errorMsg);

      this.setState({ isRepoDeleted: false });
    });
  };

  render() {
    const { deleted, isOpIconShown, isDeleteRepoDialogOpen, isHighlighted } = this.state;
    const repo = this.props.data;

    if (deleted) {
      return null;
    }

    return (
      <Fragment>
        <tr
          className={classnames({
            'tr-highlight': isHighlighted
          })}
          onMouseOver={this.handleMouseOver}
          onMouseOut={this.handleMouseOut}
        >
          <td>
            <img src={Utils.getLibIconUrl(repo)} alt={Utils.getLibIconTitle(repo)} title={Utils.getLibIconTitle(repo)} width="24" />
          </td>
          <td>{repo.name}</td>
          <td>{Utils.bytesToSize(repo.size)}</td>
          <td><Link to={`${siteRoot}org/useradmin/info/${encodeURIComponent(repo.shared_by)}/`}>{repo.shared_by_name}</Link></td>
          <td>
            <i
              className={`op-icon sf3-font-delete1 sf3-font${isOpIconShown ? '' : ' invisible'}`}
              title={gettext('Delete')}
              onClick={this.handleDeleteIconClick}
            >
            </i>
          </td>
        </tr>
        {isDeleteRepoDialogOpen && (
          <DeleteRepoDialog
            repo={repo}
            isRepoDeleted={this.state.isRepoDeleted}
            onDeleteRepo={this.deleteRepo}
            toggle={this.toggleDeleteRepoDialog}
            isGetShare={false}
          />
        )}
      </Fragment>
    );
  }
}

Item.propTypes = {
  data: PropTypes.object.isRequired,
};

OrgGroupRepos.propTypes = {
  groupID: PropTypes.string,
};

export default OrgGroupRepos;
