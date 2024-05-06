import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '../../../../utils/constants';

const ICON_CLASSNAMES = [
  'default',
];

class AppSettingsDialogIcons extends React.Component {

  onClickIcon = () => {
    if (this.props.config.wiki_icon === 'default') {
      this.props.updateConfig({ wiki_icon: '' });
    } else {
      this.props.updateConfig({ wiki_icon: 'default' });
    }
    this.props.onToggle();
  };

  render() {
    return (
      <div className="app-settings-dialog-icons">
        <div className='d-flex flex-wrap'>
          {ICON_CLASSNAMES.map((name, index) => {
            return (
              <div
                key={index}
                onClick={(e) => {
                  this.onClickIcon(name, e);
                }}
                className={`seafile-multicolor-icon-container ${index < 5 ? 'top' : ''}`}
              >
                <img src={`${mediaUrl}img/wiki/${name}.png`} alt='' />
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
