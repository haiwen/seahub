import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext, lang, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle, seafileVersion } from '../../utils/constants';

const propTypes = {
  onCloseAboutDialog: PropTypes.func.isRequired,
};

class AboutDialog extends React.Component {

  toggle = () => {
    this.props.onCloseAboutDialog();
  }

  render() {
    let href = lang === lang == 'zh-cn' ? 'http://seafile.com/about/' : 'http://seafile.com/en/about/';

    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalBody>
          <button type="button" className="close" onClick={this.toggle}><span aria-hidden="true">×</span></button>
          <div className="about-content">
            <p><img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" /></p>
            <p>{gettext('Server Version: ')}{seafileVersion}<br />© 2019 {gettext('Seafile')}</p>
            <p><a href={href} target="_blank">{gettext('About Us')}</a></p>
          </div>
        </ModalBody>
      </Modal>
    );
  }
}

AboutDialog.propTypes = propTypes;

export default AboutDialog;
