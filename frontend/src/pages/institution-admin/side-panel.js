import React from 'react';
import PropTypes from 'prop-types';
import { Link } from '@gatsbyjs/reach-router';
import Logo from '../../components/logo';
import { gettext, siteRoot, institutionName } from '../../utils/constants';
import Icon from '../../components/icon';

const propTypes = {
  isSidePanelClosed: PropTypes.bool.isRequired,
  onCloseSidePanel: PropTypes.func.isRequired,
};

class SidePanel extends React.Component {

  render() {
    return (
      <div className={`side-panel ${this.props.isSidePanelClosed ? '' : 'left-zero'}`}>
        <div className="side-panel-north">
          <Logo onCloseSidePanel={this.props.onCloseSidePanel}/>
        </div>
        <div className="side-panel-center">
          <div className="side-nav">
            <div className="side-nav-con">
              <h3 className="sf-heading">{institutionName}</h3>
              <ul className="nav nav-pills flex-column nav-container">
                <li className="nav-item">
                  <Link className="nav-link ellipsis active" to={`${siteRoot}inst/useradmin/`}>
                    <Icon symbol="info" />
                    <span className="nav-text">{gettext('Users')}</span>
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

SidePanel.propTypes = propTypes;

export default SidePanel;
