import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import CreateRepoDialog from '../dialog/create-repo-dialog';

const propTypes = {
  // isOwnLibrary: PropTypes.bool.isRequired,
  // libraryType: PropTypes.string.isRequired,
  onCreateRepo: PropTypes.func.isRequired,
};

class RepoViewToolbar extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      isCreateRepoDialogShow: false,
    };
  }

  onCreateRepo = (repo) => {
    this.props.onCreateRepo(repo);
    this.onCreateToggle();
  }

  onCreateToggle = () => {
    this.setState({isCreateRepoDialogShow: !this.state.isCreateRepoDialogShow});
  }

  render() {
    return (
      <Fragment>
        <div className="cur-view-toolbar border-left-show">
          <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
          <div className="operation">
            <button className="btn btn-secondary operation-item" title={gettext('New Library')} onClick={this.onCreateToggle}>
              <i className="fas fa-plus-square op-icon"></i>
              {gettext('New Library')}
            </button>
            <button className="btn btn-secondary operation-item" title={gettext('More')} onClick={this.onShareClick}>{gettext('More')}</button>
          </div>
        </div>
        {this.state.isCreateRepoDialogShow && (
          <ModalPortal>
            <CreateRepoDialog 
              onCreateRepo={this.onCreateRepo}
              onCreateToggle={this.onCreateToggle}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

RepoViewToolbar.propTypes = propTypes;

export default RepoViewToolbar;
