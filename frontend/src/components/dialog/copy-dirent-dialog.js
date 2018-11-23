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
  onItemCopy: PropTypes.func.isRequired,
  onCopySelected: PropTypes.func.isRequired,
  onCancelCopy: PropTypes.func.isRequired,
};

// need dirent file Path；
class CopyDirent extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      repo: null,
      filePath: '',
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
      this.copySelected();
    } else {
      this.copyItem();
    }
  }

  copySelected = () => {
    let { repo, filePath } = this.state;
    let message = gettext('Invalid destination path');
    
    if (!repo || (repo.repo_id === repoID) && filePath === '') {
      this.setState({errMessage: message});
      return;
    }

    let selectedDirentList = this.props.selectedDirentList;
    let direntPaths = [];
    selectedDirentList.forEach(dirent => {
      let path = Utils.joinPath(this.props.path, dirent.name);
      direntPaths.push(path);
    });
    
    //self;
    if (direntPaths.some(direntPath => { return direntPath === filePath})) {
      this.setState({errMessage: message});
      return;
    }

    //parent;
    if (filePath && filePath === this.props.path) {
      this.setState({errMessage: message});
      return;
    }

    //child
    let copyDirentPath = '';
    let isChildPath = direntPaths.some(direntPath => {
      let flag = filePath.length > direntPath.length && filePath.indexOf(direntPath) > -1;
      if (flag) {
        copyDirentPath = direntPath;
      }
      return flag;
    })

    if (isChildPath) {
      message = gettext('Can not move directory %(src)s to its subdirectory %(des)s');
      message = message.replace('%(src)s', copyDirentPath);
      message = message.replace('%(des)s', filePath);
      this.setState({errMessage: message});
      return;
    }
    
    if (filePath === '') {
      filePath = '/';
    }
    this.props.onCopySelected(repo, filePath);
    this.toggle();
  }

  copyItem = () => {
    let { direntPath } = this.props;
    let { repo, filePath } = this.state; 
    let message = 'Invalid destination path';

    if (!repo || (repo.repo_id === repoID && filePath === '')) {
      this.setState({errMessage: message});
      return;
    }

    if (filePath && direntPath === filePath) {
      this.setState({errMessage: message});
      return;
    }

    
    if (filePath && Utils.getDirName(direntPath) === filePath) {
      this.setState({errMessage: message});
      return;
    }
    
    if ( filePath && filePath.length > direntPath.length && filePath.indexOf(direntPath) > -1) {
      message = gettext('Can not copy directory %(src)s to its subdirectory %(des)s');
      message = message.replace('%(src)s', direntPath);
      message = message.replace('%(des)s', filePath);
      this.setState({errMessage: message});
      return;
    }

    if (filePath === '') {
      filePath = '/';
    }
    this.props.onItemCopy(repo, direntPath, filePath);
    this.toggle();
  }

  toggle = () => {
    this.props.onCancelCopy();
  }

  onDirentItemClick = (repo, filePath) => {
    this.setState({
      repo: repo,
      filePath: filePath,
      errMessage: '',
    });
  }

  onRepoItemClick = (repo) => {
    this.setState({
      repo: repo,
      filePath: '',
      errMessage: ''
    });
  }

  render() {
    let title = gettext('Copy {placeholder} to:');
    if (!this.props.isMutipleOperation) {
      title = title.replace('{placeholder}', '<span class="sf-font">' + Utils.HTMLescape(this.props.dirent.name) + '</span>');
    } else {
      title = gettext("Copy selected item(s) to:");
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

CopyDirent.propTypes = propTypes;

export default CopyDirent;
