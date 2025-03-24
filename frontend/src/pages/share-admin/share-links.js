import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import classnames from 'classnames';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import { isPro, gettext, siteRoot, canGenerateUploadLink } from '../../utils/constants';
import ShareLink from '../../models/share-link';
import Loading from '../../components/loading';
import toaster from '../../components/toast';
import EmptyTip from '../../components/empty-tip';
import ShareLinkPermissionSelect from '../../components/dialog/share-link-permission-select';
import ShareAdminLink from '../../components/dialog/share-admin-link';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';
import Selector from '../../components/single-selector';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import FixedWidthTable from '../../components/common/fixed-width-table';

const contentPropTypes = {
  loading: PropTypes.bool.isRequired,
  isLoadingMore: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  onRemoveLink: PropTypes.func.isRequired
};

class Content extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemFreezed: false
    };
  }

  toggleItemFreezed = (isFreezed) => {
    this.setState({ isItemFreezed: isFreezed });
  };

  render() {
    const { loading, errorMsg, items } = this.props;

    if (loading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    }
    if (!items.length) {
      return (
        <EmptyTip
          title={gettext('No share links')}
          text={gettext('You have not created any share links yet. A share link can be used to share files and folders with anyone. You can create a share link for a file or folder by clicking the share icon to the right of its name.')}
        />
      );
    }

    const isDesktop = Utils.isDesktop();
    // only for some columns
    const columnWidths = isPro ? [0.14, 0.07, 0.14] : [0.21, 0.14, 0.2];

    return (
      <>
        <FixedWidthTable
          className={classnames('', { 'table-thead-hidden': !isDesktop })}
          headers={isDesktop ? [
            { isFixed: true, width: 40 }, // icon
            { isFixed: false, width: 0.35, children: gettext('Name') },
            { isFixed: false, width: columnWidths[0], children: gettext('Library') },
            isPro ? { isFixed: false, width: 0.2, children: gettext('Permission') } : null,
            { isFixed: false, width: columnWidths[1], children: gettext('Visits') },
            { isFixed: false, width: columnWidths[2], children: gettext('Expiration') },
            { isFixed: false, width: 0.1 }, // operations
          ].filter(i => i) : [
            { isFixed: false, width: 0.12 },
            { isFixed: false, width: 0.8 },
            { isFixed: false, width: 0.08 },
          ]}
        >
          {items.map((item, index) => {
            return (<Item
              key={index}
              isDesktop={isDesktop}
              item={item}
              onRemoveLink={this.props.onRemoveLink}
              isItemFreezed={this.state.isItemFreezed}
              toggleItemFreezed={this.toggleItemFreezed}
            />);
          })}
        </FixedWidthTable>
        {this.props.isLoadingMore && <div className="flex-shrink-0"><Loading /></div>}
      </>
    );
  }
}

Content.propTypes = contentPropTypes;

const itemPropTypes = {
  item: PropTypes.object.isRequired,
  isDesktop: PropTypes.bool.isRequired,
  onRemoveLink: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  toggleItemFreezed: PropTypes.func.isRequired
};

class Item extends Component {

  constructor(props) {
    super(props);

    this.state = {
      highlight: false,
      isOpIconShown: false,
      isOpMenuOpen: false, // for mobile
      isPermSelectDialogOpen: false, // for mobile
      isLinkDialogOpen: false,
      permissionOptions: [],
      currentPermission: '',
    };
  }

  componentDidMount() {
    if (isPro) {
      this.updatePermissionOptions();
    }
  }

  updatePermissionOptions = () => {
    const item = this.props.item;
    let itemType = item.is_dir ? (item.path === '/' ? 'library' : 'dir') : 'file';
    let permission = item.repo_folder_permission;
    let permissionOptions = Utils.getShareLinkPermissionList(itemType, permission, item.path, item.can_edit);
    let currentPermission = Utils.getShareLinkPermissionStr(this.props.item.permissions);
    this.setState({
      permissionOptions: permissionOptions,
      currentPermission: currentPermission
    });
  };

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  };

  togglePermSelectDialog = () => {
    this.setState({
      isPermSelectDialogOpen: !this.state.isPermSelectDialogOpen
    });
  };

  toggleLinkDialog = () => {
    this.setState({
      isLinkDialogOpen: !this.state.isLinkDialogOpen
    });
  };

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

  viewLink = (e) => {
    e.preventDefault();
    this.toggleLinkDialog();
  };

  removeLink = (e) => {
    e.preventDefault();
    this.props.onRemoveLink(this.props.item);
  };

  renderExpiration = () => {
    const item = this.props.item;
    if (!item.expire_date) {
      return '--';
    }
    const expire_date = dayjs(item.expire_date).format('YYYY-MM-DD');
    const expire_time = dayjs(item.expire_date).format('YYYY-MM-DD HH:mm:ss');
    return (<span className={item.is_expired ? 'error' : ''} title={expire_time}>{expire_date}</span>);
  };

  // for 'selector' in desktop
  changePermission = (permOption) => {
    this.changePerm(permOption.value);
  };

  changePerm = (permission) => {
    const item = this.props.item;
    const permissionDetails = Utils.getShareLinkPermissionObject(permission).permissionDetails;
    seafileAPI.updateShareLink(item.token, JSON.stringify(permissionDetails)).then(() => {
      this.setState({
        currentPermission: permission
      });
      let message = gettext('Successfully modified permission.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const item = this.props.item;
    const { currentPermission, permissionOptions, isOpIconShown, isPermSelectDialogOpen, isLinkDialogOpen } = this.state;
    this.permOptions = permissionOptions.map(item => {
      return {
        value: item,
        text: Utils.getShareLinkPermissionObject(item).text,
        isSelected: item == currentPermission
      };
    });
    const currentSelectedPermOption = this.permOptions.filter(item => item.isSelected)[0] || {};

    let iconUrl; let objUrl;
    if (item.is_dir) {
      let path = item.path === '/' ? '/' : item.path.slice(0, item.path.length - 1);
      iconUrl = Utils.getFolderIconUrl(false);
      objUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}${Utils.encodePath(path)}`;
    } else {
      iconUrl = Utils.getFileIconUrl(item.obj_name);
      objUrl = `${siteRoot}lib/${item.repo_id}/file${Utils.encodePath(item.path)}`;
    }

    return (
      <Fragment>
        {this.props.isDesktop ?
          <tr
            className={this.state.highlight ? 'tr-highlight' : ''}
            onMouseEnter={this.handleMouseEnter}
            onMouseLeave={this.handleMouseLeave}
            onFocus={this.handleMouseEnter}
          >
            <td className="pl-2 pr-2"><img src={iconUrl} width="24" alt="" /></td>
            <td>
              {item.is_dir ?
                <Link to={objUrl}>{item.obj_name}</Link> :
                <a href={objUrl} target="_blank" rel="noreferrer">{item.obj_name}</a>
              }
              {item.obj_id === '' ? <span style={{ color: 'red' }}>{gettext('(deleted)')}</span> : null}
            </td>
            <td>
              <Link to={`${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}/`}>{item.repo_name}</Link>
            </td>
            {isPro &&
              <td>
                <Selector
                  isDropdownToggleShown={isOpIconShown && !item.is_expired}
                  currentSelectedOption={currentSelectedPermOption}
                  options={this.permOptions}
                  selectOption={this.changePermission}
                  toggleItemFreezed={this.props.toggleItemFreezed}
                />
              </td>
            }
            <td>{item.view_cnt}</td>
            <td>{this.renderExpiration()}</td>
            <td>
              {!item.is_expired &&
                <a
                  href="#"
                  className={`sf2-icon-link action-icon op-icon ${isOpIconShown ? '' : 'invisible'}`}
                  title={gettext('View')}
                  aria-label={gettext('View')}
                  role="button"
                  onClick={this.viewLink}
                >
                </a>
              }
              <a
                href="#"
                className={`sf3-font-delete1 sf3-font action-icon op-icon ${isOpIconShown ? '' : 'invisible'}`}
                title={gettext('Remove')}
                aria-label={gettext('Remove')}
                role="button"
                onClick={this.removeLink}
              >
              </a>
            </td>
          </tr>
          :
          <Fragment>
            <tr>
              <td><img src={iconUrl} alt="" width="24" /></td>
              <td>
                {item.is_dir ?
                  <Link to={objUrl}>{item.obj_name}</Link> :
                  <a href={objUrl} target="_blank" rel="noreferrer">{item.obj_name}</a>
                }
                {isPro && <span className="item-meta-info-highlighted">{Utils.getShareLinkPermissionObject(currentPermission).text}</span>}
                <br />
                <span>{item.repo_name}</span><br />
                <span className="item-meta-info">{gettext('Visits')}: {item.view_cnt}</span>
                <span className="item-meta-info">{gettext('Expiration')}: {this.renderExpiration()}</span>
              </td>
              <td>
                <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
                  <DropdownToggle
                    tag="i"
                    className="sf-dropdown-toggle sf3-font sf3-font-more-vertical ml-0"
                    title={gettext('More operations')}
                    aria-label={gettext('More operations')}
                    data-toggle="dropdown"
                    aria-expanded={this.state.isOpMenuOpen}
                  />
                  <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
                    <div className="mobile-operation-menu-bg-layer"></div>
                    <div className="mobile-operation-menu">
                      {(isPro && !item.is_expired) && <DropdownItem className="mobile-menu-item" onClick={this.togglePermSelectDialog}>{gettext('Permission')}</DropdownItem>}
                      {!item.is_expired && <DropdownItem className="mobile-menu-item" onClick={this.viewLink}>{gettext('View')}</DropdownItem>}
                      <DropdownItem className="mobile-menu-item" onClick={this.removeLink}>{gettext('Remove')}</DropdownItem>
                    </div>
                  </div>
                </Dropdown>
              </td>
            </tr>
            {isPermSelectDialogOpen &&
            <ShareLinkPermissionSelect
              currentPerm={currentPermission}
              permissions={permissionOptions}
              changePerm={this.changePerm}
              toggleDialog={this.togglePermSelectDialog}
            />
            }
          </Fragment>
        }
        {isLinkDialogOpen &&
        <ShareAdminLink
          link={item.link}
          toggleDialog={this.toggleLinkDialog}
        />
        }
      </Fragment>
    );
  }
}

Item.propTypes = itemPropTypes;

const PER_PAGE = 25;

class ShareAdminShareLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isCleanInvalidShareLinksDialogOpen: false,
      loading: true,
      hasMore: false,
      isLoadingMore: false,
      page: 1,
      errorMsg: '',
      items: [],
    };
  }

  componentDidMount() {
    this.listUserShareLinks();
  }

  listUserShareLinks() {
    const { page } = this.state;
    seafileAPI.listShareLinks({ page }).then((res) => {
      let items = res.data.map(item => {
        return new ShareLink(item);
      });
      this.setState({
        loading: false,
        hasMore: res.data.length == PER_PAGE,
        items,
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  handleScroll = (event) => {
    if (!this.state.isLoadingMore && this.state.hasMore) {
      const clientHeight = event.target.clientHeight;
      const scrollHeight = event.target.scrollHeight;
      const scrollTop = event.target.scrollTop;
      const isBottom = (clientHeight + scrollTop + 1 >= scrollHeight);
      if (isBottom) { // scroll to the bottom
        this.setState({ isLoadingMore: true }, () => {
          this.getMore();
        });
      }
    }
  };

  getMore = () => {
    const { page } = this.state;
    seafileAPI.listShareLinks({ page: page + 1 }).then((res) => {
      let moreItems = res.data.map(item => {
        return new ShareLink(item);
      });
      this.setState({
        isLoadingMore: false,
        hasMore: res.data.length == PER_PAGE,
        page: page + 1,
        items: this.state.items.concat(moreItems),
      });
    }).catch((error) => {
      this.setState({
        isLoadingMore: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  };

  onRemoveLink = (item) => {
    seafileAPI.deleteShareLink(item.token).then(() => {
      let items = this.state.items.filter(uploadItem => {
        return uploadItem.token !== item.token;
      });
      this.setState({ items: items });
      let message = gettext('Successfully deleted 1 item.');
      toaster.success(message);
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleCleanInvalidShareLinksDialog = () => {
    this.setState({ isCleanInvalidShareLinksDialogOpen: !this.state.isCleanInvalidShareLinksDialogOpen });
  };

  cleanInvalidShareLinks = () => {
    seafileAPI.cleanInvalidShareLinks().then(res => {
      const newItems = this.state.items.filter(item => item.obj_id !== '').filter(item => !item.is_expired);
      this.setState({ items: newItems });
      toaster.success(gettext('Successfully cleaned invalid share links.'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className="cur-view-path share-upload-nav">
              <ul className="nav">
                <li className="nav-item">
                  <Link to={`${siteRoot}share-admin-share-links/`} className="nav-link active">
                    {gettext('Share Links')}
                    <SingleDropdownToolbar
                      opList={[{ 'text': gettext('Clean invalid share links'), 'onClick': this.toggleCleanInvalidShareLinksDialog }]}
                    />
                  </Link>
                </li>
                {canGenerateUploadLink && (
                  <li className="nav-item"><Link to={`${siteRoot}share-admin-upload-links/`} className="nav-link">{gettext('Upload Links')}</Link></li>
                )}
              </ul>
            </div>
            <div className="cur-view-content" onScroll={this.handleScroll}>
              <Content
                loading={this.state.loading}
                isLoadingMore={this.state.isLoadingMore}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
                onRemoveLink={this.onRemoveLink}
              />
            </div>
          </div>
        </div>
        {this.state.isCleanInvalidShareLinksDialogOpen &&
          <CommonOperationConfirmationDialog
            title={gettext('Clean invalid share links')}
            message={gettext('Are you sure you want to clean invalid share links?')}
            executeOperation={this.cleanInvalidShareLinks}
            confirmBtnText={gettext('Clean')}
            toggleDialog={this.toggleCleanInvalidShareLinksDialog}
          />
        }
      </Fragment>
    );
  }
}

export default ShareAdminShareLinks;
