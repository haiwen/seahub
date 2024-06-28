import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { DropdownToggle, Dropdown, DropdownMenu, DropdownItem } from 'reactstrap';
import { Link, navigate } from '@gatsbyjs/reach-router';
import { Utils } from '../../utils/utils';
import { siteRoot, gettext } from '../../utils/constants';
import ModalPortal from '../modal-portal';
import CreateRepoDialog from '../dialog/create-repo-dialog';

const propTypes = {
  onCreateRepo: PropTypes.func.isRequired,
  moreShown: PropTypes.bool
};

class MyLibsToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isCreateRepoDialogOpen: false,
      isOpen: false,
    };
  }

  onCreateRepo = (repo) => {
    this.props.onCreateRepo(repo);
    this.onCreateToggle();
  };

  onCreateToggle = () => {
    this.setState({isCreateRepoDialogOpen: !this.state.isCreateRepoDialogOpen});
  };

  toggleMore = () => {
    this.setState({ isOpen: !this.state.isOpen });
  };

  onDropdownToggleKeyDown = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      this.toggleMore();
    }
  };

  visitDeletedviaKey = (e) => {
    if (e.key == 'Enter' || e.key == 'Space') {
      navigate(`${siteRoot}my-libs/deleted/`);
    }
  };

  render() {
    const { moreShown = false } = this.props;
    return (
      <Fragment>
        {Utils.isDesktop() ? (
          <div className="operation">
            <button className="btn btn-secondary operation-item" title={gettext('New Library')} onClick={this.onCreateToggle}>
              <i className="sf3-font sf3-font-enlarge text-secondary mr-1"></i>{gettext('New Library')}
            </button>
            {moreShown &&
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
            }
          </div>
        ) : (
          <span className="sf2-icon-plus mobile-toolbar-icon" title={gettext('New Library')} onClick={this.onCreateToggle}></span>
        )}
        {this.state.isCreateRepoDialogOpen && (
          <ModalPortal>
            <CreateRepoDialog
              libraryType='mine'
              onCreateRepo={this.onCreateRepo}
              onCreateToggle={this.onCreateToggle}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

MyLibsToolbar.propTypes = propTypes;

export default MyLibsToolbar;
