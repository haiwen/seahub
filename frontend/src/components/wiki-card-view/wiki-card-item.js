import React, { Component } from 'react';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import PropTypes from 'prop-types';
import moment from 'moment';
import { seafileAPI } from '../../utils/seafile-api';
import { siteRoot, gettext } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import DeleteWikiDialog from '../dialog/delete-wiki-dialog';
import RenameWikiDialog from '../dialog/rename-wiki-dialog';

const propTypes = {
  wiki: PropTypes.object.isRequired,
  deleteWiki: PropTypes.func.isRequired,
  renameWiki: PropTypes.func.isRequired,
  isDepartment: PropTypes.bool.isRequired,
  isShowAvatar: PropTypes.bool.isRequired,
};

class WikiCardItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShowDeleteDialog: false,
      isShowRenameDialog: false,
      isItemMenuShow: false,
      ownerAvatar: '',
    };
  }

  componentDidMount() {
    const { wiki, isDepartment } = this.props;
    if (!isDepartment) {
      seafileAPI.getUserAvatar(wiki.owner, 24).then(res => {
        this.setState({ ownerAvatar: res.data.url });
      });
    }
  }

  onRenameToggle = (e) => {
    this.setState({
      isShowRenameDialog: !this.state.isShowRenameDialog,
    });
  };

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

  renameWiki = (newName) => {
    if (this.props.wiki.name !== newName) {
      this.props.renameWiki(this.props.wiki, newName);
    }
    this.setState({ isShowRenameDialog: false });
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
        <img className="wiki-card-item-avatar" src={this.state.ownerAvatar} alt={wiki.owner_nickname}/>
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
    const { wiki, isDepartment, isShowAvatar } = this.props;
    let isOldVersion = wiki.version !== 'v2';
    let publishedUrl = `${siteRoot}published/${encodeURIComponent(wiki.slug)}/`;
    let editUrl = `${siteRoot}wikis/${wiki.id}/`;
    let wikiName = isOldVersion ? `${wiki.name} (old version)` : wiki.name;
    return (
      <>
        <div
          className={`wiki-card-item ${this.state.isItemMenuShow ? 'wiki-card-item-menu-open' : ''}`}
          onClick={this.clickWikiCard.bind(this, isOldVersion ? publishedUrl : editUrl )}
        >
          <div className="wiki-card-item-top">
            <span className="sf3-font-wiki sf3-font" aria-hidden="true"></span>
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
                <DropdownItem onClick={this.onRenameToggle}>{gettext('Rename')}</DropdownItem>
                {isOldVersion ?
                  <DropdownItem onClick={this.onDeleteToggle}>{gettext('Unpublish')}</DropdownItem>
                  :
                  <DropdownItem onClick={this.onDeleteToggle}>{gettext('Delete')}</DropdownItem>
                }
              </DropdownMenu>
            </Dropdown>
          </div>
          <div className="wiki-item-name text-truncate" title={wikiName} aria-label={wikiName}>{wikiName}</div>
          <div className="wiki-item-owner">
            {isShowAvatar && (isDepartment ? this.renderDept() : this.renderAvatar())}
          </div>
          <div className="wiki-item-updated-time">{moment(wiki.updated_at).fromNow()}</div>
        </div>
        {this.state.isShowDeleteDialog &&
          <ModalPortal>
            {isOldVersion ?
              <DeleteWikiDialog
                toggleCancel={this.onDeleteCancel}
                handleSubmit={this.deleteWiki}
                title={gettext('Unpublish Wiki')}
                content={<p>{gettext('Are you sure you want to unpublish Wiki')}{' '}<b>{wiki.name}</b> ?</p>}
                footer={gettext('Unpublish')}
              />
              :
              <DeleteWikiDialog
                toggleCancel={this.onDeleteCancel}
                handleSubmit={this.deleteWiki}
                title={gettext('Delete Wiki')}
                content={<p>{gettext('Are you sure you want to delete Wiki')}{' '}<b>{wiki.name}</b> ?</p>}
                footer={gettext('Delete')}
              />
            }
          </ModalPortal>
        }
        {this.state.isShowRenameDialog &&
          <ModalPortal>
            <RenameWikiDialog
              toggleCancel={this.onRenameToggle}
              onRename={this.renameWiki}
              wiki={wiki}
            />
          </ModalPortal>
        }
      </>
    );
  }
}

WikiCardItem.propTypes = propTypes;

export default WikiCardItem;
