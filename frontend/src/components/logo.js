import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from '../utils/constants';

const propTypes = {
  onCloseSidePanel: PropTypes.func,
  showCloseSidePanelIcon: PropTypes.bool,
};

class Logo extends React.Component {

  closeSide = () => {
    this.props.onCloseSidePanel();
  }

  render() {
    return (
      <div className="top-logo">
        <a href={siteRoot} id="logo">
          <img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
        </a>
        {this.props.showCloseSidePanelIcon &&
          <a
            className="sf2-icon-x1 sf-popover-close side-panel-close action-icon d-md-none"
            onClick={this.closeSide}
            title="Close"
            aria-label="Close"
          >
          </a>
        }
      </div>
    );
  }
}

Logo.propTypes = propTypes;

export default Logo;
