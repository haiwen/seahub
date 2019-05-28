import React, { Component, Fragment } from 'react';
import PropTypes from 'prop-types';
import moment from 'moment';
import { siteRoot } from '../../utils/constants';
// import { seafileAPI } from '../../utils/seafile-api';
// import Toast from '../toast';
import ModalPortal from '../modal-portal';
import WikiDeleteDialog from '../dialog/wiki-delete-dialog';
// import Rename from '../rename';

import { Utils } from '../../utils/utils';

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
      isShowDeleteDialog: false,
      // isRenameing: false,
      highlight: false,
      // permission: this.props.wiki.permission,
    };
    // this.permissions = ['private', 'public'];
  }

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
  //   this.setState({ isRenameing: true });
  // }

  // onRenameConfirm = (newName) => {
  //   this.renameWiki(newName);
  //   this.onRenameCancel();
  // }

  // onRenameCancel = () => {
  //   this.props.onUnfreezedItem();
  //   this.setState({isRenameing: false});
  // }
  
  onDeleteToggle = () => {
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

    return (
      <Fragment>
        <tr className={this.state.highlight ? 'tr-highlight' : ''} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
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
            <span className={deleteIcon} onClick={this.onDeleteToggle}></span>
          </td>
        </tr>
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
