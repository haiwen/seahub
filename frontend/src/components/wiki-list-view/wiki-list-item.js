import React, { Component, Fragment } from 'react';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';
import moment from 'moment';
import { siteRoot, gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
// import { seafileAPI } from '../../utils/seafile-api';
// import Toast from '../toast';
import ModalPortal from '../modal-portal';
import WikiDeleteDialog from '../dialog/wiki-delete-dialog';
// import Rename from '../rename';

const propTypes = {
  wiki: PropTypes.object.isRequired,
  // renameWiki: PropTypes.func.isRequired,
  deleteWiki: PropTypes.func.isRequired,
  isItemFreezed: PropTypes.bool.isRequired,
  onFreezedItem: PropTypes.func.isRequired,
  onUnfreezedItem: PropTypes.func.isRequired,
};

class WikiListItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isOpMenuOpen: false, // for mobile
      isShowDeleteDialog: false,
      // isRenameing: false,
      highlight: false,
      // permission: this.props.wiki.permission,
    };
  }

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  }

  // clickMenuToggle = (e) => {
  //   e.preventDefault();
  //   this.onMenuToggle(e);
  // }

  // onMenuToggle = (e) => {
  //   let targetType = e.target.dataset.toggle;
  //   if (targetType !== 'item') {
  //     if (this.props.isItemFreezed) {
  //       this.setState({
  //         highlight: false,
  //         isShowMenuControl: false,
  //         isShowWikiMenu: !this.state.isShowWikiMenu
  //       });
  //       this.props.onUnfreezedItem();
  //     } else {
  //       this.setState({
  //         isShowWikiMenu: !this.state.isShowWikiMenu
  //       });
  //       this.props.onFreezedItem();
  //     }
  //   }
  // }

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({ highlight: true });
    }
  }

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({ highlight: false });
    }
  }

  // changePerm = (permission) => {
  //   let wiki = this.props.wiki;
  //   seafileAPI.updateWikiPermission(wiki.slug, permission).then(() => {
  //     this.setState({permission: permission});
  //   }).catch((error) => {
  //     if(error.response) {
  //       let errorMsg = error.response.data.error_msg;
  //       Toast.danger(errorMsg);
  //     }
  //   });
  // }

  // onRenameToggle = (e) => {
  //   this.props.onFreezedItem();
  //   this.setState({
  //     isShowWikiMenu: false,
  //     isShowMenuControl: false,
  //     isRenameing: true,
  //   });
  // }

  // onRenameConfirm = (newName) => {
  //   this.renameWiki(newName);
  //   this.onRenameCancel();
  // }

  // onRenameCancel = () => {
  //   this.props.onUnfreezedItem();
  //   this.setState({isRenameing: false});
  // }

  onDeleteToggle = (e) => {
    e.preventDefault();
    this.props.onUnfreezedItem();
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  }

  onDeleteCancel = () => {
    this.props.onUnfreezedItem();
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  }

  // renameWiki = (newName) => {
  //   let wiki = this.props.wiki;
  //   this.props.renameWiki(wiki, newName);
  // }

  deleteWiki = () => {
    let wiki = this.props.wiki;
    this.props.deleteWiki(wiki);
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  }

  render() {
    let wiki = this.props.wiki;
    let userProfileURL = `${siteRoot}profile/${encodeURIComponent(wiki.owner)}/`;
    let fileIconUrl = Utils.getDefaultLibIconUrl(false);
    let deleteIcon = `action-icon sf2-icon-x3 ${this.state.highlight ? '' : 'invisible'}`;

    const desktopItem = (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave} onFocus={this.onMouseEnter}>
        <td><img src={fileIconUrl} width="24" alt="" /></td>
        <td className="name">
          <a href={wiki.link}>{wiki.name}</a>
          {/*this.state.isRenameing ?
              <Rename wiki={wiki} name={wiki.name} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel}/> :
              <a href={wiki.link}>{wiki.name}</a>
            */}
        </td>
        <td><a href={userProfileURL} target='_blank'>{wiki.owner_nickname}</a></td>
        <td>{moment(wiki.updated_at).fromNow()}</td>
        <td className="text-center cursor-pointer">
          <a href="#" role="button" aria-label={gettext('Unpublish')} title={gettext('Unpublish')} className={deleteIcon} onClick={this.onDeleteToggle}></a>
        </td>
      </tr>
    );

    const mobileItem = (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td><img src={fileIconUrl} width="24" alt="" /></td>
        <td>
          <a href={wiki.link}>{wiki.name}</a><br />
          <a href={userProfileURL} target='_blank' className="item-meta-info">{wiki.owner_nickname}</a>
          <span className="item-meta-info">{moment(wiki.updated_at).fromNow()}</span>
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
                <DropdownItem className="mobile-menu-item" onClick={this.onDeleteToggle}>{gettext('Unpublish')}</DropdownItem>
              </div>
            </div>
          </Dropdown>
        </td>
      </tr>
    );

    return (
      <Fragment>
        {Utils.isDesktop() ? desktopItem : mobileItem}
        {this.state.isShowDeleteDialog &&
          <ModalPortal>
            <WikiDeleteDialog
              toggleCancel={this.onDeleteCancel}
              handleSubmit={this.deleteWiki}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

WikiListItem.propTypes = propTypes;

export default WikiListItem;
