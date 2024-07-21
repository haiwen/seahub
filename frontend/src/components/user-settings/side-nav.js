import React from 'react';
import PropTypes from 'prop-types';

class SideNav extends React.Component {
  render() {
    return (
      <div className="side-nav">
        <div className="side-nav-con">
          <ul className="nav nav-pills flex-column">
            {this.props.data.map((item, index) => {
              return item.show ?
                <li key={index} className={`nav-item${this.props.curItemID == item.href.substr(1) ? ' active' : ''}`}><a className={`nav-link${this.props.curItemID == item.href.substr(1) ? ' active' : ''}`} href={item.href}>{item.text}</a></li> : null;
            })}
          </ul>
        </div>
      </div>
    );
  }
}

SideNav.propTypes = {
  curItemID: PropTypes.string.isRequired,
  data: PropTypes.array.isRequired,
};

export default SideNav;
