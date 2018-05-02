

class Node {

  static create(attrs = {}) {

  }

  /**
   * Create a `Node` from a JSON `object`.
   *
   * @param {Object} object
   * @return {Node}
   */
  static fromJSON(object) {
    const {
      name,
      type,
      isExpanded = true,
      children = [],
    } = object;

    const node = new Node({
      name,
      type,
      isExpanded,
      children: children.map(Node.fromJSON),
    });

    return node;
  }


  constructor({ name, type, isExpanded, children }) {
    this.name = name;
    this.type = type;
    this.children = children ? children : [];
    this.isExpanded = isExpanded !== undefined ? isExpanded : true;
  }

  path() {
    if (!this.parent) {
      return this.name;
    } else {
      var p = this.parent.path();
      if (p === "/")
        return p + this.name;
      else
        return p + "/" + this.name;
    }
  }

  copy() {
    var n = new Node({
      name: this.name,
      type: this.type,
      isExpanded: this.isExpanded
    });
    n.children = this.children.map(child => { child.copy(); child.parent = n; return child; });
    return n;
  }

  isRoot() {
    return this.parent === undefined;
  }

  hasChildren() {
    return this.children.length > 0;
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

  /**
   * Return a JSON representation of the node.
   *
   * @return {Object}
   */
  toJSON() {
    var children = []
    if (this.hasChildren()) {
      children = this.children.map(m => m.toJSON());
    }

    const object = {
      name: this.name,
      type: this.type,
      isExpanded: this.isExpanded,
      children: children
    }

    return object
  }

}


export { Node }
