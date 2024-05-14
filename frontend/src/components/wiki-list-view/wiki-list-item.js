import React, { Component } from 'react';
import { Dropdown, DropdownToggle, DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';
import moment from 'moment';
import { siteRoot, gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import ModalPortal from '../modal-portal';
import WikiDeleteDialog from '../dialog/wiki-delete-dialog';

const propTypes = {
  wiki: PropTypes.object.isRequired,
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
      highlight: false,
    };
  }

  toggleOpMenu = () => {
    this.setState({
      isOpMenuOpen: !this.state.isOpMenuOpen
    });
  };

  onMouseEnter = () => {
    if (!this.props.isItemFreezed) {
      this.setState({ highlight: true });
    }
  };

  onMouseLeave = () => {
    if (!this.props.isItemFreezed) {
      this.setState({ highlight: false });
    }
  };

  onDeleteToggle = (e) => {
    e.preventDefault();
    this.props.onUnfreezedItem();
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  };

  onDeleteCancel = () => {
    this.props.onUnfreezedItem();
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  };

  deleteWiki = () => {
    let wiki = this.props.wiki;
    this.props.deleteWiki(wiki);
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  };

  render() {
    let wiki = this.props.wiki;
    let userProfileURL = `${siteRoot}profile/${encodeURIComponent(wiki.owner)}/`;
    let fileIconUrl = Utils.getDefaultLibIconUrl(false);
    let isOldVersion = wiki.version !== 'v2';
    let publishedUrl = `${siteRoot}published/${encodeURIComponent(wiki.slug)}/`;
    let editUrl = `${siteRoot}edit-wiki/${wiki.id}/`;

    const desktopItem = (
      <tr
        className={this.state.highlight ? 'tr-highlight' : ''}
        onMouseEnter={this.onMouseEnter}
        onMouseLeave={this.onMouseLeave}
        onFocus={this.onMouseEnter}
      >
        <td><img src={fileIconUrl} width="24" alt="" /></td>
        <td className="name">
          {isOldVersion && <a href={publishedUrl}>{wiki.name} (old version)</a>}
          {!isOldVersion && <a href={editUrl}>{wiki.name}</a>}
        </td>
        <td><a href={userProfileURL} target='_blank' rel="noreferrer">{wiki.owner_nickname}</a></td>
        <td>{moment(wiki.updated_at).fromNow()}</td>
        <td className="text-center cursor-pointer align-top">
          <a
            href="#"
            role="button"
            aria-label={gettext('Unpublish')}
            title={gettext('Unpublish')}
            className={`action-icon sf2-icon-x3 ${this.state.highlight ? '' : 'invisible'}`}
            onClick={this.onDeleteToggle}
          ></a>
        </td>
      </tr>
    );

    const mobileItem = (
      <tr>
        <td><img src={fileIconUrl} width="24" alt="" /></td>
        <td>
          {isOldVersion && <a href={publishedUrl}>{wiki.name} (old version)</a>}
          {!isOldVersion && <a href={editUrl}>{wiki.name}</a>}<br />
          <a href={userProfileURL} target='_blank' className="item-meta-info" rel="noreferrer">{wiki.owner_nickname}</a>
          <span className="item-meta-info">{moment(wiki.updated_at).fromNow()}</span>
        </td>
        <td>
          <Dropdown isOpen={this.state.isOpMenuOpen} toggle={this.toggleOpMenu}>
            <DropdownToggle
              tag="i"
              className="sf-dropdown-toggle fa fa-ellipsis-v ml-0"
              title={gettext('More operations')}
              aria-label={gettext('More operations')}
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
      <>
        {Utils.isDesktop() ? desktopItem : mobileItem}
        {this.state.isShowDeleteDialog &&
          <ModalPortal>
            <WikiDeleteDialog
              toggleCancel={this.onDeleteCancel}
              handleSubmit={this.deleteWiki}
            />
          </ModalPortal>
        }
      </>
    );
  }
}

WikiListItem.propTypes = propTypes;

export default WikiListItem;
