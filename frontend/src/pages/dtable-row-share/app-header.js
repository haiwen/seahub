import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {

};

class AppHeader extends React.Component {

  render() {
    return (
      <div className="app-header">
        <div className="title">dtable 分享信息</div>
      </div>
    );
  }
}

AppHeader.propTypes = propTypes;

export default AppHeader;
