/**
 * Serialised Write Queue
 * 
 * Prevents race conditions and lost updates when multiple asynchronous
 * persistence actions occur in rapid succession.
 */

export class WriteQueue {
  private queue: Promise<unknown> = Promise.resolve()

  /**
   * Enqueues an asynchronous write operation and returns a promise
   * that resolves with the operation's result.
   */
  public enqueue<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue = this.queue
        .then(() => operation())
        .then(resolve)
        .catch(reject)
    })
  }
}
