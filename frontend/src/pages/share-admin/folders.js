import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { DropdownItem } from 'reactstrap';
import classnames from 'classnames';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { gettext, siteRoot, isPro } from '../../utils/constants';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import toaster from '../../components/toast';
import SharePermissionEditor from '../../components/select-editor/share-permission-editor';
import SharedFolderInfo from '../../models/shared-folder-info';
import PermSelect from '../../components/dialog/perm-select';
import FixedWidthTable from '../../components/common/fixed-width-table';
import MobileItemMenu from '../../components/mobile-item-menu';
import OpIcon from '../../components/op-icon';
import Icon from '../../components/icon';

class Content extends Component {

  sortByName = (e) => {
    e.preventDefault();
    const sortBy = 'name';
    const sortOrder = this.props.sortOrder == 'asc' ? 'desc' : 'asc';
    this.props.sortItems(sortBy, sortOrder);
  };

  render() {
    const { loading, errorMsg, items, sortBy, sortOrder } = this.props;

    if (loading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    }
    if (!items.length) {
      return (
        <EmptyTip
          title={gettext('No folders shared')}
          text={gettext('You have not shared any folders with other users yet. You can share a folder with other users by clicking the share icon to the right of a folder\'s name.')}
        >
        </EmptyTip>
      );
    }

    // sort
    const sortByName = sortBy == 'name';
    const sortIcon = <span className="d-flex justify-content-center align-items-center ml-1"><Icon symbol="down" className={`w-3 h-3 ${sortOrder === 'asc' ? 'rotate-180' : ''}`} /></span>;

    const isDesktop = Utils.isDesktop();

    return (
      <FixedWidthTable
        className={classnames('table-hover', { 'table-thead-hidden': !isDesktop })}
        headers={isDesktop ? [
          { isFixed: true, width: 40 }, // icon
          { isFixed: false, width: 0.25, children: (<a className="d-flex align-items-center table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a>) },
          { isFixed: false, width: 0.25, children: gettext('Library') },
          { isFixed: false, width: 0.2, children: gettext('Share To') },
          { isFixed: false, width: 0.2, children: gettext('Permission') },
          { isFixed: false, width: 0.1 },
        ] : [
          { isFixed: false, width: 0.12 },
          { isFixed: false, width: 0.8 },
          { isFixed: false, width: 0.08 },
        ]}
      >
        {items.map((item, index) => {
          return (<Item key={index} isDesktop={isDesktop} item={item} />);
        })}
      </FixedWidthTable>
    );
  }
}

Content.propTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  sortItems: PropTypes.func.isRequired,
  sortBy: PropTypes.string.isRequired,
  sortOrder: PropTypes.string.isRequired,
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      share_permission: this.props.item.share_permission,
      isHighlighted: false,
      isOpIconShown: false,
      isPermSelectDialogOpen: false, // for mobile
      unshared: false
    };

    this.permissions = ['rw', 'r'];
    if (isPro) {
      this.permissions.push('cloud-edit', 'preview');
    }
  }

  togglePermSelectDialog = () => {
    this.setState({
      isPermSelectDialogOpen: !this.state.isPermSelectDialogOpen
    });
  };

  onMouseEnter = () => {
    this.setState({
      isHighlighted: true,
      isOpIconShown: true
    });
  };

  onMouseLeave = () => {
    this.setState({
      isHighlighted: false,
      isOpIconShown: false
    });
  };

  unshare = () => {
    const item = this.props.item;
    let options = {
      'p': item.path
    };
    if (item.share_type == 'personal') {
      Object.assign(options, {
        'share_type': 'user',
        'username': item.user_email
      });
    } else {
      Object.assign(options, {
        'share_type': item.share_type, // 'group'
        'group_id': item.group_id
      });
    }

    seafileAPI.unshareFolder(item.repo_id, options).then((res) => {
      this.setState({
        unshared: true
      });
      let message = gettext('Successfully unshared {name}').replace('{name}', item.folder_name);
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster(errMessage);
    });
  };

  changePerm = (permission) => {
    const item = this.props.item;
    const postData = {
      'permission': permission
    };
    let options = {
      'p': item.path
    };
    if (item.share_type == 'personal') {
      Object.assign(options, {
        'share_type': 'user',
        'username': item.user_email
      });
    } else {
      Object.assign(options, {
        'share_type': item.share_type, // 'group'
        'group_id': item.group_id
      });
    }

    seafileAPI.updateFolderSharePerm(item.repo_id, postData, options).then((res) => {
      this.setState({ share_permission: permission });
      toaster.success(gettext('Successfully modified permission.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    if (this.state.unshared) {
      return null;
    }

    const item = this.props.item;
    let { share_permission, isOpIconShown, isPermSelectDialogOpen, isHighlighted } = this.state;

    let is_readonly = false;
    if (share_permission == 'r' || share_permission == 'preview') {
      is_readonly = true;
    }
    let iconUrl = Utils.getFolderIconUrl(is_readonly);
    let iconTitle = Utils.getFolderIconTitle({
      'permission': share_permission
    });
    let folderUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}${Utils.encodePath(item.path)}`;
    let repoUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}/`;

    // custom defined permission
    if (share_permission.startsWith('custom-')) {
      share_permission = share_permission.slice(7);
    }

    if (this.props.isDesktop) {
      return (
        <tr
          className={classnames({
            'tr-highlight': isHighlighted
          })}
          onMouseEnter={this.onMouseEnter}
          onMouseLeave={this.onMouseLeave}
          onFocus={this.onMouseEnter}
        >
          <td className="pl10 pr-2"><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
          <td><Link to={folderUrl}>{item.folder_name}</Link></td>
          <td><Link to={repoUrl}>{item.repo_name}</Link></td>
          <td>
            {item.share_type == 'personal' ?
              <span title={item.contact_email}>{item.user_name}</span> : item.group_name}
          </td>
          <td>
            <SharePermissionEditor
              repoID={item.repo_id}
              isTextMode={true}
              autoFocus={true}
              isEditIconShow={this.state.isOpIconShown}
              currentPermission={share_permission}
              permissions={this.permissions}
              onPermissionChanged={this.changePerm}
            />
          </td>
          <td>
            <OpIcon
              className={`op-icon ${isOpIconShown ? '' : 'invisible'}`}
              symbol="x-01"
              title={gettext('Unshare')}
              op={this.unshare}
            />
          </td>
        </tr>
      );
    } else {
      return (
        <Fragment>
          <tr>
            <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
            <td>
              <Link to={folderUrl}>{item.folder_name}</Link>
              <span className="item-meta-info-highlighted">{Utils.sharePerms(share_permission)}</span>
              <br />
              <span className="item-meta-info">{`${gettext('Share To:')} ${item.share_type == 'personal' ? item.user_name : item.group_name}`}</span>
            </td>
            <td>
              <MobileItemMenu>
                <DropdownItem className="mobile-menu-item" onClick={this.togglePermSelectDialog}>{gettext('Permission')}</DropdownItem>
                <DropdownItem className="mobile-menu-item" onClick={this.unshare}>{gettext('Unshare')}</DropdownItem>
              </MobileItemMenu>
            </td>
          </tr>
          {isPermSelectDialogOpen && (
            <PermSelect
              repoID={item.repo_id}
              currentPerm={share_permission}
              permissions={this.permissions}
              changePerm={this.changePerm}
              toggleDialog={this.togglePermSelectDialog}
            />
          )}
        </Fragment>
      );
    }
  }
}

Item.propTypes = {
  item: PropTypes.object.isRequired,
  isDesktop: PropTypes.bool.isRequired,
};

class ShareAdminFolders extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      sortBy: 'name',
      sortOrder: 'asc' // 'asc' or 'desc'
    };
  }

  _sortItems = (items, sortBy, sortOrder) => {
    let comparator;

    switch (`${sortBy}-${sortOrder}`) {
      case 'name-asc':
        comparator = function (a, b) {
          var result = Utils.compareTwoWord(a.folder_name, b.folder_name);
          return result;
        };
        break;
      case 'name-desc':
        comparator = function (a, b) {
          var result = Utils.compareTwoWord(a.folder_name, b.folder_name);
          return -result;
        };
        break;
    }

    items.sort(comparator);
    return items;
  };

  sortItems = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: this._sortItems(this.state.items, sortBy, sortOrder)
    });
  };

  componentDidMount() {
    seafileAPI.listSharedFolders().then((res) => {
      let items = res.data.map(item => {
        return new SharedFolderInfo(item);
      });
      this.setState({
        loading: false,
        items: this._sortItems(items, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="share-admin-libs">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('Folders')}</h3>
          </div>
          <div className="cur-view-content">
            <Content
              errorMsg={this.state.errorMsg}
              loading={this.state.loading}
              items={this.state.items}
              sortBy={this.state.sortBy}
              sortOrder={this.state.sortOrder}
              sortItems={this.sortItems}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminFolders;
