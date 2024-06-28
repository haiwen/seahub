import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import MediaQuery from 'react-responsive';
import { Dropdown, DropdownToggle, DropdownMenu, DropdownItem } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import Repo from '../../models/repo';
import toaster from '../../components/toast';
import ModalPortal from '../../components/modal-portal';
import CreateRepoDialog from '../../components/dialog/create-repo-dialog';
import ShareRepoDialog from '../../components/dialog/share-repo-dialog';

const propTypes = {
  onShowSidePanel: PropTypes.func.isRequired,
  addRepoItem: PropTypes.func.isRequired
};

class TopToolbar extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      libraryType: 'public',
      isCreateMenuShow: false,
      isCreateRepoDialogShow: false,
      isSelectRepoDialpgShow: false,
    };
  }

  onCreateRepo = (repo) => {
    seafileAPI.createPublicRepo(repo).then(res => {
      let object = {
        repo_id: res.data.id,
        repo_name: res.data.name,
        permission: res.data.permission,
        size: res.data.size,
        owner_name: res.data.owner_name,
        owner_email: res.data.owner,
        mtime: res.data.mtime,
        encrypted: res.data.encrypted,
      };
      let repo = new Repo(object);
      this.props.addRepoItem(repo);
      this.onCreateRepoToggle();
    }).catch((error) => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  };

  onRepoSelectedHandler = (selectedRepoList) => {
    selectedRepoList.forEach(repo => {
      seafileAPI.selectOwnedRepoToPublic(repo.repo_id, {share_type: 'public', permission: repo.sharePermission}).then(() => {
        this.props.addRepoItem(repo);
      }).catch((error) => {
        let errMessage = Utils.getErrorMsg(error);
        toaster.danger(errMessage);
      });
    });
  };

  onAddRepoToggle = () => {
    this.setState({isCreateMenuShow: !this.state.isCreateMenuShow});
  };

  onCreateRepoToggle = () => {
    this.setState({isCreateRepoDialogShow: !this.state.isCreateRepoDialogShow});
  };

  onSelectRepoToggle = () => {
    this.setState({isSelectRepoDialpgShow: !this.state.isSelectRepoDialpgShow});
  };

  render() {
    return (
      <Fragment>
        <div className="cur-view-toolbar">
          <span className="sf2-icon-menu side-nav-toggle hidden-md-up d-md-none" title="Side Nav Menu" onClick={this.props.onShowSidePanel}></span>
          <div className="operation">
            <Dropdown isOpen={this.state.isCreateMenuShow} toggle={this.onAddRepoToggle}>
              <MediaQuery query="(min-width: 768px)">
                <DropdownToggle className='btn btn-secondary operation-item'>
                  <i className="sf3-font sf3-font-enlarge text-secondary mr-1"></i>{gettext('Add Library')}
                </DropdownToggle>
              </MediaQuery>
              <MediaQuery query="(max-width: 767.8px)">
                <DropdownToggle
                  tag="span"
                  className="sf2-icon-plus mobile-toolbar-icon"
                  title={gettext('Add Library')}
                />
              </MediaQuery>
              <DropdownMenu>
                <DropdownItem onClick={this.onSelectRepoToggle}>{gettext('Share existing libraries')}</DropdownItem>
                <DropdownItem onClick={this.onCreateRepoToggle}>{gettext('New Library')}</DropdownItem>
              </DropdownMenu>
            </Dropdown>
          </div>
        </div>
        {this.state.isCreateRepoDialogShow && (
          <ModalPortal>
            <CreateRepoDialog
              libraryType={this.state.libraryType}
              onCreateToggle={this.onCreateRepoToggle}
              onCreateRepo={this.onCreateRepo}
            />
          </ModalPortal>
        )}
        {this.state.isSelectRepoDialpgShow && (
          <ModalPortal>
            <ShareRepoDialog
              onRepoSelectedHandler={this.onRepoSelectedHandler}
              onShareRepoDialogClose={this.onSelectRepoToggle}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

TopToolbar.propTypes = propTypes;

export default TopToolbar;
