import React from 'react';
import PropTypes from 'prop-types';
import { Utils } from '../../utils/utils';

const propTypes = {
  onItemClick: PropTypes.func.isRequired,
};

class SearchedListItem extends React.Component {
  
  constructor(props) {
    super(props);
    this.state = {
      highlight: false,
    };
  }

  onMouseEnter = () => {
    this.setState({highlight: true});
  }

  onMouseLeave = () => {
    this.setState({highlight: false});
  }

  onClick = () => {
    let item = this.props.item;
    this.props.onItemClick(item);
  }

  render() {
    let item = this.props.item;
    let fileIconUrl = item.is_dir ? Utils.getFolderIconUrl(false, 24) : Utils.getFileIconUrl(item.name, 24);
    return (
      <tr className={this.state.highlight ? 'tr-highlight' : ''} onClick={this.onClick} onMouseEnter={this.onMouseEnter} onMouseLeave={this.onMouseLeave}>
        <td className="text-center"><img className="item-img" src={fileIconUrl} alt="" width="24"/></td>
        <td><span className="item-link">{item.repo_name}/{item.link_content}</span></td>
      </tr>
    );
  }
}

SearchedListItem.propTypes = propTypes;

export default SearchedListItem;
