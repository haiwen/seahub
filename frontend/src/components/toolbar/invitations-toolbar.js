import React from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import CommonToolbar from './common-toolbar';
import { Button } from 'reactstrap';
import { gettext } from '../../utils/constants';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
};

class InvitationsToolbar extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let { onShowSidePanel, onSearchedClick } = this.props;
    return (
      <div className="main-panel-north border-left-show">
        <div className="cur-view-toolbar">
          <span title="Side Nav Menu" onClick={onShowSidePanel}
            className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none">
          </span>

          <MediaQuery query="(min-width: 768px)">
            <div className="operation">
              <Button color="btn btn-secondary operation-item" >
                <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('Invite People')}
              </Button>
            </div>
          </MediaQuery>
          <MediaQuery query="(max-width: 768px)">
            <span className="sf2-icon-plus mobile-toolbar-icon" title={gettext('Invite People')}></span>
          </MediaQuery>
        </div>
        <CommonToolbar searchPlaceholder={this.props.searchPlaceholder} onSearchedClick={onSearchedClick}/>
      </div>
    );
  }
}


export default InvitationsToolbar;
