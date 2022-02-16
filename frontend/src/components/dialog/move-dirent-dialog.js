import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalFooter, ModalBody, Alert } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import FileChooser from '../file-chooser/file-chooser';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  selectedDirentList: PropTypes.array,
  isMutipleOperation: PropTypes.bool.isRequired,
  onItemMove: PropTypes.func,
  onItemsMove: PropTypes.func,
  onCancelMove: PropTypes.func.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
};

// need dirent file Path；
class MoveDirent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: { repo_id: this.props.repoID },
      selectedPath: this.props.path,
      errMessage: ''
    };
  }

  shouldComponentUpdate(nextProps, nextState) {
    if (this.state.errMessage === nextState.errMessage) {
      return false;
    }
    return true;
  }

  handleSubmit = () => {
    if (this.props.isMutipleOperation) {
      this.moveItems();
    } else {
      this.moveItem();
    }
  }

  moveItems = () => {
    let { repoID } = this.props;
    let { repo, selectedPath } = this.state;
    let message = gettext('Invalid destination path');

    if (!repo || selectedPath === '') {
      this.setState({errMessage: message});
      return;
    }

    let selectedDirentList = this.props.selectedDirentList;
    let direntPaths = [];
    selectedDirentList.forEach(dirent => {
      let path = Utils.joinPath(this.props.path, dirent.name);
      direntPaths.push(path);
    });

    // move dirents to one of them. eg: A/B, A/C -> A/B
    if (direntPaths.some(direntPath => { return direntPath === selectedPath;})) {
      this.setState({errMessage: message});
      return;
    }

    // move dirents to current path
    if (selectedPath && selectedPath === this.props.path && (repo.repo_id === repoID)) {
      this.setState({errMessage: message});
      return;
    }

    // move dirents to one of their child. eg: A/B, A/D -> A/B/C
    let moveDirentPath = '';
    let isChildPath = direntPaths.some(direntPath => {
      let flag = selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1;
      if (flag) {
        moveDirentPath = direntPath;
      }
      return flag;
    });

    if (isChildPath) {
      message = gettext('Can not move directory %(src)s to its subdirectory %(des)s');
      message = message.replace('%(src)s', moveDirentPath);
      message = message.replace('%(des)s', selectedPath);
      this.setState({errMessage: message});
      return;
    }

    this.props.onItemsMove(repo, selectedPath);
    this.toggle();
  }

  moveItem = () => {
    let { repoID } = this.props;
    let { repo, selectedPath } = this.state;
    let direntPath = Utils.joinPath(this.props.path, this.props.dirent.name);
    let message = gettext('Invalid destination path');

    if (!repo || (repo.repo_id === repoID && selectedPath === '')) {
      this.setState({errMessage: message});
      return;
    }

    // copy the dirent to itself. eg: A/B -> A/B
    if (selectedPath && direntPath === selectedPath) {
      this.setState({errMessage: message});
      return;
    }

    // copy the dirent to current path
    if (selectedPath && this.props.path === selectedPath && repo.repo_id === repoID) {
      this.setState({errMessage: message});
      return;
    }

    // copy the dirent to it's child. eg: A/B -> A/B/C
    if ( selectedPath && selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1) {
      message = gettext('Can not move directory %(src)s to its subdirectory %(des)s');
      message = message.replace('%(src)s', direntPath);
      message = message.replace('%(des)s', selectedPath);
      this.setState({errMessage: message});
      return;
    }

    this.props.onItemMove(repo, this.props.dirent, selectedPath, this.props.path);
    this.toggle();
  }

  toggle = () => {
    this.props.onCancelMove();
  }

  onDirentItemClick = (repo, selectedPath) => {
    this.setState({
      repo: repo,
      selectedPath: selectedPath,
      errMessage: ''
    });
  }

  onRepoItemClick = (repo) => {
    this.setState({
      repo: repo,
      selectedPath: '/',
      errMessage: ''
    });
  }

  render() {
    let title = gettext('Move {placeholder} to');
    if (!this.props.isMutipleOperation) {
      title = title.replace('{placeholder}', '<span class="op-target">' + Utils.HTMLescape(this.props.dirent.name) + '</span>');
    } else {
      title = gettext('Move selected item(s) to:');
    }
    let mode = this.props.repoEncrypted ? 'only_current_library':'current_repo_and_other_repos';
    const { dirent, selectedDirentList } = this.props;
    const movedDirent = dirent ? dirent : selectedDirentList[0];
    const { permission } = movedDirent;
    const { isCustomPermission } = Utils.getUserPermission(permission);
    if (isCustomPermission) {
      mode = 'only_current_library';
    }
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}><div dangerouslySetInnerHTML={{__html: title}}></div></ModalHeader>
        <ModalBody>
          <FileChooser
            repoID={this.props.repoID}
            currentPath={this.props.path}
            onDirentItemClick={this.onDirentItemClick}
            onRepoItemClick={this.onRepoItemClick}
            mode={mode}
          />
          {this.state.errMessage && <Alert color="danger" className="mt-2">{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

MoveDirent.propTypes = propTypes;

export default MoveDirent;
