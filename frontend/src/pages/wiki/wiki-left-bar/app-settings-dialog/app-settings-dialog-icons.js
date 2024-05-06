import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '../../../../utils/constants';

const APP_ICON_CLASSNAMES = [
  'default',
];

class AppSettingsDialogIcons extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      iconClass: '',
    };
  }

  onClickIcon = (iconClass) => {
    this.setState({ iconClass }, () => {
      this.props.updateConfig({ wiki_icon: '' });
      this.props.onToggle();
    });
  };

  render() {
    return (
      <div className="app-settings-dialog-icons">
        <div className='d-flex flex-wrap'>
          {APP_ICON_CLASSNAMES.map((name, index) => {
            return (
              <div
                key={index}
                onClick={(e) => {
                  this.onClickIcon(name, e);
                }}
                className={`seafile-multicolor-icon-container ${index < 5 ? 'top' : ''}`}
              >
                <img src={`${mediaUrl}img/wiki/${name}.png`} className={`${name === this.state.iconClass ? 'active' : ''}`} alt='' />
              </div>
            );
          })}
        </div>
      </div>
    );
  }
}

AppSettingsDialogIcons.propTypes = {
  onToggle: PropTypes.func.isRequired,
  config: PropTypes.object.isRequired,
  updateConfig: PropTypes.func.isRequired,
};

export default AppSettingsDialogIcons;
