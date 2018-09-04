class Node {

  static deserializefromJson(object) {
    const {name, type, size, last_update_time, isExpanded = true, children = []} = object;

    const node = new Node({
      name,
      type,
      size,
      last_update_time,
      isExpanded,
      children: children.map(item => Node.deserializefromJson(item)),
    });

    return node;
  }
  
  constructor({name, type, size, last_update_time, isExpanded, children}) {
    this.name = name;
    this.type = type;
    this.size = size;
    this.last_update_time = last_update_time;
    this.isExpanded = isExpanded !== undefined ? isExpanded : true;
    this.children = children ? children : [];
    this.parent = null;
  }
  
  clone() {
    var n = new Node({
      name: this.name,
      type: this.type,
      size: this.size,
      last_update_time: this.last_update_time,
      isExpanded: this.isExpanded
    });
    n.children = this.children.map(child => { 
      var newChild = child.clone(); 
      newChild.parent = n; 
      return newChild; 
    });
    return n;
  }

  get path() {
    if (!this.parent) {
      return this.name;
    } else {
      let p = this.parent.path;
      return p === "/" ? (p + this.name) : (p + "/" + this.name);
    }
  }

  hasChildren() {
    return this.children.length > 0;
  }

  isRoot() {
    return this.parent === undefined;
  }

  isMarkdown() {
    let index = this.name.lastIndexOf(".");
    if (index == -1) {
      return false;
    } else {
      let type = this.name.substring(index).toLowerCase();
      if (type == ".md" || type == ".markdown") {
        return true;
      } else {
        return false;
      }
    }
  }

  isDir() {
    return this.type == "dir";
  }

  isImage() {
    let index = this.name.lastIndexOf(".");
    if (index == -1) {
      return false;
    } else {
      let type = this.name.substring(index).toLowerCase();
      if (type == ".png" || type == ".jpg") {
        return true;
      } else {
        return false;
      }
    }
  }

  serializeToJson() {
    var children = []
    if (this.hasChildren()) {
      children = this.children.map(m => m.toJSON());
    }

    const object = {
      name: this.name,
      type: this.type,
      size: this.size,
      last_update_time: this.last_update_time,
      isExpanded: this.isExpanded,
      children: children
    }

    return object
  }

}

export default Node;