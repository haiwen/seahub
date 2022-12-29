import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';
import { Link, navigate } from '@gatsbyjs/reach-router';
import { siteRoot, gettext } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import CreateRepoDialog from '../dialog/create-repo-dialog';
import { DropdownToggle, Dropdown, DropdownMenu, DropdownItem } from 'reactstrap';

const propTypes = {
  libraryType: PropTypes.string.isRequired,
  onCreateRepo: PropTypes.func.isRequired,
  onShowSidePanel: PropTypes.func.isRequired,
};

class RepoViewToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isCreateRepoDialogShow: false,
      isOpen: false,
    };
  }

  onCreateRepo = (repo) => {
    this.props.onCreateRepo(repo);
    this.onCreateToggle();
  }

  onCreateToggle = () => {
    this.setState({isCreateRepoDialogShow: !this.state.isCreateRepoDialogShow});
  }

  toggleMore = () => {
    this.setState({ isOpen: !this.state.isOpen });
  }

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.toggleMore();
    }
  }

  visitDeletedviaKey = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      navigate(`${siteRoot}my-libs/deleted/`);
    }
  }

  render() {
    return (
      <Fragment>
        <div className="cur-view-toolbar">
          <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
          {Utils.isDesktop() ? (
            <div className="operation">
              <button className="btn btn-secondary operation-item" title={gettext('New Library')} onClick={this.onCreateToggle}>
                <i className="fas fa-plus-square text-secondary mr-1"></i>{gettext('New Library')}
              </button>
              <Dropdown isOpen={this.state.isOpen} toggle={this.toggleMore}>
                <DropdownToggle className='btn btn-secondary operation-item' onKeyDown={this.onDropdownToggleKeyDown}>
                  {gettext('More')}
                </DropdownToggle>
                <DropdownMenu>
                  <DropdownItem className="link-dropdown-container" onKeyDown={this.visitDeletedviaKey}>
                    <Link className="link-dropdown-item" to={siteRoot + 'my-libs/deleted/'}>{gettext('Deleted Libraries')}</Link>
                  </DropdownItem>
                </DropdownMenu>
              </Dropdown>
            </div>
          ) : (
            <span className="sf2-icon-plus mobile-toolbar-icon" title={gettext('New Library')} onClick={this.onCreateToggle}></span>
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

RepoViewToolbar.propTypes = propTypes;

export default RepoViewToolbar;
