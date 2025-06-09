import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import classnames from 'classnames';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import OrgNav from './org-nav';

class Content extends Component {
  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No libraries')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table>
            <thead>
              <tr>
                <th width="5%"></th>
                <th width="30%">{gettext('Name')}</th>
                <th width="35%">{'ID'}</th>
                <th width="20%">{gettext('Owner')}</th>
                <th width="10%">{/* Operations */}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (
                  <Item
                    key={index}
                    item={item}
                    deleteRepo={this.props.deleteRepo}
                  />
                );
              })}
            </tbody>
          </table>
        </Fragment>
      );
      return items.length ? table : emptyTip;
    }
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  deleteRepo: PropTypes.func.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isHighlighted: false,
      isOpIconShown: false,
      isDeleteDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    this.setState({
      isHighlighted: true,
      isOpIconShown: true
    });
  };

  handleMouseLeave = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShown: false
    });
  };

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({ isDeleteDialogOpen: !this.state.isDeleteDialogOpen });
  };

  deleteRepo = () => {
    this.props.deleteRepo(this.props.item.repo_id);
  };

  render() {
    const { item } = this.props;
    const { isOpIconShown, isDeleteDialogOpen, isHighlighted } = this.state;

    const iconUrl = Utils.getLibIconUrl(item);
    const iconTitle = Utils.getLibIconTitle(item);

    const itemName = '<span class="op-target">' + Utils.HTMLescape(item.repo_name) + '</span>';
    const deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', itemName);

    return (
      <Fragment>
        <tr
          className={classnames({
            'tr-highlight': isHighlighted
          })}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
        >
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{item.repo_name}</td>
          <td>{item.repo_id}</td>
          <td>
            {!item.owner_email ?
              '--' :
              item.owner_email.indexOf('@seafile_group') == -1 ?
                <UserLink email={item.owner_email} name={item.owner_name} /> :
                item.owner_name
            }
          </td>
          <td>
            <i
              className={`op-icon sf3-font-delete1 sf3-font ${isOpIconShown ? '' : 'invisible'}`}
              title={gettext('Delete')}
              onClick={this.toggleDeleteDialog}
            >
            </i>
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Delete Library')}
            message={deleteDialogMsg}
            executeOperation={this.deleteRepo}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteDialog}
          />
        }
      </Fragment>
    );
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  deleteRepo: PropTypes.func.isRequired,
};

class OrgRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      orgName: '',
      repoList: []
    };
  }

  componentDidMount() {
    systemAdminAPI.sysAdminGetOrg(this.props.orgID).then((res) => {
      this.setState({
        orgName: res.data.org_name
      });
    });
    systemAdminAPI.sysAdminListOrgRepos(this.props.orgID).then((res) => {
      this.setState({
        loading: false,
        repoList: res.data.repo_list
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteRepo = (repoID) => {
    systemAdminAPI.sysAdminDeleteRepo(repoID).then(res => {
      let newRepoList = this.state.repoList.filter(item => {
        return item.repo_id != repoID;
      });
      this.setState({ repoList: newRepoList });
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgNav
              currentItem="repos"
              orgID={this.props.orgID}
              orgName={this.state.orgName}
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repoList}
                deleteRepo={this.deleteRepo}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

OrgRepos.propTypes = {
  orgID: PropTypes.string,
};

export default OrgRepos;
