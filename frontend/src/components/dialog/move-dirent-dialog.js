import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalFooter, ModalBody } from 'reactstrap';
import { gettext } from '../../utils/constants';
import DialogRepoListView from '../dialog-list-view/dialog-repo-list-view';

const propTypes = {
  direntPath: PropTypes.string,
  dirent: PropTypes.object.isRequired,
  onCancelMove: PropTypes.func.isRequired,
};

// need dirent file Path；
class MoveDirent extends React.Component {

  constructor(props) {
    super(props);
    this.repo = '';
    this.filePath = '';
  }

  handleSubmit = () => {
    //todos: direntPath  and filePath
  }

  toggle = () => {
    this.props.onCancelMove();
  }

  onDirentItemClick = (repo, filePath) => {
    this.repo = repo;
    this.filePath = filePath;
  }

  onRepoItemClick = (repo) => {
    this.repo = repo;
    this.filePath = '';
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
