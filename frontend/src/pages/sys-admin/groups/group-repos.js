import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext } from '../../../utils/constants';
import { Label} from 'reactstrap';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import GroupNav from './group-nav';
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
          <h2>{gettext('No libraries')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="5%">{/* icon */}</th>
                <th width="25%">{gettext('Name')}</th>
                <th width="20%">{gettext('Size')}</th>
                <th width="30%">{gettext('Shared By')}</th>
                <th width="20%">{gettext('Operations')}</th>
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
    this.props.deleteGroup(this.props.item.repo_id);
    this.toggleDeleteDialog();
  }

  render() {
    let { isOpIconShown, isDeleteDialogOpen } = this.state;
    let { item } = this.props;

    let iconUrl = Utils.getLibIconUrl(item);
    let iconTitle = Utils.getLibIconTitle(item);

    let iconVisibility = isOpIconShown ? '' : ' invisible'; 
    let deleteIconClassName = 'op-icon sf2-icon-delete' + iconVisibility;

    let repoName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to unshare {placeholder} ?').replace('{placeholder}', repoName);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{item.name}</td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td><a href={siteRoot + 'sys/user-info/' + item.shared_by + '/'}>{item.shared_by_name}</a></td>
          <td>
            <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Unshare Library')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteDialog}
            executeOperation={this.deleteGroup}
            confirmBtnText={gettext('Unshare')}
          />
        }
      </Fragment>
    );
  }
}

class GroupRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      groupName: '',
      repoList: [],
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListReposOfGroup(this.props.groupID).then((res) => {
      this.setState({
        loading: false,
        repoList: res.data.libraries,
        groupName: res.data.group_name
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

  toggleCreateGroupDialog = () => {
    this.setState({isCreateGroupDialogOpen: !this.state.isCreateGroupDialogOpen});
  }

  deleteGroup = (repoID) => {
    seafileAPI.sysAdminDropRepoFromGroup(this.props.groupID, repoID).then(res => {
      let newRepoList = this.state.repoList.filter(item => {
        return item.repo_id != repoID;
      });
      this.setState({
        repoList: newRepoList
      });
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
            <GroupNav 
              currentItem={'repos'}
              groupID={this.props.groupID}
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repoList}
                deleteGroup={this.deleteGroup}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default GroupRepos;
