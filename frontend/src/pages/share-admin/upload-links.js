import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import dayjs from 'dayjs';
import { DropdownItem } from 'reactstrap';
import classnames from 'classnames';
import { gettext, siteRoot, canGenerateShareLink } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { repoShareAdminAPI } from '../../utils/repo-share-admin-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import UploadLink from '../../models/upload-link';
import ShareAdminLink from '../../components/dialog/share-admin-link';
import CommonOperationConfirmationDialog from '../../components/dialog/common-operation-confirmation-dialog';
import SingleDropdownToolbar from '../../components/toolbar/single-dropdown-toolbar';
import FixedWidthTable from '../../components/common/fixed-width-table';
import MobileItemMenu from '../../components/mobile-item-menu';

import '../../css/share-admin-links.css';

const contentPropTypes = {
  loading: PropTypes.bool.isRequired,
  errorMsg: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  toggleSelectAllLinks: PropTypes.func.isRequired,
  toggleSelectLink: PropTypes.func.isRequired,
  onRemoveLink: PropTypes.func.isRequired
};

class Content extends Component {

  toggleSelectAllLinks = (e) => {
    this.props.toggleSelectAllLinks(e.target.checked);
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
          title={gettext('No upload links')}
          text={gettext('You have not created any upload links yet. An upload link allows anyone to upload files to a folder or library. You can create an upload link for a folder or library by clicking the share icon to the right of its name.')}
        />
      );
    }

    const selectedItems = items.filter(item => item.isSelected);
    const isAllLinksSelected = selectedItems.length == items.length;

    const isDesktop = Utils.isDesktop();
    return (
      <FixedWidthTable
        className={classnames('table-hover', { 'table-thead-hidden': !isDesktop })}
        headers={isDesktop ? [
          {
            isFixed: true,
            width: 30,
            className: 'text-center',
            children: (<input type="checkbox" checked={isAllLinksSelected} className="vam" onChange={this.toggleSelectAllLinks} />)
          }, // checkbox
          { isFixed: true, width: 40 }, // icon
          { isFixed: false, width: 0.33, children: gettext('Name') },
          { isFixed: false, width: 0.25, children: gettext('Library') },
          { isFixed: false, width: 0.16, children: gettext('Visits') },
          { isFixed: false, width: 0.16, children: gettext('Expiration') },
          { isFixed: false, width: 0.1 }, // Operations
        ] : [
          { isFixed: false, width: 0.12 },
          { isFixed: false, width: 0.8 },
          { isFixed: false, width: 0.08 },
        ]}
      >
        {items.map((item, index) => {
          return (<Item key={index} isDesktop={isDesktop} item={item} onRemoveLink={this.props.onRemoveLink} toggleSelectLink={this.props.toggleSelectLink} />);
        })}
      </FixedWidthTable>
    );
  }
}

Content.propTypes = contentPropTypes;

const itemPropTypes = {
  isDesktop: PropTypes.bool.isRequired,
  item: PropTypes.object.isRequired,
  onRemoveLink: PropTypes.func.isRequired,
  toggleSelectLink: PropTypes.func.isRequired
};

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
      isOpIconShown: false,
      isLinkDialogOpen: false
    };
  }

  toggleLinkDialog = () => {
    this.setState({
      isLinkDialogOpen: !this.state.isLinkDialogOpen
    });
  };

  handleMouseOver = () => {
    this.setState({
      highlight: true,
      isOpIconShown: true
    });
  };

  handleMouseOut = () => {
    this.setState({
      highlight: false,
      isOpIconShown: false
    });
  };

  viewLink = () => {
    this.toggleLinkDialog();
  };

  removeLink = () => {
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

  onCheckboxClicked = (e) => {
    e.stopPropagation();
  };

  toggleSelectLink = (e) => {
    const { item } = this.props;
    this.props.toggleSelectLink(item, e.target.checked);
  };

  render() {
    const { item } = this.props;
    const { isSelected = false } = item;
    const { highlight, isOpIconShown, isLinkDialogOpen } = this.state;

    const iconUrl = Utils.getFolderIconUrl(false);
    const repoUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}`;
    const objUrl = `${repoUrl}${Utils.encodePath(item.path)}`;

    return (
      <Fragment>
        {this.props.isDesktop ?
          <tr
            className={classnames({
              'tr-highlight': highlight,
              'tr-active': isSelected
            })}
            onMouseOver={this.handleMouseOver}
            onMouseOut={this.handleMouseOut}
            onFocus={this.handleMouseOver}
          >
            <td className="text-center">
              <input
                type="checkbox"
                checked={isSelected}
                className="vam"
                onClick={this.onCheckboxClicked}
                onChange={this.toggleSelectLink}
              />
            </td>
            <td className="pl-2 pr-2"><img src={iconUrl} alt="" width="24" /></td>
            <td>
              <Link to={objUrl}>{item.obj_name}</Link>
              {item.obj_id === '' ? <span style={{ color: 'red' }}>{gettext('(deleted)')}</span> : null}
            </td>
            <td><Link to={repoUrl}>{item.repo_name}</Link></td>
            <td>{item.view_cnt}</td>
            <td>{this.renderExpiration()}</td>
            <td>
              <div className="d-flex align-items-center">
                {!item.is_expired &&
                <i
                  role="button"
                  className={`sf2-icon-link op-icon ${isOpIconShown ? '' : 'invisible'}`}
                  title={gettext('View')}
                  aria-label={gettext('View')}
                  onClick={this.viewLink}
                >
                </i>
                }
                <i
                  role="button"
                  className={`sf3-font-delete1 sf3-font op-icon ${isOpIconShown ? '' : 'invisible'}`}
                  title={gettext('Remove')}
                  aria-label={gettext('Remove')}
                  onClick={this.removeLink}
                >
                </i>
              </div>
            </td>
          </tr>
          :
          <tr>
            <td><img src={iconUrl} alt="" width="24" /></td>
            <td>
              <Link to={objUrl}>{item.obj_name}</Link>
              <br />
              <span>{item.repo_name}</span><br />
              <span className="item-meta-info">{gettext('Visits')}: {item.view_cnt}</span>
              <span className="item-meta-info">{gettext('Expiration')}: {this.renderExpiration()}</span>
            </td>
            <td>
              <MobileItemMenu>
                {!item.is_expired &&
                  <DropdownItem className="mobile-menu-item" onClick={this.viewLink}>{gettext('View')}</DropdownItem>
                }
                <DropdownItem className="mobile-menu-item" onClick={this.removeLink}>{gettext('Remove')}</DropdownItem>
              </MobileItemMenu>
            </td>
          </tr>
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

class ShareAdminUploadLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: [],
      isCleanInvalidUploadLinksDialogOpen: false,
      isDeleteLinksDialogOpen: false
    };
  }

  componentDidMount() {
    this.listUserUploadLinks();
  }

  listUserUploadLinks() {
    seafileAPI.listUserUploadLinks().then((res) => {
      let items = res.data.map(item => {
        return new UploadLink(item);
      });
      this.setState({
        loading: false,
        items: items
      });
    }).catch((error) => {
      this.setState({
        loading: false,
        errorMsg: Utils.getErrorMsg(error, true) // true: show login tip if 403
      });
    });
  }

  onRemoveLink = (item) => {
    seafileAPI.deleteUploadLink(item.token).then(() => {
      let items = this.state.items.filter(uploadItem => {
        return uploadItem.token !== item.token;
      });
      this.setState({ items: items });
      const message = gettext('Successfully deleted 1 item.');
      toaster.success(message);
    }).catch((error) => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleCleanInvalidUploadLinksDialog = () => {
    this.setState({ isCleanInvalidUploadLinksDialogOpen: !this.state.isCleanInvalidUploadLinksDialogOpen });
  };

  cleanInvalidUploadLinks = () => {
    seafileAPI.cleanInvalidUploadLinks().then(res => {
      const newItems = this.state.items.filter(item => item.obj_id !== '').filter(item => !item.is_expired);
      this.setState({ items: newItems });
      toaster.success(gettext('Successfully cleaned invalid upload links.'));
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  toggleDeleteLinksDialog = () => {
    this.setState({ isDeleteLinksDialogOpen: !this.state.isDeleteLinksDialogOpen });
  };

  cancelSelectAllLinks = () => {
    this.toggleSelectAllLinks(false);
  };

  toggleSelectAllLinks = (isSelected) => {
    const { items: links } = this.state;
    this.setState({
      items: links.map(item => {
        item.isSelected = isSelected;
        return item;
      })
    });
  };

  toggleSelectLink = (link, isSelected) => {
    const { items: links } = this.state;
    this.setState({
      items: links.map(item => {
        if (item.token == link.token) {
          item.isSelected = isSelected;
        }
        return item;
      })
    });
  };

  deleteLinks = () => {
    const { items } = this.state;
    const tokens = items.filter(item => item.isSelected).map(link => link.token);
    repoShareAdminAPI.deleteUploadLinks(tokens).then(res => {
      const { success, failed } = res.data;
      if (success.length) {
        let newItems = items.filter(item => {
          return !success.some(deletedItem => {
            return deletedItem.token == item.token;
          });
        });
        this.setState({
          items: newItems
        });
        const length = success.length;
        const msg = length == 1 ?
          gettext('Successfully deleted 1 upload link') :
          gettext('Successfully deleted {number_placeholder} upload links')
            .replace('{number_placeholder}', length);
        toaster.success(msg);
      }
      failed.forEach(item => {
        const msg = `${item.token}: ${item.error_msg}`;
        toaster.danger(msg);
      });
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  render() {
    const { items } = this.state;
    const selectedLinksLen = items.filter(item => item.isSelected).length;
    return (
      <Fragment>
        <div className="main-panel-center">
          <div className="cur-view-container">
            <div className={classnames('cur-view-path share-upload-nav', { 'o-hidden': selectedLinksLen > 0 })}>
              {selectedLinksLen > 0
                ? (
                  <div className="selected-items-toolbar">
                    <span className="cur-view-path-btn px-1" onClick={this.cancelSelectAllLinks}>
                      <span className="sf3-font-x-01 sf3-font mr-2" aria-label={gettext('Unselect')} title={gettext('Unselect')}></span>
                      <span>{`${selectedLinksLen} ${gettext('selected')}`}</span>
                    </span>
                    <span className="cur-view-path-btn ml-4" onClick={this.toggleDeleteLinksDialog}>
                      <span className="sf3-font-delete1 sf3-font" aria-label={gettext('Delete')} title={gettext('Delete')}></span>
                    </span>
                  </div>
                )
                : (
                  <ul className="nav">
                    {canGenerateShareLink && (
                      <li className="nav-item"><Link to={`${siteRoot}share-admin-share-links/`} className="nav-link">{gettext('Share Links')}</Link></li>
                    )}
                    <li className="nav-item">
                      <Link to={`${siteRoot}share-admin-upload-links/`} className="nav-link active">
                        {gettext('Upload Links')}
                        <SingleDropdownToolbar
                          opList={[{ 'text': gettext('Clean invalid upload links'), 'onClick': this.toggleCleanInvalidUploadLinksDialog }]}
                        />
                      </Link>
                    </li>
                  </ul>
                )
              }
            </div>
            <div className="cur-view-content">
              <Content
                loading={this.state.loading}
                errorMsg={this.state.errorMsg}
                items={this.state.items}
                onRemoveLink={this.onRemoveLink}
                toggleSelectAllLinks={this.toggleSelectAllLinks}
                toggleSelectLink={this.toggleSelectLink}
              />
            </div>
          </div>
        </div>
        {this.state.isCleanInvalidUploadLinksDialogOpen &&
        <CommonOperationConfirmationDialog
          title={gettext('Clean invalid upload links')}
          message={gettext('Are you sure you want to clean invalid upload links?')}
          executeOperation={this.cleanInvalidUploadLinks}
          confirmBtnText={gettext('Clean')}
          toggleDialog={this.toggleCleanInvalidUploadLinksDialog}
        />
        }
        {this.state.isDeleteLinksDialogOpen && (
          <CommonOperationConfirmationDialog
            title={gettext('Delete upload links')}
            message={gettext('Are you sure you want to delete the selected upload link(s) ?')}
            executeOperation={this.deleteLinks}
            confirmBtnText={gettext('Delete')}
            toggleDialog={this.toggleDeleteLinksDialog}
          />
        )}
      </Fragment>
    );
  }
}

export default ShareAdminUploadLinks;
