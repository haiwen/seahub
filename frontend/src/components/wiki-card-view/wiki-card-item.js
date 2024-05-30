import React, { Component } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';
import moment from 'moment';
import { siteRoot, gettext, appAvatarURL, username } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import WikiDeleteDialog from '../dialog/wiki-delete-dialog';

const propTypes = {
  wiki: PropTypes.object.isRequired,
  deleteWiki: PropTypes.func.isRequired,
};

class WikiCardItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShowDeleteDialog: false,
      isItemMenuShow: false,
    };
  }

  onDeleteToggle = (e) => {
    e.preventDefault();
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  };

  onDeleteCancel = () => {
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

  clickWikiCard = (link) => {
    window.open(link);
  };

  toggleDropDownMenu = () => {
    this.setState({isItemMenuShow: !this.state.isItemMenuShow});
  };

  onClickDropdown = (e) => {
    e.preventDefault();
    e.stopPropagation();
  };

  renderAvatar = () => {
    const { wiki } = this.props;
    return (
      <div className="wiki-card-item-avatar-container">
        <img className="wiki-card-item-avatar" src={appAvatarURL} alt={wiki.owner_nickname}/>
        <span className="wiki-card-item-owner text-truncate" title={wiki.owner_nickname}>{wiki.owner_nickname}</span>
      </div>
    );
  };

  renderDept = () => {
    const { wiki } = this.props;
    return (
      <div className="wiki-card-item-avatar-container">
        <span className='sf3-font-department sf3-font nav-icon'></span>
        <span className="wiki-card-item-owner text-truncate" title={wiki.owner_nickname}>{wiki.owner_nickname}</span>
      </div>
    );
  };

  render() {
    const { wiki } = this.props;
    let isOldVersion = wiki.version !== 'v2';
    let publishedUrl = `${siteRoot}published/${encodeURIComponent(wiki.slug)}/`;
    let editUrl = `${siteRoot}wikis/${wiki.id}/`;
    let wikiName = isOldVersion ? `${wiki.name} (old version)` : wiki.name;
    return (
      <>
        <div className="wiki-card-item" onClick={this.clickWikiCard.bind(this, isOldVersion ? publishedUrl : editUrl )}>
          <div className="wiki-card-item-top">
            <div className="d-flex align-items-center" style={{width: 'calc(100% - 46px)'}}>
              <span className="sf3-font-wiki sf3-font" aria-hidden="true"></span>
              <span className="wiki-card-item-name ml-2 text-truncate" title={wikiName} aria-label={wikiName}>{wikiName}</span>
            </div>
            <Dropdown isOpen={this.state.isItemMenuShow} toggle={this.toggleDropDownMenu} onClick={this.onClickDropdown}>
              <DropdownToggle
                tag="i"
                role="button"
                tabIndex="0"
                className="sf-dropdown-toggle sf3-font-more sf3-font"
                title={gettext('More operations')}
                aria-label={gettext('More operations')}
                data-toggle="dropdown"
                aria-expanded={this.state.isItemMenuShow}
                aria-haspopup={true}
                style={{'minWidth': '0'}}
              />
              <DropdownMenu right={true} className="dtable-dropdown-menu">
                {/* <DropdownItem onClick={}>{gettext('Rename')}</DropdownItem> */}
                <DropdownItem onClick={this.onDeleteToggle}>{gettext('Unpublish')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
          <div className="wiki-card-item-bottom">
            {wiki.owner === username ? this.renderAvatar() : this.renderDept()}
            <span className="wiki-item-updated-time">{moment(wiki.updated_at).fromNow()}</span>
          </div>
        </div>
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

WikiCardItem.propTypes = propTypes;

export default WikiCardItem;
