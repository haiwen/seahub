import React from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  onSaveClick: PropTypes.func.isRequired,
};

class CustomToolbar extends React.Component {

  render() {
    return (
      <div className="umind-custom-toolbar">
        <div onClick={this.props.onSaveClick}>保存</div>
      </div>
    );
  }
}

CustomToolbar.propTypes = propTypes;

export default CustomToolbar;
