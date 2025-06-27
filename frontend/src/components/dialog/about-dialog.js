import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalBody } from 'reactstrap';
import { gettext, lang, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle, seafileVersion, additionalAboutDialogLinks, aboutDialogCustomHtml } from '../../utils/constants';
import '../../css/seahub-modal-header.css';

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
  };

  render() {
    let href = lang === 'zh-cn' ? 'http://seafile.com/about/' : 'http://seafile.com/en/about/';
    const { onCloseAboutDialog: toggleDialog } = this.props;

    if (aboutDialogCustomHtml) {
      return (
        <Modal isOpen={true} toggle={toggleDialog}>
          <ModalBody>
            <button type="button" className="close seahub-modal-btn p-0" aria-label={gettext('Close')} title={gettext('Close')} onClick={toggleDialog}>
              <span className="seahub-modal-btn-inner">
                <i className="sf3-font sf3-font-x-01" aria-hidden="true"></i>
              </span>
            </button>
            <div className="about-content" dangerouslySetInnerHTML={{ __html: aboutDialogCustomHtml }}></div>
          </ModalBody>
        </Modal>
      );
    } else {
      return (
        <Modal isOpen={true} toggle={toggleDialog}>
          <ModalBody>
            <button type="button" className="close seahub-modal-btn p-0" aria-label={gettext('Close')} title={gettext('Close')} onClick={toggleDialog}>
              <span className="seahub-modal-btn-inner">
                <i className="sf3-font sf3-font-x-01" aria-hidden="true"></i>
              </span>
            </button>
            <div className="about-content">
              <p><img src={mediaUrl + logoPath} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" /></p>
              <p>{gettext('Server Version: ')}{seafileVersion}<br />© {(new Date()).getFullYear()} {gettext('Seafile')}</p>
              <p>{this.renderExternalAboutLinks()}</p>
              <p><a href={href} target="_blank" rel="noreferrer">{gettext('About Us')}</a></p>
            </div>
          </ModalBody>
        </Modal>
      );
    }
  }
}

AboutDialog.propTypes = propTypes;

export default AboutDialog;
