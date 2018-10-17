import React from 'react';
import PropTypes from 'prop-types';
import { seafileAPI } from '../../utils/seafile-api';
import { repoID, isPro, enableFileComment, fileAuditEnabled} from '../../utils/constants';
import Repo from '../../models/repo';
import OperationMenuItem from './operation-menu-item';

const propTypes = {
  dirent: PropTypes.object.isRequired,
  menuPosition: PropTypes.object.isRequired, 
};

class OperationMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: null,
      menuList: [],
      is_repo_owner: false,
    };
  }

  componentDidMount() {
    seafileAPI.getRepoInfo(repoID).then(res => {
      let repo = new Repo(res.data);
      let menuList = this.calculateMenuList(repo);
      //todos: user_can_set_folder_perm;;;  is_address_book_group_admin
      seafileAPI.getAccountInfo().then(res => {
        let user_email = res.data.email;
        let is_repo_owner = repo.owner_email === user_email;
        this.setState({
          repo: repo,
          menuList: menuList,
          is_repo_owner: is_repo_owner
        });
      });
    });
  }

  calculateMenuList(repoInfo) {
    let dirent = this.props.dirent;
    let type = dirent.type;
    let permission = dirent.permission;
    if (type === 'dir' && permission === 'rw') {
      let menuList = ['Rename', 'Move', 'Copy', 'Divider', 'Permission', 'Details', 'Divider', 'Open Via Client'];
      return menuList;
    }

    if (type === 'dir' && permission === 'r') {
      let menuList = repoInfo.encrypted ? ['Copy', 'Details'] : ['Details'];
      return menuList;
    }

    if (type === 'file' && permission === 'rw') {
      let menuList = [];
      if (!dirent.is_locked || (dirent.is_locked && dirent.locked_by_me)) {
        menuList.push('Reanme');
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
              <OperationMenuItem key={index} item={item} onItemClick={this.onMenuItemClick}/>
            );
          })}
        </ul>
      );
    }
    return '';
  }
}

OperationMenu.propTypes = propTypes;

export default OperationMenu;
