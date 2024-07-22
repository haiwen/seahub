import React from 'react';
import PropTypes from 'prop-types';
import Logo from '../logo';
import classnames from 'classnames';
import SideNav from './side-nav';

const propTypes = {
  isSidePanelClosed: PropTypes.bool,
  curItemID: PropTypes.string.isRequired,
  data: PropTypes.array.isRequired,
  onCloseSidePanel: PropTypes.func.isRequired,
};

class SettingSidePanel extends React.Component {
  render() {
    return (
      <div className={classnames('side-panel', { 'left-zero': !this.props.isSidePanelClosed })}>
        <div className="side-panel-north">
          <Logo onCloseSidePanel={this.props.onCloseSidePanel}/>
        </div>
        <div className="side-panel-center">
          <SideNav data={this.props.data} curItemID={this.props.curItemID} />
        </div>
      </div>
    );
  }
}

SettingSidePanel.propTypes = propTypes;

export default SettingSidePanel;
