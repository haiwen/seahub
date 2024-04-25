import React from 'react';
// import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { gettext, mediaUrl } from '../../../../utils/constants';

class AppSettingsDialogCustomIcon extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      iconUrl: `${mediaUrl}img/wiki/default.png`,
    };
    this.fileInput = React.createRef();
  }

  openFileInput = () => {
    this.fileInput.current.click();
  };

  uploadFile = () => {
    // if (!this.fileInput.current.files.length) {
    //   return;
    // }
    // const file = this.fileInput.current.files[0];
    // this.uploadLocalFile(file).then((iconLink) => {
    //   let config = Object.assign({}, this.props.config, {
    //     app_icon: iconLink,
    //     use_custom_icon: true,
    //     icon_class_name: '',
    //   });
    //   this.setState({
    //     iconUrl: iconLink,
    //   });
    // });
  };

  uploadLocalFile = (imageFile) => {
    // let parentPath = '';
    // return (
    //   api.getPublicUploadLink(appUuid).then((res) => {
    //     const { upload_link, parent_path } = res.data;
    //     const uploadLink = upload_link + '?ret-json=1';
    //     const formData = new FormData();
    //     parentPath = parent_path;
    //     formData.append('parent_dir', parentPath);
    //     const imageName = imageNameFilter(imageFile.name);
    //     formData.append('file', imageFile, imageName);
    //     return api.uploadImage(uploadLink, formData);
    //   }).then((res) => {
    //     const fileName = res.data[0].name;
    //     return `${SERVER}/workspace/${workspaceID}${parentPath}/${encodeURIComponent(fileName)}`;
    //   }).catch(error => {
    //     getErrorMessage(error);
    //   })
    // );
  };

  render() {
    const hasIcon = false;
    if (hasIcon) {
      return (
        <div className="app-setting-dialog-icon">
          <img src={this.state.iconUrl} alt="" width={128} height={128} ></img>
          <p className="mt-2 mb-1 app-setting-dialog-icon-description">
            {gettext('Please select a png image within 5MB.')}
          </p>
          <p className="app-setting-dialog-icon-description">
            {gettext('Recommended size is 256x256 px.')}
          </p>
          <Button color="primary" outline size="sm" onClick={this.openFileInput}>{gettext('Change icon')}</Button>
          <input className="d-none" type="file" accept="image/png" onChange={this.uploadFile} ref={this.fileInput} />
        </div>
      );
    } else {
      return (
        <div className="app-setting-dialog-icon mb-8">
          <p className="mt-2 mb-1 app-setting-dialog-icon-description">
            {gettext('Please select a png image within 5MB.')}
          </p>
          <p className="app-setting-dialog-icon-description">
            {gettext('Recommended size is 256x256 px.')}
          </p>
          <Button color="primary" outline size="sm" onClick={this.openFileInput}>{gettext('Upload icon')}</Button>
          <input className="d-none" type="file" accept="image/png" onChange={this.uploadFile} ref={this.fileInput} />
        </div>
      );
    }
  }
}

AppSettingsDialogCustomIcon.propTypes = {
};

export default AppSettingsDialogCustomIcon;
