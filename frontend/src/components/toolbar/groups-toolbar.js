import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext } from '../../utils/constants';
import CreateGroupDialog from '../../components/dialog/create-group-dialog';

const propTypes = {
  onCreateGroup: PropTypes.func.isRequired
};

class GroupsToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isDialogOpen: false
    };
  }

  toggleDialog = () => {
    this.setState({
      isDialogOpen: !this.state.isDialogOpen
    });
  };

  render() {
    return (
      <>
        {Utils.isDesktop() ? (
          <div className="operation">
            <button className="btn btn-secondary operation-item" onClick={this.toggleDialog}>
              <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('New Group')}
            </button>
          </div>
        ) : (
          <span className="sf2-icon-plus mobile-toolbar-icon" title={gettext('New Group')} onClick={this.toggleDialog}></span>
        )}
        {this.state.isDialogOpen &&
          <CreateGroupDialog
            toggleDialog={this.toggleDialog}
            onCreateGroup={this.props.onCreateGroup}
          />
        }
      </>
    );
  }
}

GroupsToolbar.propTypes = propTypes;

export default GroupsToolbar;
