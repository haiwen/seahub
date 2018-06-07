import React from 'react';
import { processor, processorGetAST } from "./seafile-markdown2html"
import { IconButton, CollabUsersButton, Button, ButtonGroup } from "./topbarcomponent/editorToolBar";
import TreeView from '../tree-view/tree-view';
import OutlineView from './viewer-outline';
import dayjs from 'dayjs';
import { translate } from "react-i18next";

var URL = require('url-parse');

require('codemirror/lib/codemirror.css');
require('codemirror/mode/markdown/markdown');
require('../css/markdown-viewer.css');


class ViewerSidePanel extends React.Component {

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
      <div className="seafile-md-viewer-side-panel">
        <div className="seafile-md-viewer-side-panel-heading">
          Contents
        </div>
        <div className="seafile-md-viewer-side-panel-content">
        { this.state.navItem == "files" &&
        <TreeView
          editorUtilities={this.props.editorUtilities}
        />
        }
        { this.state.navItem == "outline" &&
        <OutlineView
          treeRoot={this.props.treeRoot}
          viewer={this.props.viewer}
        />
        }
        </div>
      </div>
    )
  }

}

class MarkdownViewer extends React.Component {


  switchToEditor = () => {
    this.props.switchToEditor();
  }

  onEdit = (event) => {
    event.preventDefault();
    this.switchToEditor();
  }

  scrollToNode(node) {
    var url = new URL(window.location.href);
    url.set("hash", "user-content-" + node.data.id);
    window.location.href = url.toString();
  }

  componentDidMount() {
    // reset the href to jump to the section
    var url = new URL(window.location.href);
    if (url.hash) {
      window.location.href = window.location.href;
    }
  }

  renderToolbar() {
    const { t, collabUsers } = this.props
    return (
      <div>
        <ButtonGroup>
          <IconButton text={t('edit')} id={'editButton'} icon={"fa fa-edit"} onMouseDown={this.onEdit} />
          <CollabUsersButton tooltip={t('show_users_on_this_document')} users={collabUsers} id={'usersButton'} />

        </ButtonGroup>
      </div>
    );
  }

  render() {
    var html = processor.processSync(this.props.markdownContent).toString();
    var treeRoot = processorGetAST.runSync(processorGetAST.parse(this.props.markdownContent));
    var modifyTime = dayjs(this.props.fileInfo.mtime*1000).format("YYYY-MM-DD HH:mm:ss");

    return (
      <div className="seafile-md-viewer d-flex flex-column">
        <div className="seafile-md-viewer-topbar d-flex justify-content-between">
          <div>
            <h1 className="seafile-md-viewer-filename">{this.props.fileInfo.name}</h1>
            <p className="seafile-md-viewer-file-modify-time">{modifyTime}</p>
          </div>
          {this.renderToolbar()}
        </div>
        <div className="seafile-md-viewer-main d-flex">
          <div className="seafile-md-viewer-main-panel">
            <div className="seafile-md-viewer-rendered-content article" dangerouslySetInnerHTML={{ __html: html }}></div>
          </div>
          <ViewerSidePanel
            treeRoot={treeRoot}
            viewer={this}
            editorUtilities={this.props.editorUtilities}
          />
        </div>
      </div>
    )
  }

}

export default translate("translations")(MarkdownViewer);
