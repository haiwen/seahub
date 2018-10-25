import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalFooter, ModalBody, Alert } from 'reactstrap';
import { gettext, repoID } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import FileChooser from '../file-chooser/file-chooser';

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
    let message = gettext('Invalid destination path');

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
      message = gettext('Can not move directory %(src)s to its subdirectory %(des)s')
      message = message.replace('%(src)s', direntPath);
      message = message.replace('%(des)s', filePath);
      this.setState({errMessage: message});
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
    let title = gettext("Move {placeholder} to:");
    title = title.replace('{placeholder}', '<span class="sf-font">' + Utils.HTMLescape(this.props.dirent.name) + '</span>');
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
