import React from 'react';
import PropTypes from 'prop-types';
import { siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle, gettext } from '../utils/constants';
import Icon from './icon';

const propTypes = {
  onCloseSidePanel: PropTypes.func,
  showCloseSidePanelIcon: PropTypes.bool,
};

class Logo extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      colorMode: typeof document !== 'undefined' ? document.body.getAttribute('data-bs-theme') : 'light'
    };
  }

  componentDidMount() {
    // Listen for color mode changes
    this.observer = new MutationObserver(this.handleThemeChange);
    if (typeof document !== 'undefined') {
      this.observer.observe(document.body, { attributes: true, attributeFilter: ['data-bs-theme'] });
    }
  }

  componentWillUnmount() {
    if (this.observer) {
      this.observer.disconnect();
    }
  }

  handleThemeChange = () => {
    if (typeof document !== 'undefined') {
      const colorMode = document.body.getAttribute('data-bs-theme');
      this.setState({ colorMode });
    }
  };

  closeSide = () => {
    this.props.onCloseSidePanel();
  };

  getLogoSrc = () => {
    const { colorMode } = this.state;
    // Check if logoPath is a custom path (not default logo)
    const isDefaultLogo = logoPath === 'img/seafile-logo.png';
    let path = logoPath;
    if (colorMode === 'dark' && isDefaultLogo) {
      path = logoPath.replace('.png', '-dark.png');
    }
    return path.indexOf('image-view') !== -1 ? path : mediaUrl + path;
  };

  render() {
    return (
      <div className='top-logo'>
        <a href={siteRoot} id="logo" aria-label={siteTitle} title={siteTitle}>
          <img src={this.getLogoSrc()} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" />
        </a>
        {this.props.showCloseSidePanelIcon &&
          <a
            className="sf-popover-close side-panel-close action-icon d-md-none"
            role="button"
            tabIndex="0"
            onClick={this.closeSide}
            title={gettext('Close')}
            aria-label={gettext('Close')}
          >
            <Icon symbol="close" />
          </a>
        }
      </div>
    );
  }
}

Logo.propTypes = propTypes;

export default Logo;
