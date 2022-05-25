import React from 'react';
import PropTypes from 'prop-types';
import { Button, Modal, ModalHeader, ModalBody, ModalFooter } from 'reactstrap';
import { MarkdownViewer } from '@seafile/seafile-editor';
import Loading from '../../components/loading';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext, mediaUrl } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  fileName: PropTypes.string.isRequired,
  href: PropTypes.string,
  toggleCancel: PropTypes.func.isRequired,
};

class ReadmeDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      readmeContent: null,
      isLoading: true,
    };
  }

  componentDidMount() {
    seafileAPI.getFileDownloadLink(this.props.repoID, this.props.filePath).then(res => {
      seafileAPI.getFileContent(res.data).then(res => {
        this.setState({
          readmeContent: res.data,
          isLoading: false,
        });
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleCancel} className="readme-dialog" size="lg">
        <ModalHeader>{this.props.fileName}
          <a className="readme-dialog-edit" href={this.props.href} target='_blank'><i className="fa fa-pencil-alt"></i></a>
        </ModalHeader>
        <ModalBody>
          {this.state.isLoading ?
            <Loading />:
            <MarkdownViewer
              markdownContent={this.state.readmeContent}
              showTOC={false}
              scriptSource={mediaUrl + 'js/mathjax/tex-svg.js'}
            />
          }
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" onClick={this.props.toggleCancel}>{gettext('Close')}</Button>
        </ModalFooter>
      </Modal>
    );
  }
}

ReadmeDialog.propTypes = propTypes;

export default ReadmeDialog;
