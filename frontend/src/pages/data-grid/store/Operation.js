import apply from './apply';
import invert from './invert';

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
