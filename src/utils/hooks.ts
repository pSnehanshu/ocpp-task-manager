import _ from 'lodash';
import async from 'async';

class Hook {
  hooks = {
    /* hookName: {
      before: [], // List of functions, signature: function (info:Object) {}
      after: [], // List of functions, signature: function (info:Object, result:Any) {}
    } */
  };

  static getBeforeKey(hookName = '') {
    return `["${hookName}"].before`;
  }

  static getAfterKey(hookName = '') {
    return `["${hookName}"].after`;
  }

  getBefore(hookName = '') {
    const key = Hook.getBeforeKey(hookName);
    let hooks = _.get(this.hooks, key, []);
    if (!Array.isArray(hooks)) hooks = [hooks];
    return hooks;
  }

  getAfter(hookName = '') {
    const key = Hook.getAfterKey(hookName);
    let hooks = _.get(this.hooks, key, []);
    if (!Array.isArray(hooks)) hooks = [hooks];
    return hooks;
  }

  before(hookName: string, hookFn = () => {}) {
    const exsiting = this.getBefore(hookName);
    _.set(this.hooks, Hook.getBeforeKey(hookName), [
      ...exsiting,
      hookFn,
    ]);
  }

  after(hookName: string, hookFn: Function) {
    const exsiting = this.getAfter(hookName);

    _.set(this.hooks, Hook.getAfterKey(hookName), [
      ...exsiting,
      hookFn,
    ]);
  }

  async execute<Info, Result>(hookName: string, task: Function, info: Info) {
    /*
    1. Execute "beforeHooks" in serial manner
    2. Execute "afterHooks" in serial manner
    */

    await this.executeBefore(hookName, info);
    const result = (await task()) as Result;
    return this.executeAfter(hookName, info, result);
  }

  executeBefore<Info>(hookName: string, info: Info) {
    return new Promise((resolve, reject) => {
      if (!hookName) return reject(new Error('Falsy hookname not allowed'));

      const hookFns = this.getBefore(hookName);

      return async.eachLimit(
        hookFns,
        1,
        async fn => {
          if (typeof fn === 'function') {
            return fn(info);
          }
          throw new TypeError(
            'Invalid hook handler defined, these should always be functions.',
          );
        },
        error => {
          if (error) {
            reject(error);
          } else {
            resolve(undefined);
          }
        },
      );
    });
  }

  executeAfter<Info, Result>(hookName: string, info: Info, result: Result) {
    return new Promise((resolve, reject) => {
      if (!hookName) return reject(new Error('Falsy hookname not allowed'));

      const hookFns = this.getAfter(hookName);

      return async.eachLimit(
        hookFns,
        1,
        async fn => {
          if (typeof fn === 'function') {
            return fn(info, result);
          }
          throw new TypeError(
            'Invalid hook handler defined, these should always be functions.',
          );
        },
        error => {
          if (error) {
            reject(error);
          } else {
            resolve(undefined);
          }
        },
      );
    });
  }
}

export default Hook;
