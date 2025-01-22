import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { Utils } from '../utils/utils';
import { gettext } from '../utils/constants';
import { GRID_MODE, LIST_MODE } from './dir-view-mode/constants';

import '../css/view-modes.css';

const propTypes = {
  className: PropTypes.string,
  currentViewMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired
};

class ViewModes extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDropdownMenuOpen: false
    };
  }

  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = (e) => {
    if ((e.ctrlKey || e.metaKey) && e.shiftKey) {
      if (e.keyCode === 49) {
        this.props.switchViewMode(LIST_MODE);
      } else if (e.keyCode === 50) {
        this.props.switchViewMode(GRID_MODE);
      }
    }
  };

  toggleDropdownMenu = () => {
    this.setState({
      isDropdownMenuOpen: !this.state.isDropdownMenuOpen
    });
  };

  render() {
    const { isDropdownMenuOpen } = this.state;
    const { currentViewMode, className = '' } = this.props;
    const shortcutMain = Utils.isMac() ? '⇧ ⌘' : 'Ctrl + Shift +';
    const options = [
      { 'icon': 'list-view', 'text': gettext('List view'), 'value': LIST_MODE, 'shortcut': `${shortcutMain} 1` },
      { 'icon': 'grid-view', 'text': gettext('Grid view'), 'value': GRID_MODE, 'shortcut': `${shortcutMain} 2` }
    ];
    return (
      <Dropdown
        isOpen={isDropdownMenuOpen}
        toggle={this.toggleDropdownMenu}
        id="cur-view-change-mode-dropdown"
        className={className}
      >
        <DropdownToggle
          tag="div"
          data-toggle="dropdown"
          title={gettext('Switch view mode')}
          aria-label={gettext('Switch view mode')}
          aria-expanded={isDropdownMenuOpen}
        >
          <span className='cur-view-path-btn px-1'>
            <span className={`sf3-font sf3-font-${currentViewMode}-view`}></span>
            <span className={'sf3-font sf3-font-down'}></span>
          </span>
        </DropdownToggle>
        <DropdownMenu right={true} className="mt-1">
          {options.map((item, index) => {
            return (
              <DropdownItem className='p-0' key={index} onClick={this.props.switchViewMode.bind(this, item.value)}>
                <div className="view-modes-dropdown-wrapper">
                  <span className='view-modes-dropdown-tick'>
                    {currentViewMode === item.value && <i className="sf2-icon-tick"></i>}
                  </span>
                  <span className="view-modes-dropdown-content">
                    <span className={`sf3-font-${item.icon} sf3-font mr-2`}></span>
                    <span>{item.text}</span>
                  </span>
                  <span className="view-modes-dropdown-shortcut ml-4">{item.shortcut}</span>
                </div>
              </DropdownItem>
            );
          })}
        </DropdownMenu>
      </Dropdown>
    );
  }

}

ViewModes.propTypes = propTypes;

export default ViewModes;
