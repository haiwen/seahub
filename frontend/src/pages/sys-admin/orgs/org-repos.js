import React, { Component, Fragment } from 'react';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, loginUrl, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import { Utils } from '../../../utils/utils';
import EmptyTip from '../../../components/empty-tip';
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
          <h2>{gettext('This organization doesn\'t have any libraries.')}</h2>
        </EmptyTip>
      );
      const table = (
        <Fragment>
          <table className="table-hover">
            <thead>
              <tr>
                <th width="25%">{gettext('Name')}</th>
                <th width="30%">{gettext('ID')}</th>
                <th width="25%">{gettext('Owner')}</th>
                <th width="20%">{gettext('Operations')}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  deleteRepo={this.props.deleteRepo}
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

  deleteRepo = () => {
    this.toggleDeleteDialog();
    this.props.deleteRepo(this.props.item.repo_id);
  }

  render() {
    let { item } = this.props;
    let { isOpIconShown, isDeleteDialogOpen } = this.state;

    let iconVisibility = isOpIconShown ? '' : ' invisible'; 
    let deleteIconClassName = 'op-icon sf2-icon-delete' + iconVisibility;

    let repoName = '<span class="op-target">' + Utils.HTMLescape(item.repo_name) + '</span>';
    let deleteDialogMsg = gettext('Are you sure you want to delete group {placeholder} ?').replace('{placeholder}', repoName);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td>{item.repo_name}</td>
          <td>{item.repo_id}</td>
          <td><a href={siteRoot + 'sys/user-info/' + item.owner_email + '/'}>{item.owner_email}</a></td>
          <td>
            <a href="#" className={deleteIconClassName} title={gettext('Delete')} onClick={this.toggleDeleteDialog}></a>
          </td>
        </tr>
        {isDeleteDialogOpen &&
          <CommonOperationDialog
            title={gettext('Delete Group')}
            message={deleteDialogMsg}
            toggle={this.toggleDeleteDialog}
            executeOperation={this.deleteRepo}
            confirmBtnText={gettext('Delete')}
          />
        }
      </Fragment>
    );
  }
}

class OrgRepos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      repoList: []
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListAllOrgRepos(this.props.orgID).then((res) => {
      this.setState({
        loading: false,
        repoList: res.data.repos,
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

  deleteRepo = (repoID) => {
    seafileAPI.sysAdminDeleteRepo(repoID).then(res => {
      let newRepoList = this.state.repoList.filter(item => {
        return item.repo_id != repoID;
      });
      this.setState({repoList: newRepoList});
      toaster.success(gettext('Successfully deleted library.'));
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
            <OrgNav currentItem="repos" orgID={this.props.orgID} />
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

export default OrgRepos;
