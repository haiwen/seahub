import React from 'react';
import { Modal, ModalBody } from 'reactstrap';
import PropTypes from 'prop-types';
import { gettext, lang, mediaUrl, logoPath, logoWidth, logoHeight, siteTitle, seafileVersion, additionalAboutDialogLinks, aboutDialogCustomHtml } from '../../utils/constants';
import SeahubModalCloseIcon from '../seahub-modal-close';

const propTypes = {
  onCloseAboutDialog: PropTypes.func.isRequired,
};

class AboutDialog extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      colorMode: typeof document !== 'undefined' ? document.body.getAttribute('data-bs-theme') : 'light'
    };
  }

  componentDidMount() {
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

  getLogoSrc = () => {
    const { colorMode } = this.state;
    const isCustomLogo = logoPath.startsWith('custom/');
    let path = logoPath;
    if (colorMode === 'dark' && !isCustomLogo) {
      path = logoPath.replace('.png', '-dark.png');
    }
    return path.indexOf('image-view') !== -1 ? path : mediaUrl + path;
  };

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
            <SeahubModalCloseIcon toggle={toggleDialog} className="float-end p-0" />
            <div className="about-content" dangerouslySetInnerHTML={{ __html: aboutDialogCustomHtml }}></div>
          </ModalBody>
        </Modal>
      );
    } else {
      return (
        <Modal isOpen={true} toggle={toggleDialog}>
          <ModalBody>
            <SeahubModalCloseIcon toggle={toggleDialog} className="float-end p-0" />
            <div className="about-content">
              <p><img src={this.getLogoSrc()} height={logoHeight} width={logoWidth} title={siteTitle} alt="logo" /></p>
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
