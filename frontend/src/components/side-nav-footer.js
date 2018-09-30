import React from 'react';
import { gettext, siteRoot } from './constants';
import { Modal, ModalBody } from 'reactstrap';

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

  render() {
    return (
      <div>
        <a href="#" className="item" onClick={this.toggle}>{gettext('About')}</a>
        <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
          <ModalBody>
            <div className="about-content">
              <p><img src="/media/img/seafile-logo.png" title="Private Seafile" alt="logo" width="128" height="32" /></p>
              <p>{gettext('Server Version: 6.3.3')}<br />{gettext('© 2018 Seafile')}</p>
              <p><a href="http://seafile.com/about/" target="_blank">{gettext('About Us')}</a></p>
            </div>
          </ModalBody>
        </Modal>
      </div>
    );
  }
}

class SideNavFooter extends React.Component {
  render() {
    return (
      <div className="side-nav-footer">
        <a href={siteRoot + 'help/'} target="_blank" className="item">{gettext('Help')}</a>
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
