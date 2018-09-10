import React from 'react';
import PropsType from 'prop-types';

const siteRoot = window.app.config.siteRoot;
const mediaUrl = window.app.config.mediaUrl;
const logoPath =  window.app.config.logoPath;
const logoWidth = window.app.config.logoWidth;
const logoHeight = window.app.config.logoHeight;
const siteTitle = window.app.config.siteTitle;

const propsType = {
  onCloseSidePanel: PropsType.func.isRequired,
};

class Logo extends React.Component {

  closeSide = () => {
    this.props.onCloseSidePanel();
  }
  
  render() {
    return (
      <div className="logo">
        <a href={siteRoot} id="logo">
          <img 
            src={mediaUrl + logoPath}
            height={logoHeight}
            width={logoWidth}
            title={siteTitle} 
            alt="logo" 
          />
        </a>
        <a 
          className="sf2-icon-x1 sf-popover-close side-panel-close op-icon d-md-none"
          onClick={this.closeSide} 
          title="Close" 
          aria-label="Close" 
        >
        </a>
      </div>
    );
  }
}

Logo.propsType = propsType;

export default Logo;
