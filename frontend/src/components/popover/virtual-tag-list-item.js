import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import VirtualTagColor from './virtual-tag-color';
import VirtualTagName from './virtual-tag-name';

import '../../css/repo-tag.css';
import './list-tag-popover.css';

export default class VirtualTagListItem extends React.Component {

  static propTypes = {
    item: PropTypes.object.isRequired,
    repoID: PropTypes.string.isRequired,
    deleteVirtualTag: PropTypes.func.isRequired,
    updateVirtualTag: PropTypes.func.isRequired,
  };

  constructor(props) {
    super(props);
    this.state = {
      isTagHighlighted: false
    };
  }

  onMouseOver = () => {
    this.setState({ isTagHighlighted: true });
  };

  onMouseOut = () => {
    this.setState({ isTagHighlighted: false });
  };

  deleteVirtualTag = () => {
    this.props.deleteVirtualTag(this.props.item);
  };

  render() {
    const { isTagHighlighted } = this.state;
    const { item, repoID } = this.props;
    return (
      <li
        className={`tag-list-item px-4 d-flex justify-content-between align-items-center ${isTagHighlighted ? 'hl' : ''}`}
        onMouseOver={this.onMouseOver}
        onMouseOut={this.onMouseOut}
      >
        <VirtualTagColor repoID={repoID} tag={item} updateVirtualTag={this.props.updateVirtualTag} />
        <VirtualTagName repoID={repoID} tag={item} updateVirtualTag={this.props.updateVirtualTag} />
        <button
          className={`tag-delete-icon sf2-icon-delete border-0 px-0 bg-transparent cursor-pointer ${isTagHighlighted ? '' : 'invisible'}`}
          onClick={this.deleteVirtualTag}
          aria-label={gettext('Delete')}
          title={gettext('Delete')}
        ></button>
      </li>
    );
  }
}
