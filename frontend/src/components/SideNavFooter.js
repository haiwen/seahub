import React from 'react';

import { Modal, ModalHeader, ModalBody } from 'reactstrap';

class About extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      modal: false
    };

    this.toggle = this.toggle.bind(this);
  }

  toggle() {
    this.setState({
      modal: !this.state.modal
    });
  }

  render() {
    return (
      <div>
        <a href="#" className="item" onClick={this.toggle}>About</a>
        <Modal isOpen={this.state.modal} toggle={this.toggle} className={this.props.className}>
          <ModalHeader toggle={this.toggle}>About</ModalHeader>
          <ModalBody>
             <div className="about-content">
               <p><img src="/media/img/seafile-logo.png" title="Private Seafile" alt="logo" width="128" height="32" /></p>
               <p>Server Version: 6.3.3<br /> © 2018 Seafile</p>
               <p><a href="http://seafile.com/about/" target="_blank">About Us</a></p>
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
        <a href="/help/" target="_blank" className="item">Help</a>
        <About />
        <a href="/download_client_program/" className="item last-item">
          <span aria-hidden="true" className="sf2-icon-monitor vam"></span>{' '}
          <span className="vam">Clients</span>
        </a>
      </div>
    );
  }
}

export default SideNavFooter;
