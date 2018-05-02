
import React from 'react';

class CheckListItem extends React.Component {

  onChange = event => {
    const checked = event.target.checked
    const { editor, node } = this.props
    editor.change(c => c.setNodeByKey(node.key, { data: { checked } }))
  }

  render() {
    const { attributes, children, node, isSelected } = this.props;
    const checked = node.get('data').get('checked');
    return (
      <li {...attributes} className="task-list-item" >
      <input type="checkbox" checked={checked} onChange={this.onChange} />
      {children}
      </li>
    )
  }

}

export default CheckListItem;
