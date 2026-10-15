/**
 * Runs async tasks one at a time per key, in the order they were added; tasks of different keys run
 * independently.
 *
 * Recording a roll reads the user's flags and writes them back, so two rolls of the same user recorded at
 * the same time (initiative for a group, an attack on several targets) would otherwise overwrite each
 * other's results. A failing task is reported through `onError` and doesn't stop the tasks after it.
 */
export class KeyedQueue<Key = string> {
  readonly #tails = new Map<Key, Promise<void>>();
  readonly #onError: (error: unknown) => void;

  /** @param onError Called with the error of a task that throws or rejects. */
  constructor(onError: (error: unknown) => void) {
    this.#onError = onError;
  }

  /** Add a task for `key`; it starts once every task added before it for the same key has finished. */
  run(key: Key, task: () => Promise<void> | void): Promise<void> {
    const previous = this.#tails.get(key) ?? Promise.resolve();
    const next = previous.then(task).catch(this.#onError);
    this.#tails.set(key, next);
    void next.then(() => {
      // Forget the key once its queue is empty, so the map doesn't grow with every user ever seen
      if (this.#tails.get(key) === next) this.#tails.delete(key);
    });
    return next;
  }

  /** Resolves once every task added so far for `key` has finished. */
  settled(key: Key): Promise<void> {
    return this.#tails.get(key) ?? Promise.resolve();
  }
}
