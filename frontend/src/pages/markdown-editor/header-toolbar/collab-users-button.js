import React from 'react';
import PropTypes from 'prop-types';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';

// 废弃组件
class CollabUsersButton extends React.PureComponent {

  constructor(props) {
    super(props);
    this.state = {
      dropdownOpen: false,
    };
  }

  dropdownToggle = () => {
    this.setState({ dropdownOpen: !this.state.dropdownOpen });
  };

  render() {
    return (
      <Dropdown className={this.props.className} isOpen={this.state.dropdownOpen} toggle={this.dropdownToggle}>
        <DropdownToggle tag="span" id={this.props.id}>
          <i className="iconfont icon-users"></i> {this.props.users.length}
        </DropdownToggle>
        <DropdownMenu className={'drop-list'}>
          {this.props.users.map((ele, idx) => (
            <DropdownItem key={idx}>
              <i className={ele.is_editing ? 'iconfont icon-edit' : 'iconfont icon-user'}></i> {ele.user.name} {ele.myself ? '(you)' : ''}
            </DropdownItem>
          ))}
        </DropdownMenu>
      </Dropdown>
    );
  }

}

CollabUsersButton.propTypes = {
  className: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  users: PropTypes.array.isRequired,
};

export default CollabUsersButton;
