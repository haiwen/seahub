import React from 'react';
import { gettext, siteRoot, sideNavFooterCustomHtml } from '../utils/constants';
import ModalPortal from './modal-portal';
import AboutDialog from './dialog/about-dialog';

class SideNavFooter extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isAboutDialogShow: false,
    };
  }

  onAboutDialogToggle = () => {
    this.setState({isAboutDialogShow: !this.state.isAboutDialogShow});
  }

  render() {
    if (sideNavFooterCustomHtml === "") {
      return (
        <div className="side-nav-footer">
          <a href={siteRoot + 'help/'} target="_blank" rel="noopener noreferrer" className="item">{gettext('Help')}</a>
          <a className="item cursor-pointer" onClick={this.onAboutDialogToggle}>{gettext('About')}</a>
          <a href={siteRoot + 'download_client_program/'} className="item last-item">
            <span aria-hidden="true" className="sf2-icon-monitor vam"></span>{' '}
            <span className="vam">{gettext('Clients')}</span>
          </a>
          {this.state.isAboutDialogShow &&
            <ModalPortal>
              <AboutDialog onCloseAboutDialog={this.onAboutDialogToggle} />
            </ModalPortal>
          }
        </div>
      );
    } else {
      return (<div className='side-nav-footer' dangerouslySetInnerHTML={{__html: sideNavFooterCustomHtml}}></div>);
    }
  }
}

export default SideNavFooter;
