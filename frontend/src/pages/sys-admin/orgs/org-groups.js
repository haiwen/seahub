import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import dayjs from 'dayjs';
import classnames from 'classnames';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { siteRoot, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import OrgNav from './org-nav';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center mt-4">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip text={gettext('No groups')}>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="30%">{gettext('Name')}</th>
                <th width="30%">{gettext('Creator')}</th>
                <th width="30%">{gettext('Created At')}</th>
                <th width="10%">{/* Operations */}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (
                  <Item
                    key={index}
                    item={item}
                    deleteGroup={this.props.deleteGroup}
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
  getDeviceErrorsListByPage: PropTypes.func,
  resetPerPage: PropTypes.func,
  curPerPage: PropTypes.number,
  pageInfo: PropTypes.object,
  deleteGroup: PropTypes.func.isRequired,
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

  toggleDeleteDialog = () => {
    this.setState({ isDeleteDialogOpen: !this.state.isDeleteDialogOpen });
  };

  deleteGroup = () => {
    this.toggleDeleteDialog();
    this.props.deleteGroup(this.props.item.group_id);
  };

  render() {
    const { item } = this.props;
    const { isOpIconShown, isDeleteDialogOpen, isHighlighted } = this.state;

    const itemName = '<span class="op-target">' + Utils.HTMLescape(item.group_name) + '</span>';
    const deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', itemName);

    const groupUrl = `${siteRoot}sys/groups/${item.group_id}/libraries/`;

    return (
      <Fragment>
        <tr
          className={classnames({
            'tr-highlight': isHighlighted
          })}
          onMouseEnter={this.handleMouseEnter}
          onMouseLeave={this.handleMouseLeave}
        >
          <td><a href={groupUrl}>{item.group_name}</a></td>
          <td><UserLink email={item.creator_email} name={item.creator_name} /></td>
          <td>{dayjs(item.created_at).format('YYYY-MM-DD HH:mm:ss')}</td>
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
            title={gettext('Delete Group')}
            message={deleteDialogMsg}
            executeOperation={this.deleteGroup}
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
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
  deleteGroup: PropTypes.func.isRequired,
  transferGroup: PropTypes.func.isRequired,
};

class OrgGroups extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      orgName: '',
      groupList: []
    };
  }

  componentDidMount() {
    systemAdminAPI.sysAdminGetOrg(this.props.orgID).then((res) => {
      this.setState({
        orgName: res.data.org_name
      });
    });
    systemAdminAPI.sysAdminListOrgGroups(this.props.orgID).then((res) => {
      this.setState({
        loading: false,
        groupList: res.data.group_list
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  deleteGroup = (groupID) => {
    systemAdminAPI.sysAdminDismissGroupByID(groupID).then(res => {
      let newGroupList = this.state.groupList.filter(item => {
        return item.group_id != groupID;
      });
      this.setState({ groupList: newGroupList });
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
              currentItem="groups"
              orgID={this.props.orgID}
              orgName={this.state.orgName}
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.groupList}
                deleteGroup={this.deleteGroup}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

OrgGroups.propTypes = {
  orgID: PropTypes.string,
};


export default OrgGroups;
