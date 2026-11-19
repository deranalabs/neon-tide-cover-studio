// Undo and redo for cover edits: a bounded stack of state snapshots stored as JSON strings.

export class EditHistory {
  constructor(limit = 100) {
    this.limit = limit;
    this.past = [];
    this.future = [];
  }

  /** Records a state as the newest step, unless it equals the current one; clears the redo stack. */
  push(state) {
    const snapshot = JSON.stringify(state);
    if (this.past[this.past.length - 1] === snapshot) return false;
    this.past.push(snapshot);
    if (this.past.length > this.limit) this.past.shift();
    this.future = [];
    return true;
  }

  get canUndo() {
    return this.past.length > 1;
  }

  get canRedo() {
    return this.future.length > 0;
  }

  /** Steps back; returns the earlier state or null. */
  undo() {
    if (!this.canUndo) return null;
    this.future.push(this.past.pop());
    return JSON.parse(this.past[this.past.length - 1]);
  }

  /** Steps forward again; returns the state or null. */
  redo() {
    if (!this.canRedo) return null;
    const snapshot = this.future.pop();
    this.past.push(snapshot);
    return JSON.parse(snapshot);
  }
}
