import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext, lang, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle, seafileVersion, additionalAboutDialogLinks, aboutDialogCustomHtml } from '../../utils/constants';

const propTypes = {
  onCloseAboutDialog: PropTypes.func.isRequired,
};

class AboutDialog extends React.Component {

  renderExternalAboutLinks = () => {
    if (additionalAboutDialogLinks && (typeof additionalAboutDialogLinks) === 'object') {
      let keys = Object.keys(additionalAboutDialogLinks);
      return keys.map((key, index) => {
        return <a key={index} className="d-block" href={additionalAboutDialogLinks[key]}>{key}</a>;
      });
    }
    return null;
  }

  render() {

    let href = lang === lang == 'zh-cn' ? 'http://seafile.com/about/' : 'http://seafile.com/en/about/';
    const { onCloseAboutDialog: toggleDialog } = this.props;

    if (aboutDialogCustomHtml) {
      return (
        <Modal isOpen={true} toggle={toggleDialog}>
          <ModalBody>
            <button type="button" className="close" onClick={toggleDialog}><span aria-hidden="true">×</span></button>
            <div className="about-content" dangerouslySetInnerHTML={{__html: aboutDialogCustomHtml}}></div>
          </ModalBody>
        </Modal>
      );
    } else {
      return (
        <Modal isOpen={true} toggle={toggleDialog}>
          <ModalBody>
            <button type="button" className="close" onClick={toggleDialog}><span aria-hidden="true">×</span></button>
            <div className="about-content">
              <p><img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" /></p>
              <p>{gettext('Server Version: ')}{seafileVersion}<br />© {(new Date()).getFullYear()} {gettext('Seafile')}</p>
              <p>{this.renderExternalAboutLinks()}</p>
              <p><a href={href} target="_blank">{gettext('About Us')}</a></p>
            </div>
          </ModalBody>
        </Modal>
      );
    }
  }
}

AboutDialog.propTypes = propTypes;

export default AboutDialog;
