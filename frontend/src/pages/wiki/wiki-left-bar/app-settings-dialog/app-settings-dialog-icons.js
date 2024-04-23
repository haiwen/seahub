import React from 'react';
import PropTypes from 'prop-types';
import { mediaUrl } from '../../../../utils/constants';

const APP_ICON_CLASSNAMES = [
  'default',
  'sales-management',
  'staff-management',
  'project-management',
  'financial-management',
  'enterprise-portal',
  'supply-chain-management',
  'purchasing-management',
  'contract-management',
  'information-management',
  'warehouse-management',
  'it-portal',
  'performance-evaluation',
];

class AppSettingsDialogIcons extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      iconClass: '',
    };
  }

  onClickIcon = (iconClass) => {
    if (iconClass === this.state.iconClass) return;
    this.setState({ iconClass }, () => {
      // TODO: save icon class
    });
  };

  render() {
    const { iconClass } = this.state;
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
                className={`multicolor-icon-container ${index < 5 ? 'top' : ''}`}
              >
                <img src={`${mediaUrl}img/wiki/${name}.png`} className={`${name === iconClass ? 'active' : ''}`} alt='' />
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
};

export default AppSettingsDialogIcons;
