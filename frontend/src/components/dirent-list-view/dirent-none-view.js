import React, { Fragment } from 'react';
import PropTypes from 'prop-types';
import { enableSeadoc, gettext } from '../../utils/constants';
import Loading from '../loading';
import ModalPortal from '../modal-portal';
import CreateFile from '../../components/dialog/create-file-dialog';

import '../../css/tip-for-new-file.css';

const propTypes = {
  path: PropTypes.string.isRequired,
  isDirentListLoading: PropTypes.bool.isRequired,
  onAddFile: PropTypes.func.isRequired
};

class DirentNodeView extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      fileType: '',
      isCreateFileDialogShow: false,
    };
  }

  onCreateNewFile = (type) => {
    this.setState({
      fileType: type,
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
    });
  };

  onCreateFileToggle = () => {
    this.setState({
      fileType: '',
      isCreateFileDialogShow: !this.state.isCreateFileDialogShow,
    });
  };

  checkDuplicatedName = () => {
    return false; // current repo is null, and unnecessary to check duplicated name
  };

  render() {
    if (this.props.isDirentListLoading) {
      return (<Loading />);
    }

    return (
      <Fragment>
        <div className="tip-for-new-file">
          <p className="text-secondary text-center">{gettext('This folder has no content at this time.')}</p>
          <p className="text-secondary text-center">{gettext('You can create files quickly')}{' +'}</p>
          <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.md')}>
            {'+ Markdown'}</button>
          <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.pptx')}>
            {'+ PPT'}</button>
          <br />
          <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.docx')}>
            {'+ Word'}</button>
          <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.xlsx')}>
            {'+ Excel'}</button>
          <br />
          {enableSeadoc && <button className="big-new-file-button" onClick={this.onCreateNewFile.bind(this, '.sdoc')}>
            {'+ SeaDoc'}</button>}
        </div>
        {this.state.isCreateFileDialogShow && (
          <ModalPortal>
            <CreateFile
              parentPath={this.props.path}
              fileType={this.state.fileType}
              onAddFile={this.props.onAddFile}
              toggleDialog={this.onCreateFileToggle}
              checkDuplicatedName={this.checkDuplicatedName}
            />
          </ModalPortal>
        )}
      </Fragment>
    );
  }
}

DirentNodeView.propTypes = propTypes;

export default DirentNodeView;
