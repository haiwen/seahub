import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle, gettext } from '../utils/constants';

const propTypes = {
  onCloseSidePanel: PropTypes.func,
  showCloseSidePanelIcon: PropTypes.bool,
};

class Logo extends React.Component {

  closeSide = () => {
    this.props.onCloseSidePanel();
  };

  getLogoSrc = () => {
    let isDark = false;
    if (typeof document !== 'undefined') {
      isDark = document.body.getAttribute('data-bs-theme') === 'dark';
    }
    const path = isDark ? logoPath.replace('.png', '-dark.png') : logoPath;
    return path.indexOf('image-view') != -1 ? path : mediaUrl + path;
  };

  render() {
    return (
      <div className='top-logo'>
        <a href={siteRoot} id="logo">
          <img src={this.getLogoSrc()} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
        </a>
        {this.props.showCloseSidePanelIcon &&
          <a
            className="sf2-icon-x1 sf-popover-close side-panel-close action-icon d-md-none"
            onClick={this.closeSide}
            title={gettext('Close')}
            aria-label={gettext('Close')}
          >
          </a>
        }
      </div>
    );
  }
}

Logo.propTypes = propTypes;

export default Logo;
