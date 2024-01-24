const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class myPromise {
  constructor(executor) {
    // 2.2 每个promise实例都有3种状态, 默认是pending
    this.status = PENDING;
    this.result = null;
    this.onFulfilledCbs = [];
    this.onRejectedCbs = [];
    // 1.1 job1是被立即执行的 + job1被注入了promise中的变量 resolve/reject函数
    try {
      // 易错点1
      executor(resolve.bind(this), reject.bind(this));
    } catch (error) {
      reject.call(this, error);
    }
    // 2.3 p1状态一旦变为非pending状态，就无法再次改变，即只能有1次 修改状态的机会
    function resolve(value) {
      if (this.status === PENDING) {
        this.status = FULFILLED;
        this.result = value;
        // 3.4 如果注册回调时job1还未完成，就先订阅异步回调，等到resolve/reject再发布 所有回调
        this.onFulfilledCbs.forEach((cb) => cb());
      }
    }

    function reject(reason) {
      if (this.status === PENDING) {
        this.status = REJECTED;
        this.result = reason;
        this.onRejectedCbs.forEach((cb) => cb());
      }
    }
  }

  then(onFulfilled, onRejected) {
    // 3.2 回调函数都是可选的，如果没有注册，只需要透传job1的结果即可
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : v => v;
    onRejected = typeof onRejected === "function" ? onRejected : err => {throw err};

    let __resolve, __reject
    const task = handler => {
      queueMicrotask(() => {
        try {
          // 4.2 获取到onFul1/onRej1的返回值x，根据x值决定 p2的状态和结果
          let x = handler(this.result);
          resolvePromise(p2, x, __resolve,  __reject);
        } catch (err) {
          // 4.3 如果回调函数执行出错了，就reject p2
          __reject(err);
        }
      })
    }      
    // 4.1 p1.then(onFul1, onRej1)返回的是一个新的promsie对象p2
    let p2 = new myPromise((resolve, reject) => {
      __resolve = resolve
      __reject = reject
      if (this.status === FULFILLED) {
        // 3.3 回调函数都是微任务(异步执行)
        task(onFulfilled)
      } else if (this.status === REJECTED) {
        task(onRejected)
        // 3.4 如果注册回调时job1还未完成，就先订阅异步回调，等到resolve/reject再发布 所有回调
      } else if (this.status === PENDING) {
        this.onFulfilledCbs.push(() => task(onFulfilled));
        this.onRejectedCbs.push(() => task(onRejected));
      }
    });

    return p2;
  }

  // 其他实例方法
  catch(onRejected){
    return this.then(undefined, onRejected)
  }
  finally(cb){
    return this.then(
      (value) => myPromise.resolve( cb() ).then( () =>  value ),
      (err) => myPromise.resolve( cb() ).then( () => { throw err } )
    )
  }
  // 静态方法
  static resolve(data){
    if (data instanceof myPromise) {
      return data
    }
    if (data instanceof Object && 'then' in data) {
      return new myPromise((resolve, reject) => {
        data.then(resolve, reject)
      })
    }
    return new myPromise(resolve =>{
      resolve(data)
    })
  }
  static reject(reason){
    return new myPromise((resolve, reject) =>{
      reject(reason)
    })
  }
  static all(promises) {
    return new myPromise((resolve, reject) => {
      let res = [], count = 0
      if (!Array.isArray(promises)) {
        return reject(new TypeError('Argument is not iterable'))
      }
      if (!promises.length) {
        return resolve(res)
      }
      promises.forEach((item, index) => {
        //myPromise.resolve能同时处理px实例/thenable/基本类型数据
        myPromise.resolve(item).then(val => {
          count++
          res[index] = val
          count === promises.length && resolve(res)
        }, reject)
      })
    })
  }
  static race(promises) {
    return new myPromise((resolve, reject) => {
      if (!Array.isArray(promises)) {
        return reject(new TypeError('Argument is not iterable'))
      }
      if (promises.length) {
        promises.forEach(item => {
          myPromise.resolve(item).then(resolve, reject)
        })
      }
    })
  }
  static allSettled(promises) {
    return new myPromise((resolve, reject) => {
      let res = [], count = 0
      if (!Array.isArray(promises)) {
        return reject(new TypeError('Argument is not iterable'))
      }
      if (!promises.length) {
        return resolve(res)
      }
      promises.forEach((item, index) => {
        myPromise.resolve(item).then(
          val => {
            count++
            res[index] = { status: 'fulfilled', value: val}
            count === promises.length && resolve(res)
          },
          reason => {
            count++
            res[index] = { status:'rejected', reason: reason }
            count === promises.length && resolve(res)
          }
        )
      })
    })
  }
}


function resolvePromise(p2, x, resolve, reject) {
  // 5.1
  if (p2 === x) {
    throw new TypeError("Chaining cycle detected for promise")
  }
  // 5.2
  if (x === null || (typeof x !== 'function' && typeof x !== 'object')) {
    return resolve(x)
  } 
   // 5.3.1
  try {
    // 易错点2
    var then = x.then
  } catch (err) {
    return reject(err)
  }
  // 5.3.2
  if (typeof then === 'function') {
    let called = false
    try {
      then.call(
        x, 
        y => {
          //易错点3
          if (called) return;
          called = true
          resolvePromise(p2, y, resolve, reject)
        }, 
        r => {
          if (called) return;
          called = true
          reject(r)
        })
    } catch(err) {
      if (called) return;
      called = true;
      reject(err); 
    }
  } else {
    // 5.3.3
    resolve(x)
  }
}


myPromise.deferred = function () {
  let result = {};
  result.promise = new myPromise((resolve, reject) => {
    result.resolve = resolve;
    result.reject = reject;
  });
  return result;
};

module.exports = myPromise;