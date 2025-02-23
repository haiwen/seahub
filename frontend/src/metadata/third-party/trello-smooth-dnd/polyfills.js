/* eslint-disable no-extend-native */
(function (constructor) {
  if (constructor && constructor.prototype && !constructor.prototype.matches) {
    constructor.prototype.matches =
      constructor.prototype.matchesSelector ||
      constructor.prototype.mozMatchesSelector ||
      constructor.prototype.msMatchesSelector ||
      constructor.prototype.oMatchesSelector ||
      constructor.prototype.webkitMatchesSelector ||
      function (s) {
        var matches = (this.document || this.ownerDocument).querySelectorAll(s);
        var i = matches.length;
        // while (--i >= 0 && matches.item(i) !== this) { } // need confirm.
        return i > -1;
      };
  }
})(window.Node || window.Element);

// Overwrites native 'firstElementChild' prototype.
// Adds Document & DocumentFragment support for IE9 & Safari.
// Returns array instead of HTMLCollection.
(function (constructor) {
  if (
    constructor &&
    constructor.prototype &&
    constructor.prototype.firstElementChild == null
  ) {
    Object.defineProperty(constructor.prototype, 'firstElementChild', {
      get: function () {
        var node;
        var nodes = this.childNodes;
        var i = 0;
        while ((node = nodes[i++])) {
          if (node.nodeType === 1) {
            return node;
          }
        }
        return null;
      }
    });
  }
})(window.Node || window.Element);

// Production steps of ECMA-262, Edition 5, 15.4.4.17
// Reference: http://es5.github.io/#x15.4.4.17
if (!Array.prototype.some) {
  Array.prototype.some = function (fun /* , thisArg*/) {
    // eslint-disable-next-line strict
    'use strict';

    if (this == null) {
      throw new TypeError('Array.prototype.some called on null or undefined');
    }

    if (typeof fun !== 'function') {
      throw new TypeError();
    }

    var t = Object(this);
    var len = t.length >>> 0;

    var thisArg = arguments.length >= 2 ? arguments[1] : void 0;
    for (var i = 0; i < len; i++) {
      if (i in t && fun.call(thisArg, t[i], i, t)) {
        return true;
      }
    }

    return false;
  };
}
