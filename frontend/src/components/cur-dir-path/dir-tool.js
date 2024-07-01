import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext, siteRoot } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import TextTranslation from '../../utils/text-translation';
import SeahubPopover from '../common/seahub-popover';
import ListTagPopover from '../popover/list-tag-popover';
import ViewModes from '../../components/view-modes';

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

  getMenu = () => {
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

  onMenuItemKeyDown = (e, item) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.onMenuItemClick(item);
    }
  };

  render() {
    const menuItems = this.getMenu();
    const { isDropdownMenuOpen } = this.state;
    const { repoID, currentMode } = this.props;
    const propertiesText = TextTranslation.PROPERTIES.value;
    return (
      <React.Fragment>
        <div className="d-flex">
          <ViewModes currentViewMode={currentMode} switchViewMode={this.props.switchViewMode} />
          {!this.props.isCustomPermission &&
            <span className="cur-view-path-btn ml-2" onClick={() => this.props.switchViewMode('detail')}>
              <span className="sf3-font sf3-font-info" aria-label={propertiesText} title={propertiesText}></span>
            </span>
          }
          {menuItems.length > 0 &&
          <Dropdown isOpen={isDropdownMenuOpen} toggle={this.toggleDropdownMenu}>
            <DropdownToggle
              tag="i"
              id="cur-folder-more-op-toggle"
              className='cur-view-path-btn sf3-font-more sf3-font ml-2'
              data-toggle="dropdown"
              title={gettext('More operations')}
              aria-label={gettext('More operations')}
              aria-expanded={isDropdownMenuOpen}
            >
            </DropdownToggle>
            <DropdownMenu right={true}>
              {menuItems.map((menuItem, index) => {
                if (menuItem === 'Divider') {
                  return <DropdownItem key={index} divider />;
                } else {
                  return (
                    <DropdownItem
                      key={index}
                      onClick={this.onMenuItemClick.bind(this, menuItem)}
                      onKeyDown={this.onMenuItemKeyDown.bind(this, menuItem)}
                    >{menuItem.value}
                    </DropdownItem>
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
