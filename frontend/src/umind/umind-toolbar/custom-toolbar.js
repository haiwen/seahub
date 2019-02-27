import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {

};

class CustomToolbar extends React.Component {

  render() {
    return (
      <div className="umind-custom-toolbar">
        <div>保存</div>
      </div>
    );
  }
}

CustomToolbar.propTypes = propTypes;

export default CustomToolbar;
