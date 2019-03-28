import React from 'react';
import PropTypes from 'prop-types';
import { Modal } from 'reactstrap';
import AddRelatedFileDialog from './add-related-file-dialog';
import ListRelatedFileDialog from './list-related-file-dialog';
import ModalPortal from '../modal-portal';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  filePath: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
  onRelatedFileChange: PropTypes.func.isRequired,
  dirent: PropTypes.object.isRequired,
  relatedFiles: PropTypes.array,
  differentDialogState: PropTypes.bool,
};

class RelatedFileDialogs extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      showListRelatedFileDialog: true,
      showAddRelatedFileDialog: false,
    };
  }

  componentWillMount() {
    this.showDiffentDialog();
  }

  onAddRelatedFileToggle = () => {
    this.setState({
      showListRelatedFileDialog: false,
      showAddRelatedFileDialog: true,
    });
  }

  onCloseAddRelatedFileDialog = () => {
    this.setState({
      showListRelatedFileDialog: true,
      showAddRelatedFileDialog: false,
    });
  }

  showDiffentDialog = () => {
    setTimeout(()=>{
      if (this.props.differentDialogState) {
        this.setState({
          showListRelatedFileDialog: false,
          showAddRelatedFileDialog: true,
        });
      } else {
        this.setState({
          showListRelatedFileDialog: true,
          showAddRelatedFileDialog: false,
        });
      }
    },40)
  }

  render() {
    return (
      <ModalPortal>
        <Modal isOpen={true} toggle={this.props.toggleCancel} size='lg' style={{width:'650px'}}>
          {this.state.showListRelatedFileDialog && 
            <ListRelatedFileDialog
              filePath={this.props.filePath}
              relatedFiles={this.props.relatedFiles}
              repoID={this.props.repoID}
              toggleCancel={this.props.toggleCancel}
              addRelatedFileToggle={this.onAddRelatedFileToggle}
              onRelatedFileChange={this.props.onRelatedFileChange}
            />
          }
          {this.state.showAddRelatedFileDialog && 
            <AddRelatedFileDialog
              filePath={this.props.filePath}
              repoID={this.props.repoID}
              toggleCancel={this.onCloseAddRelatedFileDialog}
              onRelatedFileChange={this.props.onRelatedFileChange}
              dirent={this.props.dirent}
              onClose={this.props.toggleCancel}
            />
          }
        </Modal>
      </ModalPortal>
    )
  }
}

RelatedFileDialogs.propTypes = propTypes;

export default RelatedFileDialogs