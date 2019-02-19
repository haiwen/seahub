import React from 'react';
import PropTypes from 'prop-types';
import CommonToolbar from './common-toolbar';
import { Button } from 'reactstrap';
import { gettext } from '../../utils/constants';

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
          <div className="operation">
            <Button color="btn btn-secondary operation-item" onClick={this.props.toggleAddGroupModal}>
              <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('New Group')}
            </Button>
          </div>
          <span title="Side Nav Menu" onClick={onShowSidePanel}
            className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none">
          </span>
        </div>
        <CommonToolbar searchPlaceholder={this.props.searchPlaceholder} onSearchedClick={onSearchedClick}/>
      </div>
    );
  }
}

GroupsToolbar.propTypes = propTypes;

export default GroupsToolbar;
