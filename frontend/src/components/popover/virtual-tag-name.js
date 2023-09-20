import React from 'react';
import PropTypes from 'prop-types';

import '../../css/repo-tag.css';

export default class VirtualTagName extends React.Component {

  static propTypes = {
    updateVirtualTag: PropTypes.func.isRequired,
    tag: PropTypes.object.isRequired,
    repoID: PropTypes.string.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {
      tagName: this.props.tag.name,
      isEditing: true,
    };
    this.input = React.createRef();
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (nextProps.tag.name !== this.state.tagName) {
      this.setState({
        tagName: nextProps.tag.name,
      });
    }
  }

  componentDidMount() {
    setTimeout(() => {
      this.input.current.focus();
    }, 1);
  }

  toggleMode = () => {
    this.setState({
      isEditing: !this.state.isEditing
    });
  };

  updateTagName = (e) => {
    const newName = e.target.value;
    this.props.updateVirtualTag(this.props.tag, { name: newName });
    this.setState({
      tagName: newName
    });
  };

  onInputKeyDown = (e) => {
    if (e.key == 'Enter') {
      this.toggleMode();
      this.updateTagName(e);
    }
    else if (e.key == 'Escape') {
      e.nativeEvent.stopImmediatePropagation();
      this.toggleMode();
    }
  };

  onInputBlur = (e) => {
    this.toggleMode();
    this.updateTagName(e);
  };

  render() {
    const { isEditing, tagName } = this.state;
    return (
      <div className="mx-2 flex-fill d-flex">
        {isEditing ?
          <input
            type="text"
            ref={this.input}
            defaultValue={tagName}
            onBlur={this.onInputBlur}
            onKeyDown={this.onInputKeyDown}
            className="flex-fill form-control-sm form-control"
          /> :
          <span
            onClick={this.toggleMode}
            className="cursor-pointer flex-fill"
            style={{width: 100, height: 20}}
          >{tagName}</span>
        }
      </div>
    );
  }
}
