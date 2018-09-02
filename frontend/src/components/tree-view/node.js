class Node {

  static deserializefromJson(object) {
    const { id, name, type, username, slug, link, permission, created_at, updated_at, isExpanded = true, children = []} = object;

    const node = new Node({
      id,
      name,
      type,
      username,
      slug,
      link,
      permission,
      created_at,
      updated_at,
      isExpanded,
      children: children.map(Node.fromJSON),
    });

    return node;
  }
  
  constructor({id, name, type, username, slug, link, permission, created_at, updated_at, isExpanded, children}) {
    this.id = id;
    this.name = name;
    this.type = type;
    this.username = username;
    this.slug = slug;
    this.link = link;
    this.permission = permission;
    this.created_at = created_at;
    this.updated_at = updated_at;
    this.isExpanded = isExpanded !== undefined ? isExpanded : true;
    this.children = children ? children : [];
    this.parent = null;
  }
  
  clone() {
    var n = new Node({
      id: this.id,
      name: this.name,
      type: this.type,
      username: this.username,
      slug: this.slug,
      permission: this.permission,
      created_at: this.created_at,
      updated_at: this.updated_at,
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
      id: this.id,
      name: this.name,
      type: this.type,
      username: this.username,
      slug: this.slug,
      permission: this.permission,
      created_at: this.created_at,
      updated_at: this.updated_at,
      isExpanded: this.isExpanded,
      children: children
    }

    return object
  }

}

export default Node;