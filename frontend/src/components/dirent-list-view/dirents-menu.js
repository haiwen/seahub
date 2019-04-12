import React from 'react';
import PropTypes from 'prop-types';
import { DropdownMenu, DropdownToggle, DropdownItem, ButtonDropdown } from 'reactstrap';
import { Utils } from '../../utils/utils';
import { gettext, isPro } from '../../utils/constants';
import TextTranslation from '../../utils/text-translation';

import '../../css/dirents-menu.css';

const propTypes = {
  dirent: PropTypes.object.isRequired,
  currentRepoInfo: PropTypes.object.isRequired,
  onMenuItemClick: PropTypes.func.isRequired,
};

class DirentMenu extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isItemMenuShow: false,
      menuList: [],
    };
  }

  componentDidMount() {
    const { currentRepoInfo, dirent } = this.props;
    let menuList = this.calculateMenuList(currentRepoInfo, dirent);
    this.setState({menuList: menuList});
  }

  componentWillReceiveProps(nextProps) {
    const { currentRepoInfo, dirent } = nextProps;
    let menuList = this.calculateMenuList(currentRepoInfo, dirent);
    this.setState({menuList: menuList});
  }

  calculateMenuList(currentRepoInfo, dirent) {
    let menuList = [];
    const { SHARE, TAGS, RELATED_FILES, HISTORY, OPEN_VIA_CLIENT, LOCK, UNLOCK } = TextTranslation;

    if (dirent.type === 'dir') {
      menuList = [SHARE];
      return menuList;
    } 

    if (dirent.type === 'file') {
      menuList = [SHARE, TAGS, RELATED_FILES, 'Divider', HISTORY, 'Divider', OPEN_VIA_CLIENT];
      if (!Utils.isMarkdownFile(dirent.name)) {
        menuList.splice(2, 1);
      }
      if (isPro) {
        if (dirent.is_locked) {
          if (dirent.locked_by_me || (dirent.lock_owner === 'OnlineOffice' && currentRepoInfo.permission === 'rw')) {
            menuList.splice(1, 0, UNLOCK);
          }
        } else {
          menuList.splice(1, 0, LOCK);
        }
      }
      return menuList;
    }
  }

  onDropdownToggleClick = (e) => {
    e.preventDefault();
    this.setState({
      isItemMenuShow: !this.state.isItemMenuShow,
    });
  }

  onMenuItemClick = (event) => {
    let operation = event.target.dataset.toggle;
    this.props.onMenuItemClick(operation, this.props.dirent);
  }

  render() {

    return (
      <ButtonDropdown isOpen={this.state.isItemMenuShow} toggle={this.onDropdownToggleClick} title={gettext('More Operations')}>
        <DropdownToggle data-toggle="dropdown" aria-expanded={this.state.isItemMenuShow} onClick={this.onDropdownToggleClick} className="fas fa-ellipsis-v sf-dropdown-toggle dirents-more-menu">
        </DropdownToggle>
        <DropdownMenu>
          {this.state.menuList.map((menuItem, index) => {
            if (menuItem === 'Divider') {
              return <DropdownItem key={index} divider/>;
            } else {
              return (
                <DropdownItem key={index} data-toggle={menuItem.key} onClick={this.onMenuItemClick}>{menuItem.value}</DropdownItem>
              );
            }
          })}
        </DropdownMenu>
      </ButtonDropdown>
    );
  }
}

DirentMenu.propTypes = propTypes;

export default DirentMenu;
