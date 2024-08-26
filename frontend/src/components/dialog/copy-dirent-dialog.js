import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalFooter, ModalBody, Alert, Row, Col } from 'reactstrap';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import FileChooser from '../file-chooser/file-chooser';

const propTypes = {
  path: PropTypes.string.isRequired,
  repoID: PropTypes.string.isRequired,
  dirent: PropTypes.object,
  selectedDirentList: PropTypes.array,
  isMultipleOperation: PropTypes.bool.isRequired,
  onItemCopy: PropTypes.func,
  onItemsCopy: PropTypes.func,
  onCancelCopy: PropTypes.func.isRequired,
  repoEncrypted: PropTypes.bool.isRequired,
};

// need dirent file Path；
class CopyDirent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: { repo_id: this.props.repoID },
      selectedPath: this.props.path,
      errMessage: '',
      mode: 'only_current_library',
    };
  }

  handleSubmit = () => {
    if (this.props.isMultipleOperation) {
      this.copyItems();
    } else {
      this.copyItem();
    }
  };

  copyItems = () => {
    let { repo, selectedPath } = this.state;
    let message = gettext('Invalid destination path');

    if (!repo || selectedPath === '') {
      this.setState({ errMessage: message });
      return;
    }

    let selectedDirentList = this.props.selectedDirentList;
    let direntPaths = [];
    selectedDirentList.forEach(dirent => {
      let path = Utils.joinPath(this.props.path, dirent.name);
      direntPaths.push(path);
    });

    // copy dirents to one of them. eg: A/B, A/C -> A/B
    if (direntPaths.some(direntPath => { return direntPath === selectedPath;})) {
      this.setState({ errMessage: message });
      return;
    }

    // copy dirents to one of their child. eg: A/B, A/D -> A/B/C
    let copyDirentPath = '';
    let isChildPath = direntPaths.some(direntPath => {
      let flag = selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1;
      if (flag) {
        copyDirentPath = direntPath;
      }
      return flag;
    });

    if (isChildPath) {
      message = gettext('Can not move folder %(src)s to its subfolder %(des)s');
      message = message.replace('%(src)s', copyDirentPath);
      message = message.replace('%(des)s', selectedPath);
      this.setState({ errMessage: message });
      return;
    }

    this.props.onItemsCopy(repo, selectedPath);
    this.toggle();
  };

  copyItem = () => {
    let { repo, repoID, selectedPath } = this.state;
    let direntPath = Utils.joinPath(this.props.path, this.props.dirent.name);
    let message = gettext('Invalid destination path');

    if (!repo || (repo.repo_id === repoID && selectedPath === '')) {
      this.setState({ errMessage: message });
      return;
    }

    // copy the dirent to itself. eg: A/B -> A/B
    if (selectedPath && direntPath === selectedPath) {
      this.setState({ errMessage: message });
      return;
    }

    // copy the dirent to it's child. eg: A/B -> A/B/C
    if (selectedPath && selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1) {
      message = gettext('Can not copy folder %(src)s to its subfolder %(des)s');
      message = message.replace('%(src)s', direntPath);
      message = message.replace('%(des)s', selectedPath);
      this.setState({ errMessage: message });
      return;
    }

    this.props.onItemCopy(repo, this.props.dirent, selectedPath, this.props.path);
    this.toggle();
  };

  toggle = () => {
    this.props.onCancelCopy();
  };

  onDirentItemClick = (repo, selectedPath) => {
    this.setState({
      repo: repo,
      selectedPath: selectedPath,
      errMessage: ''
    });
  };

  onRepoItemClick = (repo) => {
    this.setState({
      repo: repo,
      selectedPath: '/',
      errMessage: ''
    });
  };

  onSelectedMode = (mode) => {
    this.setState({ mode: mode });
  };

  renderTitle = () => {
    const { dirent, isMultipleOperation } = this.props;
    let title = gettext('Copy {placeholder} to');

    if (isMultipleOperation) {
      return gettext('Copy selected item(s) to:');
    } else {
      return title.replace('{placeholder}', `<span class="op-target text-truncate mx-1">${Utils.HTMLescape(dirent.name)}</span>`);
    }
  };

  render() {
    const { dirent, selectedDirentList, isMultipleOperation, repoID, path } = this.props;
    const { mode, errMessage } = this.state;

    const copiedDirent = dirent || selectedDirentList[0];
    const { permission } = copiedDirent;
    const { isCustomPermission } = Utils.getUserPermission(permission);

    const LibraryOption = ({ mode, label }) => (
      <div className={`repo-list-item ${this.state.mode === mode ? 'active' : ''}`} onClick={() => this.onSelectedMode(mode)}>
        <span className='library'>{label}</span>
      </div>
    );

    return (
      <Modal className='custom-modal' isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>
          {isMultipleOperation ? this.renderTitle() : <div dangerouslySetInnerHTML={{ __html: this.renderTitle() }} className="d-flex mw-100"></div>}
        </ModalHeader>
        <Row>
          <Col className='repo-list-col border-right'>
            <LibraryOption mode='only_current_library' label={gettext('Current Library')} />
            {!isCustomPermission && <LibraryOption mode='only_other_libraries' label={gettext('Other Libraries')} />}
            <LibraryOption mode='recently_used' label={gettext('Recently Used')} />
          </Col>
          <Col className='file-list-col'>
            <ModalBody>
              <FileChooser
                repoID={repoID}
                currentPath={path}
                onDirentItemClick={this.onDirentItemClick}
                onRepoItemClick={this.onRepoItemClick}
                mode={mode}
                hideLibraryName={false}
              />
              {errMessage && <Alert color="danger" className="mt-2">{errMessage}</Alert>}
            </ModalBody>
            <ModalFooter>
              <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
              <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
            </ModalFooter>
          </Col>
        </Row>
      </Modal>
    );
  }
}

CopyDirent.propTypes = propTypes;

export default CopyDirent;
