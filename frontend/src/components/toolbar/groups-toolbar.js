import React from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import CommonToolbar from './common-toolbar';
import { Button } from 'reactstrap';
import { gettext, canAddGroup } from '../../utils/constants';

const propTypes = {
  searchPlaceholder: PropTypes.string,
  onShowSidePanel: PropTypes.func.isRequired,
  onSearchedClick: PropTypes.func.isRequired,
  toggleAddGroupModal: PropTypes.func.isRequired,
};

class GroupsToolbar extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    let { onShowSidePanel, onSearchedClick } = this.props;
    return (
      <div className="main-panel-north border-left-show">
        <div className="cur-view-toolbar">
          <span title="Side Nav Menu" onClick={onShowSidePanel} className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none"></span>
          {canAddGroup && (
            <div className="operation">
              <MediaQuery query="(min-width: 768px)">
                <Button color="btn btn-secondary operation-item" onClick={this.props.toggleAddGroupModal}>
                  <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('New Group')}
                </Button>
              </MediaQuery>
              <MediaQuery query="(max-width: 767.8px)">
                <span className="sf2-icon-plus mobile-toolbar-icon" title={gettext('New Group')} onClick={this.props.toggleAddGroupModal}></span>
              </MediaQuery>
            </div>
          )}
        </div>
        <CommonToolbar searchPlaceholder={this.props.searchPlaceholder} onSearchedClick={onSearchedClick}/>
      </div>
    );
  }
}

GroupsToolbar.propTypes = propTypes;

export default GroupsToolbar;
