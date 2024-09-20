import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader } from 'reactstrap';
import SelectDirentBody from './select-dirent-body';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  selectedDirentList: PropTypes.array,
  isMultipleOperation: PropTypes.bool.isRequired,
  onItemMove: PropTypes.func,
  onItemsMove: PropTypes.func,
  onCancelMove: PropTypes.func.isRequired,
};

class MoveDirent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: { repo_id: this.props.repoID },
      selectedPath: this.props.path,
      errMessage: '',
    };
  }

  handleSubmit = () => {
    if (this.props.isMultipleOperation) {
      this.moveItems();
    } else {
      this.moveItem();
    }
  };

  moveItems = () => {
    let { repoID } = this.props;
    let { repo, selectedPath } = this.state;
    let message = gettext('Invalid destination path');

    if (!repo || selectedPath === '') {
      this.setErrMessage(message);
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
      this.setErrMessage(message);
      return;
    }

    // move dirents to current path
    if (selectedPath && selectedPath === this.props.path && (repo.repo_id === repoID)) {
      this.setErrMessage(message);
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
      message = gettext('Can not move folder %(src)s to its subfolder %(des)s');
      message = message.replace('%(src)s', moveDirentPath);
      message = message.replace('%(des)s', selectedPath);
      this.setErrMessage(message);
      return;
    }

    this.props.onItemsMove(repo, selectedPath);
    this.toggle();
  };

  moveItem = () => {
    let { repoID } = this.props;
    let { repo, selectedPath } = this.state;
    let direntPath = Utils.joinPath(this.props.path, this.props.dirent.name);
    let message = gettext('Invalid destination path');

    if (!repo || (repo.repo_id === repoID && selectedPath === '')) {
      this.setErrMessage(message);
      return;
    }

    // copy the dirent to itself. eg: A/B -> A/B
    if (selectedPath && direntPath === selectedPath) {
      this.setErrMessage(message);
      return;
    }

    // copy the dirent to current path
    if (selectedPath && this.props.path === selectedPath && repo.repo_id === repoID) {
      this.setErrMessage(message);
      return;
    }

    // copy the dirent to it's child. eg: A/B -> A/B/C
    if (selectedPath && selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1) {
      message = gettext('Can not move folder %(src)s to its subfolder %(des)s');
      message = message.replace('%(src)s', direntPath);
      message = message.replace('%(des)s', selectedPath);
      this.setErrMessage(message);
      return;
    }

    this.props.onItemMove(repo, this.props.dirent, selectedPath, this.props.path);
    this.toggle();
  };

  toggle = () => {
    this.props.onCancelMove();
  };

  selectRepo = (repo) => {
    this.setState({ repo });
  };

  setSelectedPath = (selectedPath) => {
    this.setState({ selectedPath });
  };

  setErrMessage = (message) => {
    this.setState({ errMessage: message });
  };

  renderTitle = () => {
    const { dirent, isMultipleOperation } = this.props;
    let title = gettext('Move {placeholder} to');

    if (isMultipleOperation) {
      return gettext('Move selected item(s) to:');
    } else {
      return title.replace('{placeholder}', `<span class="op-target text-truncate mx-1">${Utils.HTMLescape(dirent.name)}</span>`);
    }
  };

  render() {
    const { dirent, selectedDirentList, isMultipleOperation, path, repoID } = this.props;
    const movedDirent = dirent || selectedDirentList[0];
    const { permission } = movedDirent;
    const { isCustomPermission } = Utils.getUserPermission(permission);

    return (
      <Modal className='custom-modal' isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>
          {isMultipleOperation ? this.renderTitle() : <div dangerouslySetInnerHTML={{ __html: this.renderTitle() }} className='d-flex mw-100'></div>}
        </ModalHeader>
        <SelectDirentBody
          path={path}
          selectedPath={this.state.selectedPath}
          repoID={repoID}
          isSupportOtherLibraries={!isCustomPermission}
          errMessage={this.state.errMessage}
          onCancel={this.toggle}
          selectRepo={this.selectRepo}
          setSelectedPath={this.setSelectedPath}
          setErrMessage={this.setErrMessage}
          handleSubmit={this.handleSubmit}
        />
      </Modal>
    );
  }
}

MoveDirent.propTypes = propTypes;

export default MoveDirent;
