import React from 'react';
import PropsType from 'prop-types';
import { siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle } from './constants'; 

const propsType = {
  onCloseSidePanel: PropsType.func.isRequired,
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
