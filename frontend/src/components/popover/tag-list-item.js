import React from 'react';
import PropTypes from 'prop-types';
import { gettext } from '../../utils/constants';
import TagColor from '../dialog/tag-color';
import TagName from '../dialog/tag-name';

import '../../css/repo-tag.css';
import './list-tag-popover.css';

const tagListItemPropTypes = {
  item: PropTypes.object.isRequired,
  repoID: PropTypes.string.isRequired,
  onDeleteTag : PropTypes.func.isRequired
};

class TagListItem extends React.Component {

  constructor(props) {
    super(props);
    this.state = {
      isTagHighlighted: false
    };
  }

  onMouseOver = () => {
    this.setState({
      isTagHighlighted: true
    });
  };

  onMouseOut = () => {
    this.setState({
      isTagHighlighted: false
    });
  };

  deleteTag = () => {
    this.props.onDeleteTag(this.props.item);
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
        <TagColor repoID={repoID} tag={item} />
        <TagName repoID={repoID} tag={item} />
        <button
          className={`tag-delete-icon sf2-icon-delete border-0 px-0 bg-transparent cursor-pointer ${isTagHighlighted ? '' : 'invisible'}`}
          onClick={this.deleteTag}
          aria-label={gettext('Delete')}
          title={gettext('Delete')}
        ></button>
      </li>
    );
  }
}

TagListItem.propTypes = tagListItemPropTypes;

export default TagListItem;
