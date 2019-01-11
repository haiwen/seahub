import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext, lang, siteRoot, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle, seafileVersion } from '../utils/constants';

const propTypes = {
  className: PropTypes.string, 
};

class About extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: false
    };
  }

  toggle = () => {
    this.setState({
      modal: !this.state.modal
    });
  }

  aboutUrl = () => {
    let url;
    if (lang == 'zh-cn') {
      url = 'http://seafile.com/about/';
      return url; 
    }
    url = 'http://seafile.com/en/about/';
    return url; 
  }

  render() {
    return (
      <div>
        <a href="#" className="item" onClick={this.toggle}>{gettext('About')}</a>
        <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
          <ModalBody>
            <button type="button" className="close" onClick={this.toggle}><span aria-hidden="true">×</span></button>
            <div className="about-content">
              <p><img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" /></p>
              <p>{gettext('Server Version: ')}{seafileVersion}<br />© 2019 {gettext('Seafile')}</p>
              <p><a href={this.aboutUrl()} target="_blank">{gettext('About Us')}</a></p>
            </div>
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

About.propTypes = propTypes;

class SideNavFooter extends React.Component {
  render() {
    return (
      <div className="side-nav-footer">
        <a href={siteRoot + 'help/'} target="_blank" rel="noopener noreferrer" className="item">{gettext('Help')}</a>
        <About />
        <a href={siteRoot + 'download_client_program/'} className="item last-item">
          <span aria-hidden="true" className="sf2-icon-monitor vam"></span>{' '}
          <span className="vam">{gettext('Clients')}</span>
        </a>
      </div>
    );
  }
}

export default SideNavFooter;
