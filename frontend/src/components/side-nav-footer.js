import React, { Fragment } from 'react';
import { gettext, siteRoot, sideNavFooterCustomHtml, extraAppBottomLinks } from '../utils/constants';
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

  renderExternalAppLinks = () => {
    if (extraAppBottomLinks && (typeof extraAppBottomLinks) === 'object') {
      let keys = Object.keys(extraAppBottomLinks);
      return keys.map((key, index) => {
        return <a key={index} className="item" href={extraAppBottomLinks[key]} aria-hidden="true">{key}</a>;
      });
    }
    return null;
  }

  render() {

    if (sideNavFooterCustomHtml) {
      return (<div className='side-nav-footer' dangerouslySetInnerHTML={{__html: sideNavFooterCustomHtml}}></div>);
    }
    return (
      <Fragment>
        <div className="side-nav-footer flex-wrap">
          <a href={siteRoot + 'help/'} target="_blank" rel="noopener noreferrer" className="item">{gettext('Help')}</a>
          <a className="item cursor-pointer" onClick={this.onAboutDialogToggle}>{gettext('About')}</a>
          {this.renderExternalAppLinks()}
          <a href={siteRoot + 'download_client_program/'} className={`item ${extraAppBottomLinks ? '' : 'last-item'}`}>
            <span aria-hidden="true" className="sf2-icon-monitor vam"></span>{' '}
            <span className="vam">{gettext('Clients')}</span>
          </a>
        </div>
        {this.state.isAboutDialogShow && (
          <ModalPortal>
            <AboutDialog onCloseAboutDialog={this.onAboutDialogToggle} />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

export default SideNavFooter;
