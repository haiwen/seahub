import React, { Component } from 'react';
import PropTypes from 'prop-types';

const propTypes = {
  children: PropTypes.object.isRequired,
};

class MainPanel extends Component {

  render() {
    return (
      <div className="main-panel">
        {this.props.children}
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
