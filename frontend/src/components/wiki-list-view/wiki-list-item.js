import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { gettext, siteRoot } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import WikiDeleteDialog from '../dialog/wiki-delete-dialog';
import MenuControl from '../menu-control';
import Toast from '../toast';
import WikiMenu from './wiki-menu';
import WikiRename from './wiki-rename';

const itempropTypes = {
  wiki: PropTypes.object.isRequired,
  renameWiki: PropTypes.func.isRequired,
  deleteWiki: PropTypes.func.isRequired,
};

class WikiListItem extends Component {
  constructor(props) {
    super(props);
    this.state = {
      isShowWikiMenu: false,
      position: {top:'', left: ''},
      isItemFreezed: false,
      isShowDeleteDialog: false,
      isShowMenuControl: false,
      isRenameing: false,
      highlight: '',
    };
  }

  componentDidMount() {
    document.addEventListener('click', this.onHideWikiMenu);
  }

  componentWillUnmount() {
    document.removeEventListener('click', this.onHideWikiMenu);
  }

  onMenuToggle = (e) => {
    e.stopPropagation();
    e.nativeEvent.stopImmediatePropagation();

    if (this.state.isShowWikiMenu) {
      this.onHideWikiMenu();
    } else {
      this.onShowWikiMenu(e);
    }
  }

  onShowWikiMenu = (e) => {
    let left = e.clientX - 8*16;
    let top  = e.clientY + 12;
    let position = {top: top, left: left};
    this.setState({
      isShowWikiMenu: true,
      position: position,
      isItemFreezed: true,
    });
  }

  onHideWikiMenu = () => {
    this.setState({
      isShowWikiMenu: false,
      isItemFreezed: false,
    });
  }

  onMouseEnter = () => {
    if (!this.state.isItemFreezed) {
      this.setState({
        isShowMenuControl: true,
        highlight: 'tr-highlight',
      });
    }
  }

  onMouseLeave = () => {
    if (!this.state.isItemFreezed) {
      this.setState({
        isShowMenuControl: false,
        highlight: '',
      });
    }
  }

  onRenameToggle = () => {
    this.setState({
      isShowWikiMenu: false,
      isItemFreezed: true,
      isRenameing: true,
    });
  }

  onRenameConfirm = (newName) => {
    let wiki = this.props.wiki;

    if (newName === wiki.name) {
      this.onRenameCancel();
      return false;
    }
    if (!newName) {
      let errMessage = 'Name is required.';
      Toast.error(gettext(errMessage));
      return false;
    }
    if (newName.indexOf('/') > -1) {
      let errMessage = 'Name should not include ' + '\'/\'' + '.';
      Toast.error(gettext(errMessage));
      return false;
    }
    this.renameWiki(newName);
    this.onRenameCancel();
  }

  onRenameCancel = () => {
    this.setState({
      isRenameing: false,
      isItemFreezed: false,
    });
  }

  onDeleteToggle = () => {
    this.setState({
      isShowDeleteDialog: !this.state.isShowDeleteDialog,
    });
  }

  renameWiki = (newName) => {
    let wiki = this.props.wiki;
    this.props.renameWiki(wiki, newName);
  }

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

    return (
      <Fragment>
        <tr className={this.state.highlight} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
          <td>
            {this.state.isRenameing ?
              <WikiRename wiki={wiki} onRenameConfirm={this.onRenameConfirm} onRenameCancel={this.onRenameCancel}/> :
              <a href={wiki.link}>{gettext(wiki.name)}</a>
            }
          </td>
          <td><a href={userProfileURL} target='_blank'>{gettext(wiki.owner_nickname)}</a></td>
          <td>{moment(wiki.updated_at).fromNow()}</td>
          <td className="menu-toggle" onClick={this.onMenuToggle}>
            <MenuControl
              isShow={this.state.isShowMenuControl}
              onClick={this.onMenuToggle}
            />
            {this.state.isShowWikiMenu &&
              <WikiMenu
                position={this.state.position}
                onRenameToggle={this.onRenameToggle}
                onDeleteToggle={this.onDeleteToggle}
              />
            }
          </td>
        </tr>
        {this.state.isShowDeleteDialog &&
          <ModalPortal>
            <WikiDeleteDialog
              toggleCancel={this.onDeleteToggle}
              handleSubmit={this.deleteWiki}
            />
          </ModalPortal>
        }
      </Fragment>
    );
  }
}

WikiListItem.propTypes = itempropTypes;

export default WikiListItem;