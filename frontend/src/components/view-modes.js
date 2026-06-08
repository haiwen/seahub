import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../utils/utils';
import { gettext } from '../utils/constants';
import { GRID_MODE, LIST_MODE, TABLE_MODE } from './dir-view-mode/constants';
import Icon from './icon';
import Tooltip from './tooltip';
import CustomDropdown from './dropdown';

import '../css/view-modes.css';

const propTypes = {
  currentViewMode: PropTypes.string.isRequired,
  switchViewMode: PropTypes.func.isRequired,
  isSupportTable: PropTypes.bool,
};

class ViewModes extends React.Component {
  componentDidMount() {
    document.addEventListener('keydown', this.onKeyDown);
  }

  componentWillUnmount() {
    document.removeEventListener('keydown', this.onKeyDown);
  }

  onKeyDown = (e) => {
    const isSwitchViewModeHotkey = Utils.isMac()
      ? e.metaKey && e.altKey && !e.ctrlKey && !e.shiftKey
      : e.ctrlKey && e.shiftKey && !e.metaKey && !e.altKey;

    if (isSwitchViewModeHotkey) {
      if (e.keyCode === 49) {
        e.preventDefault();
        this.props.switchViewMode(LIST_MODE);
      } else if (e.keyCode === 50) {
        e.preventDefault();
        this.props.switchViewMode(GRID_MODE);
      } else if (e.keyCode === 51) {
        e.preventDefault();
        this.props.switchViewMode(TABLE_MODE);
      }
    }
  };

  renderCustomTrigger = (isOpen) => {
    const { currentViewMode } = this.props;
    const symbol = currentViewMode === LIST_MODE ? 'list-view' : currentViewMode === GRID_MODE ? 'grid-view' : currentViewMode === TABLE_MODE ? 'table' : 'list-view';
    return (
      <>
        <Icon symbol={symbol} />
        {!isOpen && <Tooltip target="switch-view-mode-icon">{gettext('Switch view mode')}</Tooltip>}
      </>
    );
  };

  render() {
    const { currentViewMode, isSupportTable = false } = this.props;
    const shortcutMain = Utils.isMac() ? '⌥ ⌘' : 'Ctrl + Shift +';
    let options = [
      {
        key: LIST_MODE,
        label: gettext('List view'),
        icon_dom: <Icon symbol="list-view" />,
        shortcut: `${shortcutMain} 1`,
        checked: currentViewMode === LIST_MODE,
        onClick: () => this.props.switchViewMode(LIST_MODE),
      },
      {
        key: GRID_MODE,
        label: gettext('Grid view'),
        icon_dom: <Icon symbol="grid-view" />,
        shortcut: `${shortcutMain} 2`,
        checked: currentViewMode === GRID_MODE,
        onClick: () => this.props.switchViewMode(GRID_MODE),
      },
    ];
    if (isSupportTable) {
      options.push({ key: TABLE_MODE, label: gettext('Table view'), icon_dom: <Icon symbol="table" />, shortcut: `${shortcutMain} 3`, checked: currentViewMode === TABLE_MODE, onClick: () => this.props.switchViewMode(TABLE_MODE) });
    }

    return (
      <CustomDropdown
        target="switch-view-mode-icon"
        items={options}
        variant="control"
        trigger={this.renderCustomTrigger}
        triggerClassName="cur-view-path-btn px-1"
        toggleProps={{ 'aria-label': gettext('Switch view mode') }}
        menuPortal={false}
      />
    );
  }

}

ViewModes.propTypes = propTypes;

export default ViewModes;
