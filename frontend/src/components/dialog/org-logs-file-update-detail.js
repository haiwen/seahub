import React from 'react';
import PropTypes from 'prop-types';
import { Modal, ModalHeader, ModalBody } from 'reactstrap';
import { seafileAPI } from '../../utils/seafile-api';
import { gettext } from '../../utils/constants';
import { Utils } from '../../utils/utils';
import toaster from '../toast';

const propTypes = {
  repoID: PropTypes.string.isRequired,
  commitID: PropTypes.string.isRequired,
  toggleCancel: PropTypes.func.isRequired,
};

class FileUpdateDetailDialog extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      time: '',
      renamed: [],
      deldir: [],
      modified: [],
      newdir: [],
      newfile: [],
      removed: [],
    };
  }

  componentDidMount() {
    seafileAPI.orgAdminGetFileUpdateDetail(this.props.repoID, this.props.commitID).then(res => {
      this.setState({
        time: res.data.date_time,
        renamed: this.state.renamed.concat(res.data.renamed),
        deldir: this.state.deldir.concat(res.data.deldir),
        modified: this.state.modified.concat(res.data.modified),
        newdir: this.state.newdir.concat(res.data.newdir),
        newfile: this.state.newfile.concat(res.data.new),
        removed: this.state.removed.concat(res.data.removed),
      });
    }).catch(error => {
      let errMessage = Utils.getErrorMsg(error);
      toaster.danger(errMessage);
    });
  }

  renderContentItem = (items) => {
    let con = '';
    con += '<ul class="list-group list-group-flush">';
    for (var i = 0, len = items.length; i < len; i++) {
      con += '<li class="list-group-item">' + items[i] + '</li>';
    }
    con += '</ul>';
    return {__html: con};
  }

  renderContent = () => {
    if (this.state.newfile.length > 0) {
      return (
        <div>
          <h4>{gettext('New files')}</h4>
          <p>{this.state.time}</p>
          <div dangerouslySetInnerHTML= {this.renderContentItem(this.state.newfile)} />
        </div>
      );
    }

    if (this.state.removed.length > 0) {
      return (
        <div>
          <h4>{gettext('Deleted files')}</h4>
          <p>{this.state.time}</p>
          <div dangerouslySetInnerHTML= {this.renderContentItem(this.state.removed)} />
        </div>
      );
    }

    if (this.state.renamed.length > 0) {
      return (
        <div>
          <h4>{gettext('Renamed or Moved files')}</h4>
          <p>{this.state.time}</p>
          <div dangerouslySetInnerHTML= {this.renderContentItem(this.state.renamed)} />
        </div>
      );
    }

    if (this.state.modified.length > 0) {
      return (
        <div>
          <h4>{gettext('Modified files')}</h4>
          <p>{this.state.time}</p>
          <div dangerouslySetInnerHTML= {this.renderContentItem(this.state.modified)} />
        </div>
      );
    }

    if (this.state.newdir.length > 0) {
      return (
        <div>
          <h4>{gettext('New directories')}</h4>
          <p>{this.state.time}</p>
          <div dangerouslySetInnerHTML= {this.renderContentItem(this.state.newdir)} />
        </div>
      );
    }

    if (this.state.deldir.length > 0) {
      return (
        <div>
          <h4>{gettext('Deleted directories')}</h4>
          <p>{this.state.time}</p>
          <div dangerouslySetInnerHTML= {this.renderContentItem(this.state.deldir)} />
        </div>
      );
    }
  }

  render() {
    return (
      <Modal isOpen={true} toggle={this.props.toggleCancel}>
        <ModalHeader toggle={this.props.toggleCancel}>
          {gettext('Modification Details')}
        </ModalHeader>
        <ModalBody>
          {this.renderContent()}
        </ModalBody>
      </Modal>
    );
  }
}

FileUpdateDetailDialog.propTypes = propTypes;

export default FileUpdateDetailDialog;
