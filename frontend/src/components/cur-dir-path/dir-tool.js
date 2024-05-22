import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import TextTranslation from '../../utils/text-translation';
import SeahubPopover from '../common/seahub-popover';
import ListTagPopover from '../popover/list-tag-popover';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  userPerm: PropTypes.string,
  currentPath: PropTypes.string.isRequired,
  updateUsedRepoTags: PropTypes.func.isRequired,
  onDeleteRepoTag: PropTypes.func.isRequired,
  currentMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  isCustomPermission: PropTypes.bool,
};

class DirTool extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isRepoTagDialogOpen: false,
      isDropdownMenuOpen: false
    };
  }

  toggleDropdownMenu = () => {
    this.setState({
      isDropdownMenuOpen: !this.state.isDropdownMenuOpen
    });
  };

  hidePopover = (e) => {
    if (e) {
      let dom = e.target;
      while (dom) {
        if (typeof dom.className === 'string' && dom.className.includes('tag-color-popover')) return;
        dom = dom.parentNode;
      }
    }
    this.setState({isRepoTagDialogOpen: false});
  };

  toggleCancel = () => {
    this.setState({isRepoTagDialogOpen: false});
  };

  isMarkdownFile(filePath) {
    return Utils.getFileName(filePath).includes('.md');
  }

  getList2 = () => {
    const list = [];
    const { repoID, userPerm, currentPath } = this.props;
    const { TAGS, TRASH, HISTORY } = TextTranslation;
    if (userPerm !== 'rw') {
      return list;
    }
    if (this.isMarkdownFile(currentPath)) {
      return list;
    }

    list.push(TAGS);

    if (Utils.getFileName(currentPath)) {
      let trashUrl = siteRoot + 'repo/' + repoID + '/trash/?path=' + encodeURIComponent(currentPath);
      list.push({...TRASH, href: trashUrl});
    } else {
      let trashUrl = siteRoot + 'repo/' + repoID + '/trash/';
      list.push({...TRASH, href: trashUrl});

      let historyUrl = siteRoot + 'repo/history/' + repoID + '/';
      list.push({...HISTORY, href: historyUrl});
    }

    return list;
  };

  onMenuItemClick = (item) => {
    const { key, href } = item;
    switch (key) {
      case 'Properties':
        this.props.switchViewMode('detail');
        break;
      case 'Tags':
        this.setState({isRepoTagDialogOpen: !this.state.isRepoTagDialogOpen});
        break;
      case 'Trash':
        location.href = href;
        break;
      case 'History':
        location.href = href;
        break;
    }
  };

  getMenuList = () => {
    const list = [];
    const list2 = this.getList2();
    const { PROPERTIES, } = TextTranslation;
    if (!this.props.isCustomPermission) {
      list.push(PROPERTIES);
    }
    return list.concat(list2);
  };

  onMenuItemKeyDown = (e, item) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onMenuItemClick(item);
    }
  };

  render() {
    let baseClass = 'btn btn-secondary btn-icon sf-view-mode-btn ';
    const menuItems = this.getMenuList();
    const { isDropdownMenuOpen } = this.state;
    const { repoID } = this.props;
    return (
      <React.Fragment>
        <div className="d-flex">
          <div className="view-modes">
            <button className={`${baseClass} sf3-font-list-view sf3-font ${this.props.currentMode === 'list' ? 'current-mode' : ''}`} id='list' title={gettext('List')} aria-label={gettext('List')} onClick={this.props.switchViewMode.bind(this, 'list')}></button>
            <button className={`${baseClass} sf3-font-grid-view sf3-font ${this.props.currentMode === 'grid' ? 'current-mode' : ''}`} id='grid' title={gettext('Grid')} aria-label={gettext('Grid')} onClick={this.props.switchViewMode.bind(this, 'grid')}></button>
          </div>
          {menuItems.length > 0 &&
          <Dropdown isOpen={isDropdownMenuOpen} toggle={this.toggleDropdownMenu}>
            <DropdownToggle
              id="cur-folder-more-op-toggle"
              className={'sf3-font-more sf3-font'}
              data-toggle="dropdown"
              title={gettext('More operations')}
              aria-label={gettext('More operations')}
              aria-expanded={isDropdownMenuOpen}
              onKeyDown={this.onDropdownToggleKeyDown}
            >
            </DropdownToggle>
            <DropdownMenu right={true}>
              {menuItems.map((menuItem, index) => {
                if (menuItem === 'Divider') {
                  return <DropdownItem key={index} divider />;
                } else {
                  return (
                    <DropdownItem key={index} onClick={this.onMenuItemClick.bind(this, menuItem)} onKeyDown={this.onMenuItemKeyDown.bind(this, menuItem)}>{menuItem.value}</DropdownItem>
                  );
                }
              })}
            </DropdownMenu>
          </Dropdown>
          }
        </div>
        {this.state.isRepoTagDialogOpen &&
        <SeahubPopover
          popoverClassName="list-tag-popover"
          target="cur-folder-more-op-toggle"
          hideSeahubPopover={this.hidePopover}
          hideSeahubPopoverWithEsc={this.hidePopover}
          canHideSeahubPopover={true}
          boundariesElement={document.body}
          placement={'bottom-end'}
        >
          <ListTagPopover
            repoID={repoID}
            onListTagCancel={this.toggleCancel}
          />
        </SeahubPopover>
        }
      </React.Fragment>
    );
  }

}

DirTool.propTypes = propTypes;

export default DirTool;
