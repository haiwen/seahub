import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import OrgNav from './org-nav';
import MainPanelTopbar from '../main-panel-topbar';
import CommonOperationDialog from '../../../components/dialog/common-operation-dialog';

class Content extends Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { loading, errorMsg, items } = this.props;
    if (loading) {
      return <Loading />;
    } else if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    } else {
      const emptyTip = (
        <EmptyTip>
          <h2>{gettext('This organization doesn\'t have any groups')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="30%">{gettext('Name')}</th>
                <th width="30%">{gettext('Creator')}</th>
                <th width="30%">{gettext('Create At')}</th>
                <th width="10%">{gettext('Operations')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  deleteGroup={this.props.deleteGroup}
                />);
              })}
            </tbody>
          </table>
        </Fragment>
      );
      return items.length ? table : emptyTip; 
    }
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      isDeleteDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseLeave = () => {
    this.setState({isOpIconShown: false});
  }

  toggleDeleteDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  deleteGroup = () => {
    this.toggleDeleteDialog();
    this.props.deleteGroup(this.props.item.group_id);
  }

  render() {
    let { item } = this.props;
    let { isOpIconShown, isDeleteDialogOpen } = this.state;

    let iconVisibility = isOpIconShown ? '' : ' invisible'; 
    let deleteIconClassName = 'op-icon sf2-icon-delete' + iconVisibility;

    let groupName = '<span class="op-target">' + Utils.HTMLescape(item.group_name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete group {placeholder} ?').replace('{placeholder}', groupName);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><a href={siteRoot + 'group/' + item.group_id + '/'}>{item.group_name}</a></td>
          <td>{item.creator_name}</td>
          <td>
            <span className="item-meta-info">{moment(item.created_at).format('YYYY-MM-DD hh:mm:ss')}</span>
          </td>
          <td>
            <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete Group')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteDialog}
            executeOperation={this.deleteGroup}
            confirmBtnText={gettext('Delete')}
          />
        }
      </Fragment>
    );
  }
}

class OrgGroups extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      groupList: []
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListAllOrgGroups(this.props.orgID).then((res) => {
      this.setState({
        loading: false,
        groupList: res.data.groups,
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          }); 
          location.href = `${loginUrl}?next=${encodeURIComponent(location.href)}`;
        } else {
          this.setState({
            loading: false,
            errorMsg: gettext('Error')
          }); 
        }   
      } else {
        this.setState({
          loading: false,
          errorMsg: gettext('Please check the network.')
        });
      }
    });
  }

  deleteGroup = (groupID) => {
    seafileAPI.sysAdminDismissGroupByID(groupID).then(res => {
      let newGroupList = this.state.groupList.filter(item => {
        return item.group_id != groupID;
      });
      this.setState({groupList: newGroupList});
      toaster.success(gettext('Successfully deleted group.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <OrgNav currentItem="groups" orgID={this.props.orgID} />
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

export default OrgGroups;
