import React from 'react';
import classnames from 'classnames';
import PropTypes from 'prop-types';
import Logo from '@/components/logo';
import SideNav from '@/components/user-settings/side-nav';

const propTypes = {
  isSidePanelClosed: PropTypes.bool,
  curItemID: PropTypes.string.isRequired,
  data: PropTypes.array.isRequired,
  onCloseSidePanel: PropTypes.func.isRequired,
};

class SidePanel extends React.Component {
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

SidePanel.propTypes = propTypes;

export default SidePanel;
