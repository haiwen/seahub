
import React from 'react';
import TreeView from '../tree-view/tree-view';
import OutlineView from './outline';

class SidePanel extends React.Component {

  state = {
    navItem: "outline"
  }

  onOutlineClick = (event) => {
    event.preventDefault();
    this.setState({
      navItem: "outline"
    })
  }

  onFilesClick = (event) => {
    event.preventDefault();
    this.setState({
      navItem: "files"
    })
  }

  render() {
    var outlineActive = "";
    var filesActive = "";
    if (this.state.navItem == "outline") {
      outlineActive = "active";
    } else {
      filesActive = "active";
    }

    return (
      <div className="side-panel">
        <ul className="nav justify-content-center">
          <li className="nav-item">
            <a className={"nav-link " + outlineActive} href="#" onClick={this.onOutlineClick}><i className="fa fa-list"/></a>
          </li>
          <li className="nav-item">
            <a className={"nav-link " + filesActive} href="#" onClick={this.onFilesClick}><i className="fa fa-file"/></a>
          </li>
        </ul>
        <div className="side-panel-content">
        { this.state.navItem == "files" &&
        <TreeView
          editorUtilities={this.props.editorUtilities}
        />
        }
        { this.state.navItem == "outline" &&
        <OutlineView
          editor={this.props.editor}
          value={this.props.value}
        />
        }
        </div>
      </div>
    )
  }

}

export default SidePanel;
