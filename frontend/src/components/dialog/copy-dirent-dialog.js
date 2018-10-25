import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalFooter, ModalBody, Alert } from 'reactstrap';
import { gettext, repoID } from '../../utils/constants';
import FileChooser from '../file-chooser/file-chooser';

const propTypes = {
  direntPath: PropTypes.string,
  dirent: PropTypes.object.isRequired,
  onItemCopy: PropTypes.func.isRequired,
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

    
    if (filePath && direntPath.length > filePath.length && direntPath.indexOf(filePath) > -1) {
      this.setState({errMessage: message});
      return;
    }
    
    if ( filePath && filePath.length > direntPath.length && filePath.indexOf(direntPath) > -1) {
      message = gettext('Can not copy directory %(src)s to its subdirectory %(des)s')
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
    let title = gettext("Copy {placeholder} to:");
    title = title.replace('{placeholder}', '<span class="sf-font">' + this.props.dirent.name + '</span>');
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
