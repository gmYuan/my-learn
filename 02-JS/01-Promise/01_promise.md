
## 1 Promise的实现

1. executor是立即执行的 ==> 注入器模式
  - 1.1 job1是被立即执行的 + job1被注入了promise中的变量 resolve/reject函数
  - 1.2 这样在 job1执行完毕后，就有方法 把其执行结果，反向传回给p1
  - 1.3 如果job1执行出错，则 p1是 rejected状态
```ts
class MyPromise{
  constructor(executor) {
    try {
      // 1.1 注入器模式: A(B) ==> B(A.C) ==> B在执行时就有了媒介C，和A进行通信
      executor(resolve.bind(this), reject.bind(this));
    } catch (err) {
      reject.call(this, err);
    }
    function resolve(){}
    function reject() {}
  }
}
```

2. resolve/reject ==> 改变p1的 status和result ==> 发布订阅模式
  - 2.1 通过resolve/reject，可以获取到job1的 状态和结果，从而更新promise实例对象的 状态和结果
  - 2.2 每个promise实例都有3种状态：等待态pending/ 完成态fulfilled/ 拒绝态rejected，默认是 pending
  - 2.3 p1状态一旦变为非pending状态，就无法再次改变，即只能有1次 修改状态的机会
  - 2.4 当job1中是异步调用resolve/reject时，需要先订阅p1.then(cb1, eb1)的回调，然后在resolve时发布

```ts
const PENDING = "pending";
const FULFILLED = "fulfilled";
const REJECTED = "rejected";

class MyPromise {
  constructor(executor) {
    // 2.2
    this.status = PENDING;
    this.result = null;
    this.onFulfilledCbs = [];
    this.onRejectedCbs = [];
    try {
      executor(resolve.bind(this), reject.bind(this));
    } catch (error) {
      reject.call(this, error);
    }
    // 2.3
    function resolve(value) {
      if (this.status === PENDING) {
        this.status = FULFILLED
        this.result = value;
        // 2.4
        this.onFulfilledCbs.forEach(cb => cb());
      }
    }
    function reject(reason) {
      if (this.status === PENDING) {
        this.status = REJECTED
        this.result = reason;
        this.onRejectedCbs.forEach(cb => cb());
      }
    }
  }
}
```

3. then(onFulfilled, onRejected) ==> 参数透传 + enqueueTask + 返回Promise + 分类调用task
  - 3.1 then用于注册 job1的回调函数，分别用于处理 兑现态和拒绝态的情况
  - 3.2 回调函数都是可选的，如果没有注册，只需要透传job1的结果即可
  - 3.3 回调函数都是微任务(异步执行) ==> enqueueTask/ task
  - 3.4 如果注册回调时job1还未完成，就先订阅异步回调，等到resolve/reject再发布 所有回调

```ts
// ...省略内容见上
class myPromise {
  constructor(executor) {
    // ...省略内容见上
  }

  then(onFulfilled, onRejected) {
    // 3.2
    onFulfilled = typeof onFulfilled === "function" ? onFulfilled : v => v;
    onRejected = typeof onRejected === "function" ? onRejected : err => {throw err};
    const task = handler => {
      queueMicrotask(() => handler(this.result))
    }

    if (this.status === FULFILLED) {
      // 3.3
      task(onFulfilled)
    } else if (this.status === REJECTED) {
      task(onRejected)
    } else if (this.status === PENDING) {
      // 3.4
     	this.onFulfilledCbs.push(() => task(onFulfilled))
			this.onRejectedCbs.push(() => task(onRejected))
    }
  }
}
```

3.5 使用注意点
```ts
// 1 只有在resolve/reject被调用后，then里的回调才会进入微任务队列，准备执行
const p1 = new Promise((resolve, reject) => {
  console.log(1)
})
// 因为p1一直是pending状态，所以永远不会执行回调函数
p1.then(() => {
  console.log(2)
})
console.log('3', p1)
/**
 * 结果是
 * 1
 * 3 Promise { <pending> } 
 */

// 例2 p1.then(cb1)里，当cb1的类型不是函数时，p1会透传 之前px实例的返回值
Promise.resolve(1)
  .then(2)
  .then(Promise.resolve(3))
  .then(val => console.log(val))
/**
 * 结果是
 * 1
 */
```

4. 链式调用 ==> try获取cb结果 + resolvePromise ==> 根据回调返回值x 决定p2的状态和结果
  - 4.1 p1.then(onFul1, onRej1)返回的是一个新的promsie对象p2
  - 4.2 调用 onFul1/onRej1(p1.result)，获取其返回值x，根据x值决定 p2的状态和结果 ==> resolvePromise
  - 4.3 如果回调函数执行出错了，就reject p2
  - 本质上，p1.then的状态结果，由then(cb)中 cb的返回值类型决定，即只有到cb被调用时 p2状态才能确定

```ts
// ...省略内容见上
class myPromise {
  constructor(executor) {
    // ...省略内容见上
  }

  then(onFulfilled, onRejected) {
    // ...省略内容见上
    let __resolve, __reject
    const task = handler => {
      queueMicrotask(() => {
        // 4.2 
        try {
          let x = handler(this.result)
          resolvePromise(p2, x, __resolve, __reject)
        } catch(err) {
          // 4.3
          __reject(err)
        }
      })
    }
    // 4.1
    const p2 = new Promise((resolve, reject) => {
      __resolve = resolve
      __reject = reject
      if (this.status === FULFILLED) {
       // ...省略内容见上
      } 
      // ...省略内容见上
    })
    return p2 
  }
}
function resolvePromise(promise2, x, resolve, reject) {}
```

4.4 使用注意点
```ts
// p1.then(cb1)中的 cb1出错时，会被默认catch住 + 此时p1是rejected状态
const p0 = new Promise((resolve, reject) => {
  setTimeout(() => {
    resolve('success')
  }, 1000)
})
const p1 = p0.then(() => {
  throw new Error('error了')
})
setTimeout(() => {
  console.log('p1', p1)
}, 2000)
/**
 * 结果是
 * Uncaught (in promise) Error: error了
 * p1 Promise {<rejected>: Error: error了
 */
```

5. resolvePromise(promise2, x, resolve, reject) ==>  循环引用判断 + 递归终止条件 + try读取then + thenable递归调用
  - 5.1 如果p2和x指向同一对象，以循环引用作为 TypeError的原因报错
  - 5.2 递归终止条件: 基本类型，则return resolve(x)
  - 5.3 如果x为对象或函数:
    - 5.3.1 尝试读取x.then，如果报错e, 则 return reject(e)
    - 5.3.2 如果then是函数，则调用then来 注册回调，递归调用resolvePromise，由最后一个px实例决定 p2的状态和结果
    - 5.3.3 如果then不是函数，就把x看作是普通对象，直接return resolve(x)

```ts
// ...省略内容见上
class myPromise {}

// resolve和reject都是用来更新p2的，x表示p1.then(cb)里的 cb返回值
function resolvePromise(p2, x, resolve, reject) {
  // 5.1
  if (p2 === x) {
    throw new TypeError("Chaining cycle detected for promise")
  }
  // 5.2
  if (x === null || (typeof x !== 'function' && typeof x !== 'object')) {
    return resolve(x)
  } 
   // 5.3.1 注意这里使用var读取then, 如果使用let无法通过测试==> let存在块级作用域
  try {
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
```

5.4 使用注意点
```ts
Promise.resolve().then(() => {
  return new Error('error了')
}).then(res => {
  console.log("then: ", res)
}).catch(err => {
  console.log("catch: ", err)
})
/**
 * 注意！结果是
 * then: Error: error了
 * 
 * 如果想让p1.catch执行，应该使用以下2种方式
 * return Promise.reject( new Error('error了') )
 * throw new Error('error了')
 */

// 例2
p1.then(cb1).then(cb2)的链式调动，只有在前一个then状态完成后，后一个then才会执行；
利用 then队列阻塞性质 + 更新当前px实例技巧，可以实现多个异步任务之间的顺序执行
具体见下文 mergePromise实现
```

具体所有的 MyPromise实现代码，见 [MyPromise实现](https://github.com/gmYuan/my_learn/blob/main/JS/01_Promise/code/MyPromise.js)

关于V8里如何实现Promise，强烈建议阅读这篇文章 [V8 Promise源码全面解读](https://juejin.cn/post/7055202073511460895)，其中主要介绍了以下2个知识点:

- 当 p2 = p1.then(onFul, onRej)中，onFul/onRej返回的值px是 thenable类型时(包括Promise类型)，则V8内部会依次绑定以下微任务: px.then注册 ==> 根据px状态，入队 px.onFul/px.onRej ==> 根据px的状态和val,确定了p2的状态，从而入队 p2.onFul/p2.onRej

- 当p1为拒绝态后，会有一个微任务检测函数，用于检测之后 有无onRej处理函数被注册，如果还未注册就会报错


## 2 Promise其他方法实现

1. Promise.resolve(data)方法 ==> 分类讨论data ==> 返回p2，状态由传入值data的类型决定
  - 1.1 data为promise实例，则直接返回data，即data相当于就是p2
  - 1.2 data为thenable类型，则调用then方法，由data的结果决定p2的结果
  - 1.3 data为基础类型值，则返回 resolve(data)

```ts
class myPromise {
  //... 其他省略内容
  static resolve(data){
    // promise类型
    if (data instanceof myPromise) {
      return data
    }
    // thenable类型
    if (data instanceof Object && 'then' in data) {
      return new myPromise((resolve, reject) => {
        data.then(resolve, reject)
      })
    }
    // 其他基本类型
    return new myPromise(resolve =>{
      resolve(data)
    })
  }
}
```

2. Promise.reject方法 ==> 返回拒绝状态的p2
```ts
class myPromise {
  //... 其他省略内容
  static reject(reason){
    return new myPromise((resolve, reject) =>{
      reject(reason)
    })
  }
}
```

3. Promise.prototype.catch方法 ==> then方法的语法糖
```ts
class myPromise {
  //... 其他省略内容
  catch(onRejected){
    return this.then(undefined, onRejected)
  }
}
```

3.2 p2.catch使用注意点
```ts
// p2.catch(cb)能处理透传过来的rejected状态的p1 + 返回一个resolved状态的新promise实例
// promise实例能透传错误的原因，是缺少onReject时会 throw p1.result
const p1 = new Promise((resolve, reject) => {
  reject("error了");
  resolve("success2");
});
p1.then(res => {
  console.log("then1: ", res);
}).catch(err => {
  console.log("catch: ", err);
}).then(res => {
  console.log("then3: ", res);
})

/**
 * 结果是
 * catch: error了
 * then3: undefined
 * 
 * 过程分析：
 * p1调用了reject('error了') ==> p1: {status: 'rejected', result: 'error了'};
 * 
 * p1.then(onFul1, null) ==> onReject1构造了throw err ==> 
 * 触发了 onReject1(p1.result) ==> 触发了 p2.__reject(p1.result) ==>
 * p2: {status: 'rejected', result: 'error了'};
 * 
 * p2.catch(undefiend, onReject2) ==> 触发了 let x = onReject2(p2.result) ==>
 * 执行了onReject2(p2.result) + x为undefined ==> p3: {status: 'fulfilled', result: unde}
 * 
 * 过程同上，触发了p3.then(onFul3) ==> 执行了onFul3(p3.result)
 */
```

4. Promise.prototype.finally(cb)方法 ==> then的 闭包透传
  - 4.1 p1.finally(cb)里，只要p1确定了状态，cb就必然进入微任务队列 ==> 必然执行cb
  - 4.2 cb不接受任何的参数 + p1.finally返回的是p3，p3状态由p1决定 ==> then透传
  - 4.3 它最终返回的是一个上一次的Promise对象值，不过如果fianlly里抛出一个异常，则返回异常的Promise对象

```ts
class myPromise {
  //... 其他省略内容
  finally(cb) { 
    return this.then(
      value => Promise.resolve(cb()).then(() => value),
      err => Promise.resolve(cb()).then(() => { throw err })
    )
  }
}
```

4.2 p1.finally使用注意点
```ts
//例1 
Promise.resolve('1').then(res => {
  console.log(res)
}).finally(() => {
  console.log('finally1')
})

Promise.reject('2').finally(res => {
  console.log('finally2的res:', res)
  return '我是finally2返回的值'
  // throw Error('我是finally2的报错')
}).then(res => {
  console.log('finally2后面的then函数:', res)
}, err => {
  console.log('err是', err)   // 当finally里报错时就会执行该语句
})

/**
 * 结果是
 * 1
 * finally2的res: undefined
 * 
 * finally1
 * err是 2
 * 
 * 过程解析
 * p1: {status: 'rejected', result: '2'} ==> p1.finally(cb) ==>
 * 触发了 p1.then(onFul1, onReject1) ==> 调用onReject1 ==> 
 * 触发了 Promise.resolve(cb()) ==> p2: {status: 'fulfilled', result: cb的返回值 } ==>
 * 
 * 触发了 p2.then(onFul2, xx) ==> 调用onFul2
 * 触发了 throw p1.result ==> p3: {status: 'rejected', result: '2'}
 */
```

5. Promise.all(promises)方法 ==> 参数类型&长度 判断 + myPromise.resolve使用
  - 5.1 返回一个promise对象 p2: {status: null, result: null}
  - 5.2 当promises 是非数组时，p2为拒绝态 + result为typeError
  - 5.3 当promises 是空数组时，p2: {status: 'fulfilled', result: [] }
  - 5.4 当promises 是非空数组时 + 只要有一个成员是拒绝态，就返回 p2: {status: 'rejected', result: errorReason1 }
  - 5.5 当promises 是非空数组时 + 每个成员都不是拒绝态，则在所有成员完成成功后， 按传入顺序返回p2的result结果

```ts
class myPromise {
  //... 其他省略内容
  static all(promises) {
    let res = []
    let count = 0
    //5.1
    return new myPromise((resolve, reject) => {
      //5.2
      if (!Array.isArray(promises)) {
        return reject(new TypeError('Argument is not iterable'))
      }
      //5.3
      if (!promises.length) {
        return resolve(res)
      }
      //5.5
      promises.forEach((item, index) => {
        //myPromise.resolve能同时处理px实例/thenable/基本类型数据
        myPromise.resolve(item).then(val => {
          count++
          res[index] = val
          count === promises.length && resolve(res)
          // 5.4
        }, reject)
      })
    })
  }
}
```

6. Promise.race(promises)方法 ==> 参数 类型&长度 判断 + myPromise.resolve使用
  - 6.1 返回 p2对象
  - 6.2 如果 promises为非数组，则p2为参数类型错误的 拒绝态
  - 6.3 如果 promises为 空数组，则 p2一直是 pending状态
  - 6.4 如果 promises为 非空数组，则 p2根据首个返回的px实例，返回status和result

```ts
class myPromise {
  //... 其他省略内容
  static race(promises) {
    //6.1
    return new myPromise((resolve, reject) => {
      //6.2
      if (!Array.isArray(promises)) {
        return reject(new TypeError('Argument is not iterable'))
      }
      //6.3 + 6.4
      if (promises.length) {
        promises.forEach(item => {
          //易错点
          myPromise.resolve(item).then(resolve, reject)
        })
      }
    })
  }
}
```

6.5 Promise.race使用的注意事项
```ts
// 例1 p4 = Promise.race([p1, p2, p3])会返回第1个执行完成的异步任务，其他异步任务的执行结果会被p4忽略
function runAsync (x) {
  const p = new Promise(r => setTimeout(() => r(x, console.log(x)), 1000))
  return p
}
Promise.race([runAsync(1), runAsync(2), runAsync(3)])
  .then(res => console.log('result: ', res))
/**
 * 结果是
 * 1
 * result: 1
 * 2
 * 3
 */
```

7. Promise.allSettled(promises)方法 ==> Promise.all + 固定为resolve状态
  - 7.1 返回新的p2对象
  - 7.2 promises非数组类型: reject(类型错误)
  - 7.3 promises为 空数组: resolve([])
  - 7.4 promises为 非空数组: resolve(promises每个成员的结果)

```ts
class myPromise {
  // ...其他省略内容
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
```


## 3 Promise常见题

Q1 写出下面输出结果
```ts
const p1 = new Promise((resolve) => {
  setTimeout(() => {
    resolve('resolve3');
    console.log('timer1')
  }, 0)
  resolve('resovle1');
  resolve('resolve2');
}).then(res => {
  console.log(res)
  setTimeout(() => {
    console.log(p1)
  }, 1000)
  return 3
}).finally(res => {
  console.log('finally', res)
})

/**
 * 结果是
 * resovle1
 * finally undefined
 * timer1
 * Promise { 3 } // 注意p1指向的是px.finally返回的promise实例 + finally的返回规则
 *  
 */
```

---------------------------------
Q2 使用Promise实现每隔1秒输出1,2,3

A:
```ts
function print() {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });
}
function autoPrint() {
  [1, 2, 3].reduce((preP, curVal, curIndex) => {
    return preP.then(() => {
        console.log(curVal)
        return print().then(() => {
            if (curIndex === 2) autoPrint()
        })
    })
  }, Promise.resolve());
}
// 执行入口函数
autoPrint()
```

------------------------------------------
Q3 使用Promise实现红绿灯交替重复亮：
红灯3秒亮一次，黄灯2秒亮一次，绿灯1秒亮一次，让三个灯不断交替重复亮灯

A:
```ts
function red() {
  console.log("red");
}
function green() {
  console.log("green");
}
function yellow() {
  console.log("yellow");
}

// 方法1
// 亮灯函数实现
const light = (cb, duration) => {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      cb()
      resolve()
    }, duration * 1000)
  })
}
function showLight() {
  Promise.resolve().then(() => {
    // 如果没有return，就会默认返回 Promise.resolve(undefined)
    return light(red, 3)
  }).then(() => {
    return light(yellow, 2)
  }).then( () => {
    return light(green, 1)
  }).then(() => {
    showLight()
  })
}
showLight()

// 方法2
function showLight() {
  const data = [
    { handler: red, duration: 3000 },
    { handler: yellow, duration: 2000 },
    { handler: green, duration: 1000}
  ]
  data.reduce((pre, cur, curIndex) => {
    return pre.then(val => {
      return new Promise(r => {
       setTimeout(() => {
        cur.handler()
        r()
        if (curIndex === 2) showLight()
       }, cur.duration);
      })
    })
  }, Promise.resolve())
}
showLight()
```

------------------------------------------
Q4 实现mergePromise函数：
实现mergePromise函数，把传进去的数组按顺序先后执行，并且把返回的数据先后放到数组data中。

```ts
const time = duration => {
  return new Promise(resolve => {
    setTimeout(() => {
      resolve()
    }, duration)
  })
}
const ajax1 = () => time(2000).then(() => {
  console.log(1);
  return 1
})
const ajax2 = () => time(1000).then(() => {
  console.log(2);
  return 2
})
const ajax3 = () => time(1000).then(() => {
  console.log(3);
  return 3
})

// 方法1
function mergePromise (arr) {
  let res = []
  return arr.reduce((pre, cur, index) => {
    return pre.then(cur).then(val => {
      res.push(val)
      return res
    })
  }, Promise.resolve())
}
// 方法2
function mergePromise(arr) {
  let data = [];
  async function run() {
    for(let pFn of arr) {
      let val = await pFn();
      data.push(val);
    }
    return data;
  }
  return run();
}

mergePromise([ajax1, ajax2, ajax3]).then(data => {
  console.log("done");
  console.log(data); 
});

/**
 * 分别输出
 * 1
 * 2
 * 3
 * done
 * [1, 2, 3]
 * /
```

------------------------------------------
Q5 封装一个异步加载图片的方法

A: </br>
```ts
let urls = [
  "https://hexo-blog-1256114407.cos.ap-shenzhen-fsi.myqcloud.com/AboutMe-painting1.png",
  "https://hexo-blog-1256114407.cos.ap-shenzhen-fsi.myqcloud.com/AboutMe-painting2.png",
  "https://hexo-blog-1256114407.cos.ap-shenzhen-fsi.myqcloud.com/AboutMe-painting3.png",
  "https://hexo-blog-1256114407.cos.ap-shenzhen-fsi.myqcloud.com/AboutMe-painting4.png",
  "https://hexo-blog-1256114407.cos.ap-shenzhen-fsi.myqcloud.com/AboutMe-painting5.png",
  "https://hexo-blog-1256114407.cos.ap-shenzhen-fsi.myqcloud.com/bpmn6.png",
  "https://hexo-blog-1256114407.cos.ap-shenzhen-fsi.myqcloud.com/bpmn7.png",
  "https://hexo-blog-1256114407.cos.ap-shenzhen-fsi.myqcloud.com/bpmn8.png",
];

function loadImg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.width = 100
    img.height = 100
    img.src = url;
    img.onload = function() {
      console.log("一张图片加载完成");
      resolve(img);
    };
    img.onerror = function() {
    	reject(new Error('Could not load image at' + url));
    };
  });
}

// 函数实现
function paralLoad(urls, handler, limit = 3) {
  let len = urls.length;
  // 当前已发起的请求次数
  let curLoadCount = 0;
  let res = new Array(len).fill(null);
  let __resolve;
  return new Promise((resolve) => {
    __resolve = resolve;
    // 当加载次数<limit时，同时发起多次请求
    while (curLoadCount < limit) {
      beginWork();
    }
  });

  // 发起加载请求
  function beginWork() {
    // 本次发起请求时 对应的请求资源下标，每轮请求时都会递增
    let curLoadIndex = curLoadCount++;
    // 递归中止条件: 当前已发起的请求次数 > 总请求个数 && 结果中不存在null
    if (curLoadCount > len) {
      !res.includes(null) && __resolve(res);
      return;
    }
    const url = urls[curLoadIndex];
    handler(url).then(val => {
      res[curLoadIndex] = val;
      beginWork()
    }).catch((err) => {
      res[curLoadIndex] = err;
      beginWork()
    });
  }
}

paralLoad(urls, loadImg, 3).then((imgs) => {
  console.log("imgs", imgs);
});
```

----------------------------------------------
Q6 Promise的 then第二个参数 和 catch的区别是什么

A:
S1 p1.catch(onRej2)可以捕获p1.then(onFul1, onRej1)中onFul1的报错，而onRej1不可以

```ts
const p1 = Promise.resolve(2)
p1.then(val => {
  console.log('我是onFul1')
  throw new Error('onFul1报错了')
}, err1 => {
  // onRej1无法捕获onFul1发生的错误
  console.log(err1)
}).catch(err2 => {
  // catch的 onRej2可以捕获onFul1的报错
  console.log('err2', err2)
})

/**
 * 结果是
 * 我是onFul1
 * err2 Error: onFul1报错了
 */
```


----------------------------------------------
Q7 promise能取消吗

A: promise无法取消，但是可以通过一些方法 "中止" Promise链的后续执行 ==> pending/ race

```ts
// 方法1 pending
somePromise
  .then(() => {})
  .then(() => {
  })
  //中断Promise链，让下面的 then/catch/finally都不执行
  .then(() => {
    return new Promise((resolve, reject) => {})
  })
  .then(() => console.log('then'))
  .catch(() => console.log('catch'))
  .finally(() => console.log('finally'))

// 方法2 通过Promise.race
function abortPrmose(p1) {
  let abort
  let p2 = new Promise((resolve, reject) => (abort = reject))
  let resP = Promise.race([p1, p2])
  resP.abort = abort
  return resP
}
```


-------------------------------------------
Q8 为什么会出现Promise/ Promise解决了什么问题

A: 为了更好地在JS中支持 "异步编程"

S1 在Promise出现前，JS都是通过回调函数，来实现异步代码 的后续处理逻辑 </br>
S2 回调函数存在以下问题：</br>
  - 1 多个回调函数之间进行嵌套后，形成所谓的 "回调地狱";
  - 2 回调函数 没有统一地规范地 注册成功和失败回调的机制 (成功和失败回调参数的位置 没有统一规范)

S3 Promise正是为了解决回调函数存在的问题才出现的，它更好地支持了 "异步编程" </br>

-------------------------------------------
Q9 Promise的缺点是什么 + 如何解决

A: Promise的缺点有以下几点: 

S1 通过then的链式调⽤，来传递中间值的机制同样非常麻烦，在极端情况下也会形成 "then嵌套"; </br>
S2 无法通过try..catch捕获内部错误，只能通过promise.catch来处理内部报错; </br>
S3 then的异步执行，导致调试不便

解决方法是通过引入 async/await机制，具体见文章 [await详解](https://github.com/gmYuan/my_learn/blob/main/JS/02_await/02_awiat.md)


-------------------------------------------
Q10 如何让Promise.all在抛出异常后依然有效

A: </br>
方法1: 使用 Promise.allSettled 替代 Promise.all

方法2: map + catch处理错误 ==> 确保promises的每个成员不会有rejected状态

```ts
const p1 = new Promise((resolve, reject) => {
  resolve('p1');
});
var p2 = new Promise((resolve, reject) => {
	reject('p2');
});
const p3 = new Promise((resolve, reject) => {
	resolve('p3');
});
Promise.all([p1,p2,p3].map(p => p.catch(e => `${e}发生错误`)))
.then(val => {
  console.log(val)
}).catch(e => {
  console.log(e)
})
```

-------------------------------------------
Q11 写出下面代码执行的的结果 

```ts
console.log(1);
setTimeout(() => {
  console.log(2);
  process.nextTick(() => {
    console.log(3);
  });
  new Promise((resolve) => {
    console.log(4);
    resolve();
  }).then(() => {
    console.log(5);
  });
});

new Promise((resolve) => {
  console.log(7);
  resolve();
}).then(() => {
  console.log(8);
});
process.nextTick(() => {
  console.log(6);
});
setTimeout(() => {
  console.log(9);
  process.nextTick(() => {
    console.log(10);
  });
  new Promise((resolve) => {
    console.log(11);
    resolve();
  }).then(() => {
    console.log(12);
  });
});

/**
 * 输出结果是
 * 1,7,6,8,2,4,3,5,9,11,10,12
 * 
 * 需要注意的是: 在Node中
 * 先执行所有Next Tick Queue中的所有任务，再执行Other Microtask Queue中的所有任务
 * 具体分析可参考文章 https://github.com/lgwebdream/FE-Interview/issues/37
 */
```

-------------------------------------------
Q12 说下下面两段代码执行情况

```ts
// 代码片段一：是否存在堆栈溢出错误?
function foo() {
  setTimeout(foo, 0);
}
foo();

// 代码片段二:如果在控制台中运行以下函数，页面的UI 是否仍然响应
function foo() {
  return Promise.resolve().then(foo);
}

// 1 不会: 执行foo ==> 进入宏任务队列 ==> 取出执行，堆栈清空了 ==> 再次入队 ==> 取出清空
// 2 会: 微任务队列会不断积累，在主逻辑执行完成后才一次清空
// 只有当微任务队列为空时，事件循环才会重新渲染页面
```


## 参考文档

[01 手写Promise](https://juejin.cn/post/7043758954496655397)

[02 V8 Promise源码全面解读](https://juejin.cn/post/7055202073511460895)

[03 要就来45道Promise面试题一次爽到底](https://juejin.cn/post/6844904077537574919)

[04 then or catch](https://www.kancloud.cn/kancloud/promises-book/44255)

[05 如何中断Promise](https://juejin.cn/post/6847902216028848141)

[06 请用JS实现Ajax并发请求控制](https://juejin.cn/post/6916317088521027598)