import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalFooter, ModalBody, Alert } from 'reactstrap';
import { gettext, repoID } from '../../utils/constants';
import DialogRepoListView from '../dialog-list-view/dialog-repo-list-view';

const propTypes = {
  direntPath: PropTypes.string,
  dirent: PropTypes.object.isRequired,
  onItemMove: PropTypes.func.isRequired,
  onCancelMove: PropTypes.func.isRequired,
};

// need dirent file Path；
class MoveDirent extends React.Component {

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
    let message = '';

    if (!repo || (repo.repo_id === repoID && filePath === '')) {
      message = 'Invalid destination path';
      this.setState({errMessage: gettext(message)});
      return;
    }

    if (filePath && direntPath === filePath) {
      message = 'Moveing folder(file) is same as move to dirent';
      this.setState({errMessage: gettext(message)});
      return;
    }

    
    if (filePath && direntPath.length > filePath.length && direntPath.indexOf(filePath) > -1) {
      message = 'Moveing folder(file) is just in this dirent';
      this.setState({errMessage: gettext(message)});
      return;
    }
    
    if ( filePath && filePath.length > direntPath.length && filePath.indexOf(direntPath) > -1) {
      message = 'Can not move directory ' + direntPath + ' to its subdirectory ' + filePath;
      this.setState({errMessage: gettext(message)});
      return;
    }
    if (filePath === '') {
      filePath = '/';
    }
    this.props.onItemMove(repo, direntPath, filePath);
    this.toggle();
  }

  toggle = () => {
    this.props.onCancelMove();
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
    return (
      <Modal isOpen={true} toggle={this.toggle}>
        <ModalHeader toggle={this.toggle}>{gettext(`Move ${this.props.dirent.name} to`)}</ModalHeader>
        <ModalBody>
          <DialogRepoListView 
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
