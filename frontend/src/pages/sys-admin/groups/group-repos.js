import React, { Component, Fragment } from 'react';
import { Utils } from '../../../utils/utils';
import { seafileAPI } from '../../../utils/seafile-api';
import { siteRoot, gettext, isPro } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import MainPanelTopbar from '../main-panel-topbar';
import UserLink from '../user-link';
import GroupNav from './group-nav';

const { enableSysAdminViewRepo } = window.sysadmin.pageOptions;

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
                <th width="30%">{gettext('Name')}</th>
                <th width="30%">{gettext('Size')}</th>
                <th width="25%">{gettext('Shared By')}</th>
                <th width="10%">{/*Operations*/}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  unshareRepo={this.props.unshareRepo}
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
      isUnshareRepoDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseLeave = () => {
    this.setState({isOpIconShown: false});
  }

  toggleUnshareRepoDialog = (e) => {
    if (e) {
      e.preventDefault();
    }
    this.setState({isUnshareRepoDialogOpen: !this.state.isUnshareRepoDialogOpen});
  }

  unshareRepo = () => {
    const { item } = this.props;
    this.props.unshareRepo(item.repo_id, item.name);
    this.toggleUnshareRepoDialog();
  }

  renderRepoName = () => {
    const { item } = this.props;
    const repo = item;
    repo.id = item.repo_id;
    if (repo.name) {
      if (isPro && enableSysAdminViewRepo && !repo.encrypted) {
        return <a href={`${siteRoot}sys/libraries/${repo.id}/`}>{repo.name}</a>;
      } else {
        return repo.name;
      }
    } else {
      return '--';
    }
  }

  render() {
    let { isOpIconShown, isUnshareRepoDialogOpen } = this.state;
    let { item } = this.props;

    let iconUrl = Utils.getLibIconUrl(item);
    let iconTitle = Utils.getLibIconTitle(item);

    let repoName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    let dialogMsg = gettext('Are you sure you want to unshare {placeholder} ?').replace('{placeholder}', repoName);

    return (
      <Fragment>
        <tr onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{this.renderRepoName()}</td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td>
            <UserLink email={item.shared_by} name={item.shared_by_name} />
          </td>
          <td>
            <a href="#" className={`action-icon sf2-icon-x3 ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Unshare')} onClick={this.toggleUnshareRepoDialog}></a>
          </td>
        </tr>
        {isUnshareRepoDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Unshare Library')}
            message={dialogMsg}
            executeOperation={this.unshareRepo}
            confirmBtnText={gettext('Unshare')}
            toggleDialog={this.toggleUnshareRepoDialog}
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
      repoList: []
    };
  }

  componentDidMount () {
    seafileAPI.sysAdminListGroupRepos(this.props.groupID).then((res) => {
      this.setState({
        loading: false,
        repoList: res.data.libraries,
        groupName: res.data.group_name
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  unshareRepo = (repoID, repoName) => {
    seafileAPI.sysAdminUnshareRepoFromGroup(this.props.groupID, repoID).then(res => {
      let newRepoList = this.state.repoList.filter(item => {
        return item.repo_id != repoID;
      });
      this.setState({
        repoList: newRepoList
      });
      const msg = gettext('Successfully unshared library {placeholder}')
        .replace('{placeholder}', repoName);
      toaster.success(msg);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <Fragment>
        <MainPanelTopbar {...this.props} />
        <div className="main-panel-center flex-row">
          <div className="cur-view-container">
            <GroupNav
              groupID={this.props.groupID}
              groupName={this.state.groupName}
              currentItem="repos"
            />
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.repoList}
                unshareRepo={this.unshareRepo}
              />
            </div>
          </div>
        </div>
      </Fragment>
    );
  }
}

export default GroupRepos;
