import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { repoID, isPro, enableFileComment, fileAuditEnabled, folderPermEnabled} from '../../utils/constants';
import Repo from '../../models/repo';
import DirentMenuItem from './dirent-menu-item';

const propTypes = {
  dirent: PropTypes.object.isRequired,
  menuPosition: PropTypes.object.isRequired, 
  onMenuItemClick: PropTypes.func.isRequired,
};

class DirentMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: null,
      menuList: [],
    };
    this.is_repo_owner = false;
  }

  componentDidMount() {
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repo = new Repo(res.data);
      seafileAPI.getAccountInfo().then(res => {
        let user_email = res.data.email;
        this.is_repo_owner = repo.owner_email === user_email;
        let menuList = this.calculateMenuList(repo);
        this.setState({
          repo: repo,
          menuList: menuList
        });
      });
    });
  }

  calculateMenuList(repoInfo) {
    let dirent = this.props.dirent;
    let type = dirent.type;
    let permission = dirent.permission;
    let can_set_folder_perm = folderPermEnabled  && ((this.is_repo_owner && repoInfo.has_been_shared_out) || repoInfo.is_admin);
    if (type === 'dir' && permission === 'rw') {
      let menuList = [];
      if (can_set_folder_perm) {
        menuList = ['Rename', 'Move', 'Copy', 'Divider', 'Permission', 'Details', 'Divider', 'Open via Client'];
      } else {
        menuList = ['Rename', 'Move', 'Copy', 'Divider', 'Details', 'Divider', 'Open via Client'];
      }
      return menuList;
    }

    if (type === 'dir' && permission === 'r') {
      let menuList = repoInfo.encrypted ? ['Copy', 'Details'] : ['Details'];
      return menuList;
    }

    if (type === 'file' && permission === 'rw') {
      let menuList = [];
      if (!dirent.is_locked || (dirent.is_locked && dirent.locked_by_me)) {
        menuList.push('Rename');
        menuList.push('Move');
      }
      menuList.push('Copy');
      if (isPro) {
        if (dirent.is_locked && dirent.locked_by_me) {
          menuList.push('Unlock');
        } else {
          menuList.push('Lock');
        }
      }
      menuList.push('New Draft');
      menuList.push('Divider');
      if (enableFileComment) {
        menuList.push('Comment');
      }
      menuList.push('History');
      if (fileAuditEnabled) {
        menuList.push('Access Log');
      }
      menuList.push('Details');
      menuList.push('Divider');
      menuList.push('Open via Client');
      return menuList;
    }

    if (type === 'file' && permission === 'r') {
      let menuList = [];
      if (!repoInfo.encrypted) {
        menuList.push('Copy');
      }
      if (enableFileComment) {
        menuList.push('Comment');
      }
      menuList.push('History');
      menuList.push('Details');
      return menuList;
    }
  }

  onMenuItemClick = (operation) => {
    this.props.onMenuItemClick(operation);
  }

  render() {
    let position = this.props.menuPosition;
    let style = {position: 'fixed', left: position.left, top: position.top, display: 'block'};
    if (this.state.menuList.length) {
      return (
        <ul className="dropdown-menu operation-menu" style={style}>
          {this.state.menuList.map((item, index) => {
            return (
              <DirentMenuItem key={index} item={item} onItemClick={this.onMenuItemClick}/>
            );
          })}
        </ul>
      );
    }
    return '';
  }
}

DirentMenu.propTypes = propTypes;

export default DirentMenu;
