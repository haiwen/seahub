import React from 'react';

class Image extends React.Component {

  render() {
    const { attributes, node, isSelected } = this.props;
    const { data } = node;
    const src = data.get('src');
    const className = isSelected ? 'active' : null
    return src
      ? <img src={src} className={className} alt={node.data.get('')} />
  : <span>Loading...</span>
  }

}

export { Image }
