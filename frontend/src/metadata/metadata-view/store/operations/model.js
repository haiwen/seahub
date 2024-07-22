import deepCopy from 'deep-copy';
import { OPERATION_ATTRIBUTES } from './constants';
import apply from './apply';
import invert from './invert';

class Operation {

  constructor(operation) {
    const newOperation = deepCopy(operation);
    const type = newOperation.type || newOperation.op_type;
    const attributes = OPERATION_ATTRIBUTES[type];
    this.op_type = type;
    attributes.forEach((param) => {
      this[param] = newOperation[param];
    });
    this.success_callback = newOperation.success_callback;
    this.fail_callback = newOperation.fail_callback;
  }

  clone() {
    return new Operation(this);
  }

  apply(pageData) {
    return apply(pageData, this);
  }

  invert() {
    return invert(this);
  }

  set(key, value) {
    this[key] = value;
  }
}

export default Operation;
