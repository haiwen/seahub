import React, { Fragment, Component } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import { DropdownItem } from 'reactstrap';
import classnames from 'classnames';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, siteRoot, isPro } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';
import SharePermissionEditor from '../../components/select-editor/share-permission-editor';
import SharedRepoInfo from '../../models/shared-repo-info';
import PermSelect from '../../components/dialog/perm-select';
import FixedWidthTable from '../../components/common/fixed-width-table';
import MobileItemMenu from '../../components/mobile-item-menu';

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
      return <span className="loading-icon loading-tip"></span>;
    }
    if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    }

    if (!items.length) {
      return (
        <EmptyTip
          title={gettext('No libraries shared')}
          text={gettext('You have not shared any libraries with other users yet. You can share a library with other users by clicking the share icon to the right of a library\'s name in "My Libraries".')}
        >
        </EmptyTip>
      );
    }

    // sort
    const sortByName = sortBy == 'name';
    const sortIcon = sortOrder == 'asc' ? <span className="sf3-font sf3-font-down rotate-180 d-inline-block"></span> : <span className="sf3-font sf3-font-down"></span>;

    const isDesktop = Utils.isDesktop();
    return (
      <FixedWidthTable
        className={classnames('table-hover', { 'table-thead-hidden': !isDesktop })}
        headers={isDesktop ? [
          { isFixed: true, width: 40 },
          { isFixed: false, width: 0.35, children: (<a className="d-block table-sort-op" href="#" onClick={this.sortByName}>{gettext('Name')} {sortByName && sortIcon}</a>) },
          { isFixed: false, width: 0.3, children: gettext('Share To') },
          { isFixed: false, width: 0.25, children: gettext('Permission') },
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

    let item = this.props.item;
    this.state = {
      share_permission: item.share_permission,
      share_permission_name: item.share_permission_name,
      is_admin: item.is_admin,
      isHighlighted: false,
      isOpIconShown: false,
      isPermSelectDialogOpen: false, // for mobile
      unshared: false,
    };
    let permissions = ['rw', 'r'];
    this.permissions = permissions;
    this.showAdmin = isPro && (item.share_type !== 'public');
    if (this.showAdmin) {
      permissions.push('admin');
    }
    if (isPro) {
      permissions.push('cloud-edit', 'preview');
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

  changePerm = (permission) => {
    const item = this.props.item;
    const share_type = item.share_type;
    let options = {
      'share_type': share_type,
      'permission': permission
    };
    if (share_type == 'personal') {
      options.user = item.user_email;
    } else if (share_type == 'group') {
      options.group_id = item.group_id;
    }

    seafileAPI.updateRepoSharePerm(item.repo_id, options).then(() => {
      this.setState({
        share_permission: permission == 'admin' ? 'rw' : permission,
        is_admin: permission == 'admin',
      });
      toaster.success(gettext('Successfully modified permission.'));
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  unshare = () => {
    const item = this.props.item;
    const share_type = item.share_type;
    let options = {
      'share_type': share_type
    };
    if (share_type == 'personal') {
      options.user = item.user_email;
    } else if (share_type == 'group') {
      options.group_id = item.group_id;
    }

    seafileAPI.unshareRepo(item.repo_id, options).then((res) => {
      this.setState({
        unshared: true
      });
      let message = gettext('Successfully unshared {name}').replace('{name}', item.repo_name);
      toaster.success(message);
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster(errMessage);
    });
  };

  render() {
    if (this.state.unshared) {
      return null;
    }

    let { share_permission, is_admin, isOpIconShown, isPermSelectDialogOpen, isHighlighted } = this.state;
    let item = this.props.item;
    Object.assign(item, {
      share_permission: share_permission,
      is_admin: is_admin
    });

    let iconUrl = Utils.getLibIconUrl(item);
    let iconTitle = Utils.getLibIconTitle(item);
    let repoUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}/`;


    let shareTo;
    const shareType = item.share_type;
    if (shareType == 'personal') {
      shareTo = item.user_name;
    } else if (shareType == 'group') {
      shareTo = item.group_name;
    } else if (shareType == 'public') {
      shareTo = gettext('all members');
    }

    if (this.showAdmin && is_admin) {
      share_permission = 'admin';
    }

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
          <td><Link to={repoUrl}>{item.repo_name}</Link></td>
          <td>
            {item.share_type == 'personal' ? <span title={item.contact_email}>{shareTo}</span> : shareTo}
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
            <i
              role="button"
              aria-label={gettext('Unshare')}
              className={`sf3-font sf3-font-x-01 op-icon ${isOpIconShown ? '' : 'invisible'}`}
              title={gettext('Unshare')}
              onClick={this.unshare}
            >
            </i>
          </td>
        </tr>
      );
    } else {
      return (
        <Fragment>
          <tr>
            <td><img src={iconUrl} title={iconTitle} alt={iconTitle} width="24" /></td>
            <td>
              <Link to={repoUrl}>{item.repo_name}</Link>
              <span className="item-meta-info-highlighted">{Utils.sharePerms(share_permission)}</span>
              <br />
              <span className="item-meta-info">{`${gettext('Share To:')} ${shareTo}`}</span>
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

class ShareAdminLibraries extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      sortBy: 'name', // 'name' or 'time'
      sortOrder: 'asc' // 'asc' or 'desc'
    };
  }

  componentDidMount() {
    seafileAPI.listSharedRepos().then((res) => {
      let items = res.data.map(item => {
        return new SharedRepoInfo(item);
      });
      this.setState({
        loading: false,
        items: Utils.sortRepos(items, this.state.sortBy, this.state.sortOrder)
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  sortItems = (sortBy, sortOrder) => {
    this.setState({
      sortBy: sortBy,
      sortOrder: sortOrder,
      items: Utils.sortRepos(this.state.items, sortBy, sortOrder)
    });
  };

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container" id="share-admin-libs">
          <div className="cur-view-path">
            <h3 className="sf-heading">{gettext('Libraries')}</h3>
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

export default ShareAdminLibraries;
