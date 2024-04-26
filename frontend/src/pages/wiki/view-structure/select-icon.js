import React from 'react';
import PropTypes from 'prop-types';
import { Label } from 'reactstrap';
import SeahubPopover from '../../../components/common/seahub-popover';
import { gettext } from '../../../utils/constants';
import Icon from '../../../components/icon';
import { PAGE_ICON_LIST } from '../utils';

import '../css/select-page-icon.css';


export default class SelectIcon extends React.Component {

  static propTypes = {
    onIconChange: PropTypes.func.isRequired,
    iconClassName: PropTypes.string,
  };

  constructor(props) {
    super(props);
    this.state = {
      isShowPopover: false,
    };
  }

  togglePopover = () => {
    this.setState({ isShowPopover: !this.state.isShowPopover });
  };

  onClickIcon = (e, icon) => {
    const newIcon = this.props.iconClassName === icon ? '' : icon;
    this.props.onIconChange(newIcon);
    this.setState({ isShowPopover: false });
  };

  renderPopover() {
    return (
      <SeahubPopover
        target='select-page-icon-input-group'
        popoverClassName='select-page-icon-popover'
        hideSeahubPopover={this.togglePopover}
        hideSeahubPopoverWithEsc={this.togglePopover}
      >
        <div className="select-page-icons">
          {PAGE_ICON_LIST.map((icon, index) => {
            return (
              <div
                key={index}
                className={`select-page-icon ${icon === this.props.iconClassName ? 'select-page-icon-active' : ''}`}
                onClick={(e) => {
                  this.onClickIcon(e, icon);
                }}
              >
                <Icon symbol={icon}/>
              </div>
            );
          })}
        </div>
      </SeahubPopover>
    );
  }

  render() {
    const { iconClassName } = this.props;
    const { isShowPopover } = this.state;
    return (
      <div className="setting-item table-setting">
        <Label>{gettext('Select icon')} ({gettext('optional')})</Label>
        <div
          className={`form-control ${isShowPopover ? 'form-control-active' : ''}`}
          onClick={this.togglePopover}
          id="select-page-icon-input-group"
        >
          {iconClassName &&
            <Icon symbol={iconClassName}/>
          }
          <div className="select-page-indicatorContainer">
            <span className="dtable-font dtable-icon-drop-down"></span>
          </div>
        </div>
        {isShowPopover && this.renderPopover()}
      </div>
    );
  }
}
