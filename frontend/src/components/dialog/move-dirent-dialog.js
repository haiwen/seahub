import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalFooter, ModalBody, Alert } from 'reactstrap';
import { gettext, repoID } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import FileChooser from '../file-chooser/file-chooser';

const propTypes = {
  path: PropTypes.string.isRequired,
  direntPath: PropTypes.string,
  dirent: PropTypes.object,
  isMutipleOperation: PropTypes.bool.isRequired,
  selectedDirentList: PropTypes.array.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onMoveSelected: PropTypes.func.isRequired,
  onCancelMove: PropTypes.func.isRequired,
};

// need dirent file Path；
class MoveDirent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: null,
      selectedPath: '',
      errMessage: '',
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
      this.moveSelected();
    } else {
      this.moveItem();
    }
  }

  moveSelected = () => {
    let { repo, selectedPath } = this.state;
    let message = gettext('Invalid destination path');
    
    if (!repo || (repo.repo_id === repoID) && selectedPath === '') {
      this.setState({errMessage: message});
      return;
    }

    let selectedDirentList = this.props.selectedDirentList;
    let direntPaths = [];
    selectedDirentList.forEach(dirent => {
      let path = Utils.joinPath(this.props.path, dirent.name);
      direntPaths.push(path);
    });
    
    // copy dirents to one of them. eg: A/B, A/C -> A/B
    if (direntPaths.some(direntPath => { return direntPath === selectedPath})) {
      this.setState({errMessage: message});
      return;
    }

    // copy dirents to current path
    if (selectedPath && selectedPath === this.props.path) {
      this.setState({errMessage: message});
      return;
    }

    // copy dirents to one of their child. eg: A/B, A/D -> A/B/C
    let moveDirentPath = '';
    let isChildPath = direntPaths.some(direntPath => {
      let flag = selectedPath.length > direntPath.length && selectedPath.indexOf(direntPath) > -1;
      if (flag) {
        moveDirentPath = direntPath;
      }
      return flag;
    })

    if (isChildPath) {
      message = gettext('Can not move directory %(src)s to its subdirectory %(des)s');
      message = message.replace('%(src)s', moveDirentPath);
      message = message.replace('%(des)s', selectedPath);
      this.setState({errMessage: message});
      return;
    }

    this.props.onMoveSelected(repo, selectedPath);
    this.toggle();
  }

  moveItem = () => {
    let { direntPath } = this.props;
    let { repo, selectedPath } = this.state; 
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
    if (selectedPath && Utils.getDirName(direntPath) === selectedPath) {
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

    this.props.onItemMove(repo, direntPath, selectedPath);
    this.toggle();
  }

  toggle = () => {
    this.props.onCancelMove();
  }

  onDirentItemClick = (repo, selectedPath) => {
    this.setState({
      repo: repo,
      selectedPath: selectedPath,
      errMessage: '',
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
    let title = gettext('Move {placeholder} to:');
    if (!this.props.isMutipleOperation) {
      title = title.replace('{placeholder}', '<span class="sf-font">' + Utils.HTMLescape(this.props.dirent.name) + '</span>');
    } else {
      title = gettext("Move selected item(s) to:");
    }
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}><div dangerouslySetInnerHTML={{__html: title}}></div></ModalHeader>
        <ModalBody>
          <FileChooser 
            onDirentItemClick={this.onDirentItemClick}
            onRepoItemClick={this.onRepoItemClick}
          />
          {this.state.errMessage && <Alert color="danger" style={{margin: '0.5rem'}}>{this.state.errMessage}</Alert>}
        </ModalBody>
        <ModalFooter>
          <Button color="primary" onClick={this.handleSubmit}>{gettext('Submit')}</Button>
          <Button color="secondary" onClick={this.toggle}>{gettext('Cancel')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

MoveDirent.propTypes = propTypes;

export default MoveDirent;
