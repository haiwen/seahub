import React from 'react';
import PropTypes from 'prop-types';
import CustomDropdown from '../../../components/dropdown';

class CollabUsersButton extends React.PureComponent {

  render() {
    const items = this.props.users.map((ele, idx) => ({
      key: idx,
      label: <><i className={ele.is_editing ? 'iconfont icon-edit' : 'iconfont icon-user'}></i> {ele.user.name} {ele.myself ? '(you)' : ''}</>,
    }));

    return (
      <CustomDropdown
        className={this.props.className}
        target={this.props.id}
        items={items}
        trigger={<><i className="iconfont icon-users"></i> {this.props.users.length}</>}
        menuClassName="drop-list"
        menuPortal={false}
      />
    );
  }
}

CollabUsersButton.propTypes = {
  className: PropTypes.string.isRequired,
  id: PropTypes.string.isRequired,
  users: PropTypes.array.isRequired,
};

export default CollabUsersButton;
