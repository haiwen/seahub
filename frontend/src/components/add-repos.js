import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownMenu, DropdownToggle, DropdownItem } from 'reactstrap';
import { gettext } from '../utils/constants';

const propTypes = {
  className: PropTypes.string,
  onAddRepo: PropTypes.func.isRequired,
};

class AddRepos extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDropdownMenuOpen: false
    };
  }

  toggleDropdownMenu = () => {
    this.setState({
      isDropdownMenuOpen: !this.state.isDropdownMenuOpen
    });
  };

  render() {
    const { isDropdownMenuOpen } = this.state;
    const { className = '' } = this.props;
    return (
      <Dropdown
        isOpen={isDropdownMenuOpen}
        toggle={this.toggleDropdownMenu}
        className={className}
      >
        <DropdownToggle
          tag="div"
          data-toggle="dropdown"
          title={gettext('New Library')}
          aria-label={gettext('New Library')}
          aria-expanded={isDropdownMenuOpen}
        >
          <span className='cur-view-path-btn px-1'>
            <span className='sf3-font sf3-font-new'></span>
            <span className='sf3-font sf3-font-down'></span>
          </span>
        </DropdownToggle>
        <DropdownMenu right={true} className="mt-1">
          <DropdownItem onClick={this.props.onAddRepo}>
            <span className='sf3-font sf3-font-new mr-2'></span>
            <span>{gettext('New Library')}</span>
          </DropdownItem>
        </DropdownMenu>
      </Dropdown>
    );
  }

}

AddRepos.propTypes = propTypes;

export default AddRepos;
