import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext, siteRoot } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
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
          <h2>{gettext('This user has not created or joined any groups')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="30%">{gettext('Name')}</th>
                <th width="30%">{gettext('Role')}</th>
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
      showOpIcon: false,
      isDeleteDialogOpen: false,
    };
  }

  handleMouseOver = () => {
    this.setState({showOpIcon: true});
  }

  handleMouseOut = () => {
    this.setState({showOpIcon: false});
  }

  toggleDeleteDialog = () => {
    this.setState({isDeleteDialogOpen: !this.state.isDeleteDialogOpen});
  }

  deleteGroup = () => {
    this.props.deleteGroup(this.props.item.id);
    this.toggleDeleteDialog();
  }

  render() {
    let { showOpIcon, isDeleteDialogOpen } = this.state;
    let { item } = this.props;
    let roleText;
    if (item.role == 'owner') {
      roleText = gettext('Owner');
    } else if (item.role == 'admin') {
      roleText = gettext('Admin');
    } else if (item.role == 'member') {
      roleText = gettext('Member');
    }

    let groupName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?'.replace('{placeholder}', groupName))

    let iconVisibility = showOpIcon ? '' : ' invisible'; 
    let deleteIconClassName = 'op-icon sf2-icon-delete' + iconVisibility;
    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td><a href={siteRoot + 'sysadmin/#groups/' + item.id + '/libs/'}>{item.name}</a></td>
          <td>{roleText}</td>
          <td>{moment(item.created_at).fromNow()}</td>
          <td>
            <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete Library')}
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

class UserGroups extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      groupList: [],
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListAllGroupsJoinedByUser(this.props.email).then(res => {
      this.setState({
        groupList: res.data.group_list,
        loading: false
      });
    }).catch((error) => {
      if (error.response) {
        if (error.response.status == 403) {
          this.setState({
            loading: false,
            errorMsg: gettext('Permission denied')
          });
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
      let newGroupList = this.state.groupList.filter(item=> {
        return item.id != groupID;
      });
      this.setState({
        groupList: newGroupList
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <div className="cur-view-content">
        <Content
          loading={this.state.loading}
          errorMsg={this.state.errorMsg}
          items={this.state.groupList}
          deleteGroup={this.deleteGroup}
        />
      </div>
    );
  }
}

export default UserGroups;
