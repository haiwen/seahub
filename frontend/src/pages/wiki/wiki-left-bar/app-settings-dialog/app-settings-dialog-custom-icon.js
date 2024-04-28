import React from 'react';
import PropTypes from 'prop-types';
import { Button } from 'reactstrap';
import { seafileAPI } from '../../../../utils/seafile-api';
import { gettext, mediaUrl, serviceURL } from '../../../../utils/constants';
import { getIconURL } from '../../utils'

class AppSettingsDialogCustomIcon extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      iconName: this.props.config.wiki_icon,
    };
    this.fileInput = React.createRef();
  }

  openFileInput = () => {
    this.fileInput.current.click();
  };

  uploadFile = () => {
    if (!this.fileInput.current.files.length) {
      return;
    }
    const file = this.fileInput.current.files[0];
    this.uploadLocalFile(file).then((iconName) => {
      let wikiConfig = Object.assign({}, this.props.config, {
        wiki_icon: iconName,
      });
      this.props.updateConfig(wikiConfig);
      this.props.onToggle();
      this.setState({
        iconName: iconName,
      });
    });
  };

  uploadLocalFile = (imageFile) => {
    let repoID = this.props.repoId;
    const name = 'wiki-icon-image-' + Date.now().toString() + '.png';
    return (
      seafileAPI.getFileServerUploadLink(repoID, '/').then((res) => {
        const uploadLink = res.data + '?ret-json=1';
        const newFile = new File([imageFile], name, {type: imageFile.type});
        const formData = new FormData();
        formData.append('parent_dir', '/');
        formData.append('relative_path', '_Internal/Wiki/Icon');
        formData.append('file', newFile);
        return seafileAPI.uploadImage(uploadLink, formData);
      }).then ((res) => {
        return name;
      })
    );
  };

  render() {
    const hasIcon = false;
    let { iconName } = this.state;
    const iconUrl = iconName ? getIconURL(this.props.repoId, iconName) : `${mediaUrl}img/wiki/default.png`
    if (hasIcon) {
      return (
        <div className="app-setting-dialog-icon">
          <img src={iconUrl} alt="" width={128} height={128} ></img>
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
  onToggle: PropTypes.func.isRequired,
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
  repoId: PropTypes.string.isRequired,
};

export default AppSettingsDialogCustomIcon;
