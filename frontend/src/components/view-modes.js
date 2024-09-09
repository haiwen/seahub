import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../utils/constants';
import { GRID_MODE, LIST_MODE } from './dir-view-mode/constants';

import '../css/view-modes.css';

const propTypes = {
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

  onKeyDown = (event) => {
    if (event.shiftKey && event.keyCode === 49) {
      this.props.switchViewMode(LIST_MODE);
    } else if (event.shiftKey && event.keyCode === 50) {
      this.props.switchViewMode(GRID_MODE);
    }
  };

  toggleDropdownMenu = () => {
    this.setState({
      isDropdownMenuOpen: !this.state.isDropdownMenuOpen
    });
  };

  render() {
    const { isDropdownMenuOpen } = this.state;
    const { currentViewMode } = this.props;
    const options = [
      { 'icon': 'list-view', 'text': gettext('List view'), 'value': LIST_MODE, 'shortcut': 'Shift 1' },
      { 'icon': 'grid-view', 'text': gettext('Grid view'), 'value': GRID_MODE, 'shortcut': 'Shift 2' }
    ];
    return (
      <Dropdown
        isOpen={isDropdownMenuOpen}
        toggle={this.toggleDropdownMenu}
        id="cur-view-change-mode-dropdown"
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
                  <span className="view-modes-dropdown-shortcut">
                    <span>{item.shortcut}</span>
                  </span>
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
