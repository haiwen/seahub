import React, { Component } from 'react';
import PropTypes from 'prop-types';
import CommonToolbar from './toolbar/common-toolbar';

const propTypes = {
  children: PropTypes.object.isRequired,
  onShowSidePanel: PropTypes.func.isRequired,
};

class MainPanel extends Component {

  onSearchedClick = () => {
    //todos;
  }

  render() {
    return (
      <div className="main-panel o-hidden">
        <div className="main-panel-north">
          <div className="cur-view-toolbar">
            <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
          </div>
          <CommonToolbar onSearchedClick={this.onSearchedClick} searchPlaceholder={'Search Files'}/>
        </div>
        <div className="main-panel-center">
          {this.props.children}
        </div>
      </div>
    );
  }
}

MainPanel.propTypes = propTypes;

export default MainPanel;
