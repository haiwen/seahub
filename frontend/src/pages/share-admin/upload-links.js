import React, { Component, Fragment } from 'react';
import { Link } from '@reach/router';
import moment from 'moment';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, siteRoot, canGenerateShareLink } from '../../utils/constants';
import { seafileAPI } from '../../utils/seafile-api';
import { Utils } from '../../utils/utils';
import toaster from '../../components/toast';
import Loading from '../../components/loading';
import EmptyTip from '../../components/empty-tip';
import UploadLink from '../../models/upload-link';
import ShareAdminLink from '../../components/dialog/share-admin-link';

class Content extends Component {

  render() {
    const { loading, errorMsg, items } = this.props;

    if (loading) {
      return <Loading />;
    }
    if (errorMsg) {
      return <p className="error text-center">{errorMsg}</p>;
    }

    const emptyTip = (
      <EmptyTip>
        <h2>{gettext('No upload links')}</h2>
        <p>{gettext('You have not created any upload links yet. An upload link allows anyone to upload files to a folder or library. You can create an upload link for a folder or library by clicking the share icon to the right of its name.')}</p>
      </EmptyTip>
    );

    const isDesktop = Utils.isDesktop();
    const table = (
      <table className={`table-hover ${isDesktop ? '': 'table-thead-hidden'}`}>
        <thead>
          {isDesktop ? (
            <tr>
              <th width="4%">{/*icon*/}</th>
              <th width="30%">{gettext('Name')}</th>
              <th width="24%">{gettext('Library')}</th>
              <th width="16%">{gettext('Visits')}</th>
              <th width="16%">{gettext('Expiration')}</th>
              <th width="10%">{/*Operations*/}</th>
            </tr>
          ) : (
            <tr>
              <th width="12%"></th>
              <th width="80%"></th>
              <th width="8%"></th>
            </tr>
          )}
        </thead>
        <tbody>
          {items.map((item, index) => {
            return (<Item key={index} isDesktop={isDesktop} item={item} onRemoveLink={this.props.onRemoveLink}/>);
          })}
        </tbody>
      </table>
    );

    return items.length ? table : emptyTip;
  }
}

class Item extends Component {

  constructor(props) {
    super(props);
    this.state = {
      isOpIconShown: false,
      isOpMenuOpen: false, // for mobile
      isLinkDialogOpen: false
    };
  }

 toggleOpMenu = () => {
   this.setState({
     isOpMenuOpen: !this.state.isOpMenuOpen
   });
 }

  toggleLinkDialog = () => {
    this.setState({
      isLinkDialogOpen: !this.state.isLinkDialogOpen
    });
  }

  handleMouseOver = () => {
    this.setState({isOpIconShown: true});
  }

  handleMouseOut = () => {
    this.setState({isOpIconShown: false});
  }

  viewLink = (e) => {
    e.preventDefault();
    this.toggleLinkDialog();
  }

  removeLink = (e) => {
    e.preventDefault();
    this.props.onRemoveLink(this.props.item);
  }

  renderExpiration = () => {
    const item = this.props.item;
    if (!item.expire_date) {
      return '--';
    }
    const expire_date = moment(item.expire_date).format('YYYY-MM-DD');
    const expire_time = moment(item.expire_date).format('YYYY-MM-DD HH:mm:ss');
    return (<span className={item.is_expired ? 'error' : ''} title={expire_time}>{expire_date}</span>);
  }

  render() {
    let item = this.props.item;
    const { isOpIconShown, isLinkDialogOpen } = this.state;

    const iconUrl = Utils.getFolderIconUrl(false);
    const repoUrl = `${siteRoot}library/${item.repo_id}/${encodeURIComponent(item.repo_name)}`;
    const objUrl = `${repoUrl}${Utils.encodePath(item.path)}`;

    const desktopItem = (
      <tr onMouseOver={this.handleMouseOver} onMouseOut={this.handleMouseOut}>
        <td><img src={iconUrl} alt="" width="24" /></td>
        <td><Link to={objUrl}>{item.obj_name}</Link></td>
        <td><Link to={repoUrl}>{item.repo_name}</Link></td>
        <td>{item.view_cnt}</td>
        <td>{this.renderExpiration()}</td>
        <td>
          {!item.is_expired && <a href="#" className={`sf2-icon-link action-icon ${isOpIconShown ? '' : 'invisible'}`} title={gettext('View')} onClick={this.viewLink}></a>}
          <a href="#" className={`sf2-icon-delete action-icon ${isOpIconShown ? '' : 'invisible'}`} title={gettext('Remove')} onClick={this.removeLink}></a>
        </td>
      </tr>
    );

    const mobileItem = (
      <tr>
        <td><img src={iconUrl} alt="" width="24" /></td>
        <td>
          <Link to={objUrl}>{item.obj_name}</Link>
          <br />
          <span>{item.repo_name}</span><br />
          <span className="item-meta-info">{item.view_cnt}<span className="small text-secondary">({gettext('Visits')})</span></span>
          <span className="item-meta-info">{this.renderExpiration()}<span className="small text-secondary">({gettext('Expiration')})</span></span>
        </td>
        <td>
          <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
            <DropdownToggle
              tag="i"
              className="sf-dropdown-toggle fa fa-ellipsis-v ml-0"
              title={gettext('More Operations')}
              data-toggle="dropdown"
              aria-expanded={this.state.isOpMenuOpen}
            />
            <div className={this.state.isOpMenuOpen ? '' : 'd-none'} onClick={this.toggleOpMenu}>
              <div className="mobile-operation-menu-bg-layer"></div>
              <div className="mobile-operation-menu">
                {!item.is_expired && <DropdownItem className="mobile-menu-item" onClick={this.viewLink}>{gettext('View')}</DropdownItem>}
                <DropdownItem className="mobile-menu-item" onClick={this.removeLink}>{gettext('Remove')}</DropdownItem>
              </div>
            </div>
          </Dropdown>
        </td>
      </tr>
    );
    return (
      <Fragment>
        {this.props.isDesktop ? desktopItem : mobileItem}
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

class ShareAdminUploadLinks extends Component {

  constructor(props) {
    super(props);
    this.state = {
      loading: true,
      errorMsg: '',
      items: []
    };
  }

  componentDidMount() {
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
      this.setState({items: items});
      const message = gettext('Successfully deleted 1 item.');
      toaster.success(message);
    }).catch((error) => {
      const errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <div className="main-panel-center">
        <div className="cur-view-container">
          <div className="cur-view-path share-upload-nav">
            <ul className="nav">
              {canGenerateShareLink && (
                <li className="nav-item"><Link to={`${siteRoot}share-admin-share-links/`} className="nav-link">{gettext('Share Links')}</Link></li>
              )}
              <li className="nav-item"><Link to={`${siteRoot}share-admin-upload-links/`} className="nav-link active">{gettext('Upload Links')}</Link></li>
            </ul>
          </div>
          <div className="cur-view-content">
            <Content
              loading={this.state.loading}
              errorMsg={this.state.errorMsg}
              items={this.state.items}
              onRemoveLink={this.onRemoveLink}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default ShareAdminUploadLinks;
