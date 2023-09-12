import React from 'react';
import PropTypes from 'prop-types';

class SideNav extends React.Component {
  render() {
    return (
      <ul className="nav flex-column user-setting-nav">
        {this.props.data.map((item, index) => {
          return item.show ?
            <li key={index} className={`nav-item${this.props.curItemID == item.href.substr(1) ? ' active' : ''}`}><a className="nav-link" href={item.href}>{item.text}</a></li> : null;
        })}
      </ul>
    );
  }
}

SideNav.propTypes = {
  curItemID: PropTypes.string.isRequired,
  data: PropTypes.array.isRequired,
};

export default SideNav;
