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
    let placeHolder = this.props.searchPlaceholder || 'Search files in this library';
    return (
      <div className="main-panel-north">
        <div className="cur-view-toolbar">
          <div className="operation">
            <Button color="btn btn-secondary operation-item" onClick={this.props.toggleAddGroupModal}>
              <i className="fas fa-plus-square op-icon"></i>{gettext("New Group")}
            </Button>
          </div>
          <span title="Side Nav Menu" onClick={onShowSidePanel}
            className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none">
          </span>
        </div>
        <CommonToolbar searchPlaceholder={placeHolder} onSearchedClick={onSearchedClick}/>
      </div>
    );
  }
}

GroupsToolbar.propTypes = propTypes;

export default GroupsToolbar;
