import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { Utils } from '../../../utils/utils';
import { systemAdminAPI } from '../../../utils/system-admin-api';
import { isPro, siteRoot, gettext } from '../../../utils/constants';
import toaster from '../../../components/toast';
import EmptyTip from '../../../components/empty-tip';
import Loading from '../../../components/loading';
import CommonOperationConfirmationDialog from '../../../components/dialog/common-operation-confirmation-dialog';
import TransferDialog from '../../../components/dialog/transfer-dialog';
import OpMenu from '../../../components/dialog/op-menu';

const { enableSysAdminViewRepo } = window.sysadmin.pageOptions;
dayjs.extend(relativeTime);

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  onFreezedItem = () => {
    this.setState({ isItemFreezed: true });
  };

  onUnfreezedItem = () => {
    this.setState({ isItemFreezed: false });
  };

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
                <th width="35%">{gettext('Name')}</th>
                <th width="30%">{gettext('Size')}</th>
                <th width="25%">{gettext('Last Update')}</th>
                <th width="5%">{/* Operations */}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => {
                return (<Item
                  key={index}
                  item={item}
                  isItemFreezed={this.state.isItemFreezed}
                  onFreezedItem={this.onFreezedItem}
                  onUnfreezedItem={this.onUnfreezedItem}
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

Content.propTypes = {
  items: PropTypes.array.isRequired,
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  deleteRepo: PropTypes.func.isRequired,
  transferRepo: PropTypes.func.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      highlight: false,
      isDeleteDialogOpen: false,
      isTransferDialogOpen: false
    };
  }

  handleMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: true,
        highlight: true
      });
    }
  };

  handleMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({
        isOpIconShown: false,
        highlight: false
      });
    }
  };

  onUnfreezedItem = () => {
    this.setState({
      highlight: false,
      isOpIconShow: false
    });
    this.props.onUnfreezedItem();
  };

  toggleDeleteDialog = () => {
    this.setState({ isDeleteDialogOpen: !this.state.isDeleteDialogOpen });
  };

  deleteRepo = () => {
    this.props.deleteRepo(this.props.item.id);
  };

  toggleTransferDialog = () => {
    this.setState({ isTransferDialogOpen: !this.state.isTransferDialogOpen });
  };

  transferRepo = (owner, reshare) => {
    this.props.transferRepo(this.props.item.id, owner, reshare);
  };

  renderRepoName = () => {
    const { item } = this.props;
    const repo = item;
    if (repo.name) {
      if (isPro && enableSysAdminViewRepo && !repo.encrypted) {
        return <Link to={`${siteRoot}sys/libraries/${repo.id}/`}>{repo.name}</Link>;
      } else {
        return repo.name;
      }
    } else {
      return gettext('Broken ({repo_id_placeholder})')
        .replace('{repo_id_placeholder}', repo.id);
    }
  };

  translateOperations = (item) => {
    let translateResult = '';
    switch (item) {
      case 'Delete':
        translateResult = gettext('Delete');
        break;
      case 'Transfer':
        translateResult = gettext('Transfer');
        break;
    }

    return translateResult;
  };

  onMenuItemClick = (operation) => {
    switch (operation) {
      case 'Delete':
        this.toggleDeleteDialog();
        break;
      case 'Transfer':
        this.toggleTransferDialog();
        break;
    }
  };

  render() {
    const { item } = this.props;
    const { isOpIconShown, isDeleteDialogOpen, isTransferDialogOpen } = this.state;

    const iconUrl = Utils.getLibIconUrl(item);
    const iconTitle = Utils.getLibIconTitle(item);

    const itemName = '<span class="op-target">' + Utils.HTMLescape(item.name) + '</span>';
    const deleteDialogMsg = gettext('Are you sure you want to delete {placeholder} ?').replace('{placeholder}', itemName);

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.handleMouseEnter} onMouseLeave={this.handleMouseLeave}>
          <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td>{this.renderRepoName()}</td>
          <td>{Utils.bytesToSize(item.size)}</td>
          <td>{dayjs(item.last_modified).fromNow()}</td>
          <td>
            {isOpIconShown &&
            <OpMenu
              operations={['Delete', 'Transfer']}
              translateOperations={this.translateOperations}
              onMenuItemClick={this.onMenuItemClick}
              onFreezedItem={this.props.onFreezedItem}
              onUnfreezedItem={this.onUnfreezedItem}
            />
            }
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
        {isTransferDialogOpen &&
        <TransferDialog
          itemName={item.name}
          onTransferRepo={this.transferRepo}
          canTransferToDept={false}
          toggleDialog={this.toggleTransferDialog}
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
  deleteRepo: PropTypes.func.isRequired,
  transferRepo: PropTypes.func.isRequired,
};

class Repos extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      userInfo: {},
      repoList: []
    };
  }

  componentDidMount() {
    const email = decodeURIComponent(this.props.email);
    systemAdminAPI.sysAdminGetUser(email).then((res) => {
      this.setState({
        userInfo: res.data
      });
    });
    systemAdminAPI.sysAdminListReposByOwner(email).then(res => {
      this.setState({
        loading: false,
        repoList: res.data.repos
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
        return item.id != repoID;
      });
      this.setState({ repoList: newRepoList });
      toaster.success(gettext('Successfully deleted 1 item.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  transferRepo = (repoID, email, reshare) => {
    systemAdminAPI.sysAdminTransferRepo(repoID, email, reshare).then((res) => {
      let newRepoList = this.state.repoList.filter(item => {
        return item.id != repoID;
      });
      this.setState({ repoList: newRepoList });
      let message = gettext('Successfully transferred the library.');
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    return (
      <div className="main-panel-center flex-row h-100">
        <div className="cur-view-container">
          <div className="cur-view-content">
            <Content
              loading={this.state.loading}
              errorMsg={this.state.errorMsg}
              items={this.state.repoList}
              deleteRepo={this.deleteRepo}
              transferRepo={this.transferRepo}
            />
          </div>
        </div>
      </div>
    );
  }
}

Repos.propTypes = {
  email: PropTypes.string,
};

export default Repos;
