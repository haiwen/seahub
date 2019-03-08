import React from 'react';

class ViewerImage extends React.Component {

  constructor(props) {
    super(props);
  }

  render() {
    const { attributes, node } = this.props;
    const { data } = node;
    let src = data.get('src');

    let dom = (
      <span className="seafile-ed-image">
        <img draggable={false} src={src} alt="" { ...attributes }
          width={data.get('width')} height={data.get('height')}
        />
      </span>
    );
    return src ? dom : <span { ...attributes }>Loading...</span>;
  }

}

export { ViewerImage };
