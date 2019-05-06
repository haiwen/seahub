import apply from './Apply';
import invert from './Invert';

export default class Operation {

  constructor(operation) {
    this.operation = operation;
  }

  apply(value) {
    let next = apply(value, this.operation);
    return next;
  }

  invert() {
    let inverted = invert(this);
    return inverted;
  }

}
