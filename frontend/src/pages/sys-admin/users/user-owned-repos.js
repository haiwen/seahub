import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import { username } from '../../../utils/constants';
import EmptyTip from '../../../components/empty-tip';
import moment from 'moment';
import Loading from '../../../components/loading';
import CommonOperationDialog from '../../../components/dialog/common-operation-dialog';
import SysAdminRepoTransferDialog from '../../../components/dialog/sysadmin-dialog/sysadmin-repo-transfer-dialog';

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
    };
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
          <h2>{gettext('This user has not created any libraries')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="5%">{/*icon*/}</th>
                <th width="20%">{gettext('Name')}</th>
                <th width="25%">{gettext('Size')}</th>
                <th width="19%">{gettext('Last Update')}</th>
                <th width="10%">{/*Operations*/}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item 
                  key={index}
                  item={item}
                  deleteRepo={this.props.deleteRepo}
                  transferRepo={this.props.transferRepo}
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
      role: this.props.item.role,
      quota_total: this.props.item.quota_total,
      isDeleteDialogOpen: false,
      isTransferDialogOpen: false,
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

  toggleTransferDialog = () => {
    this.setState({isTransferDialogOpen: !this.state.isTransferDialogOpen});
  }

  deleteRepo = () => {
    this.props.deleteRepo(this.props.item.id);
    this.toggleDeleteDialog();
  }

  transferRepo = (receiver) => {
    this.props.transferRepo(receiver.email, this.props.item.id);
    this.toggleTransferDialog();
  }

  render() {
    let { showOpIcon, isDeleteDialogOpen, isTransferDialogOpen } = this.state;
    let { item } = this.props;

    let iconUrl = Utils.getLibIconUrl(item);
    let iconTitle = Utils.getLibIconTitle(item);

    let repoName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?'.replace('{placeholder}', repoName))

    let iconVisibility = this.state.showOpIcon ? '' : ' invisible'; 
    let deleteIconClassName = 'op-icon sf2-icon-delete' + iconVisibility;
    let transferIconClassName = 'op-icon sf2-icon-move' + iconVisibility;
    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseOver} onMouseLeave={this.handleMouseOut}>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{item.name}</td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td>{moment(item.last_modify).fromNow()}</td>
          <td>
            {item.email != username && showOpIcon &&
            <Fragment>
              <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
              <a href="#" className={transferIconClassName} title={gettext('Transfer')} onClick={this.toggleTransferDialog}></a>
            </Fragment>
            }
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete Library')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteDialog}
            executeOperation={this.deleteRepo}
            confirmBtnText={gettext('Delete')}
          />
        }
        {isTransferDialogOpen &&
          <SysAdminRepoTransferDialog
            repoName={item.name}
            toggle={this.toggleTransferDialog}
            submit={this.transferRepo}
          />
        }
      </Fragment>
    );
  }
}

class UserOwnedRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repoList: [],
      isShowImportWaitingDialog: false,
      isShowAddUserWaitingDialog: false
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListAllRepoInfoByOwner(this.props.email).then(res => {
      this.setState({
        repoList: res.data.repos,
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

  deleteRepo = (repoID) => {
    seafileAPI.sysAdminDeleteRepo(repoID).then(res => {
      let newRepoList = this.state.repoList.filter(repo => {
        return repo.id != repoID;
      });
      this.setState({
        repoList: newRepoList
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  transferRepo = (receiverEmail, repoID) => {
    seafileAPI.sysAdminTransferRepo(repoID, receiverEmail).then(res => {
      let newRepoList = this.state.repoList.filter(repo => {
        return repo.id != repoID;
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
      <div className="cur-view-content">
        <Content
          loading={this.state.loading}
          errorMsg={this.state.errorMsg}
          items={this.state.repoList}
          deleteRepo={this.deleteRepo}
          transferRepo={this.transferRepo}
        />
      </div>
    );
  }
}

export default UserOwnedRepos;
