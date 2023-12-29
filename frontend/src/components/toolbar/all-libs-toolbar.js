import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { gettext, canAddRepo } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import CreateRepoDialog from '../dialog/create-repo-dialog';

const propTypes = {
  libraryType: PropTypes.string.isRequired,
  onCreateRepo: PropTypes.func.isRequired,
  onShowSidePanel: PropTypes.func.isRequired,
};

class AllLibsToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isCreateRepoDialogShow: false,
    };
  }

  onCreateRepo = (repo) => {
    this.props.onCreateRepo(repo);
    this.onCreateToggle();
  };

  onCreateToggle = () => {
    this.setState({isCreateRepoDialogShow: !this.state.isCreateRepoDialogShow});
  };

  render() {
    return (
      <Fragment>
        <div className="cur-view-toolbar">
          <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
          {Utils.isDesktop() ? (
            <div className="operation">
              {canAddRepo &&
              <button className="btn btn-secondary operation-item" title={gettext('New Library')} onClick={this.onCreateToggle}>
                <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('New Library')}
              </button>
              }
            </div>
          ) : (
            <>{canAddRepo && (<span className="sf2-icon-plus mobile-toolbar-icon" title={gettext('New Library')} onClick={this.onCreateToggle}></span>)}</>
          )}
        </div>
        {this.state.isCreateRepoDialogShow && (
          <ModalPortal>
            <CreateRepoDialog
              libraryType={this.props.libraryType}
              onCreateRepo={this.onCreateRepo}
              onCreateToggle={this.onCreateToggle}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

AllLibsToolbar.propTypes = propTypes;

export default AllLibsToolbar;
