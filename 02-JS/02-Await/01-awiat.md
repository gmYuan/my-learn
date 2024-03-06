
## 1 Promise存在的问题

1. 在某些特定场景下，Promise依然会出现 “回调”多层嵌套的问题 ==> “then链嵌套”
  - 请求3的参数依赖于请求2的结果; 请求2的参数依赖请求1的结果，用伪代码表示为

```ts
function request(url) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (url.isRight()) {
        resolve('请求结果')
      } else {
        reject('请求错误')
      }
    }, 1000);
  })
}
// 产生多层的then调用，依然有 回调嵌套的味道
request(1).then(res1 => {
  return request(`请求2依赖请求1的结果：${res1}`)
}).then(res2 => {
  return request(`请求3依赖请求2的结果：${res2}`)
}).then(res => {
  console.log(res)
})
```

2. Promsie发生错误时，无法通过try...catch捕获错误，只能通过 p1.then(_,onRejct)/ p1.catch(cb)来处理 ==> 错误捕获

3. 正因为 通过Promise来书写异步代码的方式，还不不够“同步”，因此才引入了 async/await ==> 不够 "同步"

在介绍async/await之前，需要先了解 Iterator(迭代器) 和 generator(生成器) 相关内容

## 2 迭代器(Iterator) 和 可迭代对象(Iterable)

1. 迭代器(Iterator)
  - 具有next()方法的 JS对象 + next()返回一个 含有value和done属性的 对象
  - 有可选的 return()方法 / throw方法 ==>  用于中断 迭代器
  - 作用: 为不同的数据结构，提供统一的 数据访问接口

```ts
interface Iterator {
  next(value?: any) : IteResult,
  return?: () => any
}
interface IteResult {
  value: any,
  done: boolean,
}

// Iterator的模拟实现: 闭包 + next => ({done, value})
function mockIterator(list) {
  let i = 0;
  return {
    next() {
      const done = i >= list.length;
      const value = !done ? list[i++] : undefined;
      return { done, value };
    },
  };
}
//使用
let it = mockIterator([1, 2, 3]);
console.log(it.next());
console.log(it.next());
console.log(it.next());
console.log(it.next());
/**
输出结果是
{ done: false, value: 1 }
{ done: false, value: 2 }
{ done: false, value: 3 }
{ done: true, value: undefined }
*/
```

2.可迭代对象(Iterable)
  - 只要一个对象A实现了 [symbol.itetaor]方法 + 该方法执行后的返回值是 Iterator, 那么A就是一个 可迭代对象
  - 原生可迭代对象: Array/ 类数组类型(Set/Map/NodeLsit/Arguments)/ String;
  Object类型没有内置是因为 Object不是有序的，所以无法按序返回值

  - 可迭代对象的 特点: 可以通过`for...of语法` 访问它的 内部数据
  - for...of 内部会获取到it对象，并循环调用 it.next()，直到迭代器执行完毕
  - for...of 可以中途中止循环，其原理是内部调用了 it.return()
  - 类似for...of 一样会默认读取it.next()的语法还有: 解构赋值/ 扩展运算符/ for...of/ Array.from() /promise.all(iterable)/ yield* 等

```ts
interface Iterable {
  [Symbol.iterator]() : Iterator,
}
interface Iterator {
  next(value?: any) : IteResult,
  return?: () => Object
}
interface IteResult {
  value: any,
  done: boolean,
}

// 示例 实现1个可迭代对象的2种方法
// 方法1 迭代器
const iterableObj = {
  list: [1, 2, 3, 4],
  [Symbol.iterator]() {
    let i = 0, self = this;
    return {
      next() {
        const done = i >= self.list.length;
        const value = done ? undefined : self.list[i++];
        return { done, value};
      },
      return() {
        console.log("提前退出");
        //必须返回一个对象
        return { done: true };
      },
    };
  },
};
// 方法2 生成器
/* 可以这样写的原因/流程是:
S1 let item of iterableObj ==> it1 = [Symbol.iterator]() + 循环调用it1.next()
S2 it1.next() ==> for (let item of self.list) ==> 依次循环返回self.list的[Symbol.iterator]().next()的返回值 {value: 1/2/3/4, done: F/F/F/T} ==> 依次返回 yiled 1/ yiled 2/ yiled 3/ yiled 4

S3.1 it1.next()遇到 yiled后，就会中止执行 + 返回值
S3.2 又因为是 循环调用it1.next()，所以会自动继续下一轮it1.next()，直到遇到break,调用 it1.return()中止
*/
const iterableObj = {
  list: [1, 2, 3, 4],
  *[Symbol.iterator]() {
    let self = this
    yield* self.list
    // yield* self.list 一句就相当于
    // for (let item of self.list) {
    //     yield item
    // }  
  },
};
// 使用
for (let item of iterableObj) {
  console.log("item", item);
  if (item === 3) {
    break;
  }
}
/**
输出结果是
item 1
item 2
item 3
提前退出
*/
```

3. 模拟实现 for...of的执行流程
```ts
function forOf(obj, cb) {
  let it, res
  // 参数检测
  if (typeof obj[Symbol.iterator] !== 'function') {
    throw new TypeError(obj + 'is not iterable')
  }
  if (typeof cb !== 'function') {
    throw new TypeError('cb must be callable')
  }
  // 获取迭代器
  it = obj[Symbol.iterator]()
  res = it.next()
  // 自动执行迭代器
  // PS: 由此逻辑可以看出，generator内部的return语句的返回值，不包括在for...of的输出结果中
  while (!res.done) {
    cb(res.value)
    res = it.next()
  }
}
```

## 3 generator + generator的自动执行

1. 生成器(generator)
  - 1.1 ge是一个“状态机”，可以通过yield关键字 定义多个内部状态 ==> 状态机
  - 1.2 ge的返回值是1个特殊的迭代器，记做 it;

  - 1.3 调用it.next()就可以让 ge获取到执行权，直到遇到yield val语句 就会暂停执行ge，此时val作为 it.next()的返回值 {done: T/F, value: val} 返回到主线程
  - 1.4 it.next(val2)可以把 val2传入给 ge协程内部，作为`上一次 yield语句`的返回值。所以第一次调用 it.next(val2)传入的val2是无效的;

  - 1.5 ge在遇到到 yield后，就会暂停执行，直到外部再次调用it.next()后才会恢复执行 ==> ge可以暂停和恢复执行
  - 1.6 it.throw(xx)的报错 可以被内外 try...catch语句捕获到

```ts
function* gen() {
  // 1.1
  const num1 = yield 1
  console.log('num1', num1)
  const num2 = yield 2
  console.log('num2', num2)
  const num3 = yield 3
  console.log('num3', num3)
  return 3
  yield '该语句不会执行'
}
// 1.2
const it = gen()
// 1.3 + 1.4
console.log(it.next('第1次next的传参是无效的'))     
console.log(it.next(111))  
console.log(it.next(222))
console.log(it.next(333))
console.log(it.next(444))

/**
 * 输出是
 * 第1轮
 * { value: 1, done: false }
 * ------ 第2轮 ------
 * num1 111
 * { value: 2, done: false }
 * ------ 第3轮 ------
 * num2 222
 * { value: 3, done: false }
 * ------ 第4轮 ------
 * num3 333
 * { value: 3, done: true }
 * ------ 第5轮 ------
 * { value: undefined, done: true }
 */
```

2. generator函数暂停与恢复执行的 原理
  - 2.1 Generator函数是 协程 在ES6的实现，它最大的特点是 可以交出函数的执行权
  - 2.2 它本质上是 `主线程与子协程的 交替执行` ==> 上下文的保存context + switch_case语句块
  - 2.2 可以把协程看成是 跑在线程上的任务，1个线程上可以有N个协程，但是在同一时间 只能执行其中的1个协程
  - 2.3 它的运行流程大致为: 协程A执行 ==> 协程A执行到某个阶段暂停，执行权转移到协程B ==> 协程B执行完成或暂停，将执行权交还A ==> 协程A恢复执行

```ts
// 示例1: 协程A和B之间的交替执行
function* gen1() {
  yield 1;
  /*
  yield* ==> 依次迭代这个可迭代对象
  效果相当于
    for (let item of gen2) {
      yield item
    }
  */
  yield* gen2();
  yield 4;
}
function* gen2() {
  yield 2;
  yield 3;
}
const it = gen1()
console.log(it.next())     
console.log(it.next())  
console.log(it.next())
console.log(it.next())
console.log(it.next())
/**
输出结果是
{ value: 1, done: false }
{ value: 2, done: false }
{ value: 3, done: false }
{ value: 4, done: false }
{ value: undefined, done: true }
*/
```

3. generator函数的自动执行==> 执行器
  - 3.1 执行器用来自动执行 genetator内的状态
  - 3.2 通过执行器，可以用同步的方式写出异步代码

```ts
// 基于Promise实现一个简单的执行器
function run(gen) {
  const it = gen()
  next()
  function next(data) {
    let res = it.next(data)
    if (res.done) return res.value
    // res.value是一个Promise对象
    res.value.then(val => {
      next(val)
    })
  }
}
// 使用run: 用类似同步的方式 写异步代码
function *request() {
    let res1 = yield fetch('xxx')
    console.log('res1', res1)
    let res2 = yield fetch('yyy')
    console.log('res2', res2)
}
run(request)
```

4. 实现 generator函数

- 4.1 generator函数由3部分组成: 
  - _context对象: 用于储存 函数执行上下文 ==> {pre: 0, next: 0, sent: undefined, done: F/T }
  - gen$(_context): 根据yield语句生成多个switch/case语句 ==> 更新执行上下文值 + 返回yield val的 val
  - wrap()方法: 返回一个it对象 ==> 定义next()方法: 用于调用 gen$(_context)方法

- 4.2 generator的内部中执行流程:
  - S1 it1 = generator() ==> regeneratorRuntime.wrap(): 返回一个it对象
  - S2 it1.next() ==> gen$(_context): 进入switch语句, 根据context.pre值，执行对应的case块 + 更新执行上下文中的 sent/next + 返回yield val的 val
  - S3 继续重复执行 it1.next(val2) ==> 处理同上
  - S4 当switch匹配不到对应代码块，就会return 最终返回值value，这时g.next()返回 {value, done: true}  

```ts
// 模拟实现 generator- 简化版
// 生成器函数根据yield语句将代码分割为switch-case块 ==>
// 后续通过切换_context.prev和_context.next来分别执行 各个case

const regeneratorRuntime = {
  // 存在mark方法，可忽略
  mark(fn) {
    return fn;
  },
  wrap(fn) {
    const _context = {
      next: 0,  // 表示下一次执行生成器函数状态机 switch中的下标
      sent: "", // 表示next调用时候传入的值: 作为上一次yield返回值
      done: false, // 是否完成
      // 完成函数
      stop() {
        this.done = true;
      },
    };
    return {
      next(param) {
        // 1. 修改上一次yield返回值为context.sent
        _context.sent = param;
        // 2.执行函数 获得本次返回值
        const value = fn(_context);
        // 3. 返回
        return {
          done: _context.done,
          value,
        };
      },
    };
  },
  // fn是类似于下面函数的 状态机
  gen$(_context) {
    var a, b, c
    while (1) {
      switch ((_context.prev = _context.next)) {
        case 0:
          _context.next = 2;
          return 1;
        case 2:
          a = _context.sent;
          _context.next = 6;
          return 2;
        case 6:
          b = _context.sent;
          _context.next = 10;
          return 3;
        case 10:
          c = _context.sent;

        case 12:
        case "end":
          return _context.stop();
      }
    }
  }
};
```

## 4 实现async/await

1. async/await
- 1.1 async函数 把多个异步操作 包装成的一个Promise对象，而await语句 就是内部then方法的语法糖
- 1.2 本质上, 它是generator自动执行 + Promise的 语法糖

2. async/await 与 Generator函数的不同点
- 2.1 async/await自带执行器，不需要手动调用 it.next()方法执行下一步 ==> 内置执行器
- 2.2 async函数的返回值是 Promise对象，Generator函数返回的是 迭代器对象 ==> 返回值不同
- 2.3 await后可以支持多种数据类型，而co模块约定 yield后只能是 Thunk函数/Promise对象 ==> 支持更多类型
- 2.4 async/await 比 */yield的语义更清晰明确 ==> 更明确的语义性

3. async的返回值是一个Promise对象p1, p1的状态由以下2种情况决定
    - return data ==> p1的状态是 由Promise.resolve(data)的结果 决定;
    - 如果执行过程中出现了 throw Error且未被捕获 ==> p1的状态是 rejected
    - 多个await语句的 返回值分别是 p2/p3/p4, 只要有任意一个px实例是rejected状态 + 未被catch捕获, 就会触发it.throw()报错 ==> 不再执行 await之后的语句 + 返回rejected状态的 p1结果


4. 模拟实现 async/await
```ts
// async的模拟实现
function spawn(genFn) {
  return function () {
    const it = genFn.apply(this, arguments);
    return new Promise((resolve, reject) => {
      // 执行入口函数
      step("next");
      // 入口函数
      function step(key, params) {
        let res;
        try {
          res = gen[key](params);
        } catch (error) {
          return reject(error);
        }
        const { value, done } = res;
        if (done) {
          return resolve(value);
        } else {
          return Promise.resolve(value).then(
            (val) => step("next", val),
            (err) => step("throw", err)
          );
        }
      }
    });
  };
}
```

## 5 async/await 常见问题

1. async函数中如果报错/返回了rejected状态的p1，那么之后只会执行以下情况的 语句:
  - P1.then(onFul, onReject)中的 onReject
  - p1.catch(onReject)中的 onReject
  - try...catch中的 catch内语句
```ts
// 例1
async function async1 () {
  await async2();
  console.log('async1');
  return 'async1 success'
}
async function async2 () {
  return new Promise((resolve, reject) => {
    console.log('async2')
    reject('error')
  })
}
async1().then(res => console.log(res))
/**
 * 结果是
 * async2
 * Uncaught (in promise) error
 *  */

// 例2
async function async1 () {
  await Promise.reject('error了').catch(e => console.log(e))
  // 效果相当于
  // try {
  //   await Promise.reject('error!!!')
  // } catch(e) {
  //   console.log(e)
  // }
  console.log('async1');
  return Promise.resolve('async1 success')
}
async1().then(res => console.log(res))
console.log('script start')
/**
 * 结果是
 * script start
 * error了
 * async1
 * async1 success
 *  */
```

2. await后面是 一个Promise对象p2
  - 当 await后面是一个函数时，该函数会立刻执行，并会把其返回值转化为 Promise对象P2
  - 当p2一直是Pending状态时，在await之后的内容是不会执行的 ==> yield 和 prmose特性
  - await下面的语句，相当于被注册到 p2.then(onFul)中

```ts
// 例1
async function async1 () {
  console.log('async1 start');
  await new Promise(resolve => {
    console.log('promise1')
  })
  console.log('async1 success');
  return 'async1 end'
}
console.log('srcipt start')
async1().then(res => console.log(res))
console.log('srcipt end')
/** 
输出是
'script start'
'async1 start'
'promise1'
'script end'
*/

// 例2
async function async1() {
  console.log("async1 start")
  await async2()
  console.log("async1 end")
}
async function async2() {
  console.log("async2")
}
async1()
console.log('start')
/**
 * 结果是
 * async1 start
 * async2
 * start
 * async1 end
 */
```

3. 写出以下输出结果
```ts
console.log("script start");
async function async1() {
  await async2();
  console.log("async1 end");
}
async function async2() {
  console.log("async2 end");
  return Promise.resolve().then(() => {
    console.log("async2 end1");
  });
}
async1();

setTimeout(function () {
  console.log("setTimeout");
}, 0);

new Promise((resolve) => {
  console.log("Promise");
  resolve();
}).then(function () {
  console.log("promise1");
}).then(function () {
  console.log("promise2");
});

console.log("script end");

/**
 * 输出结果为
 * script start
 * async2 end
 * Promise
 * script end
 * 
 * async2 end1
 * promise1
 * promise2
 * async1 end
 * setTimeout
 * 
 * 具体原因，详见问题回答 https://www.zhihu.com/question/453677175
 */
```

4. async/await的错误 怎么捕获

A: </br>
S1 如果await后面的异步操作出错，那么等同于async函数返回的 Promise对象被reject，所以可以通过以下2种方法，捕获async/await的错误
  - 方法1: asyncFn().catch(cb)
  - 方法2: try...catch捕获错误

```ts
async function test() {
  await Promise.reject('错误了')
};

// 方法1
test().catch(err=>{
  console.log('err是',err);
})

// 方法2
async function test() {
  try {
    await Promise.reject('错误了')
  } catch(e) {
    console.log('err', e)
  }
  return await('成功了')
}
```

S2 如果有多个await异步请求，在1个async函数内，可以用以下方法处理每个异步请求的报错
```ts
function request(url) {
  return new Promise((resolve,reject) => {
    setTimeout(() => {
      resolve('res ok')
    }, 1000)
  })
}

async function doRequest() {
  const awaitWrap = (promise) => {
    return promise.then(data => [null, data]).catch(err => [err, null])
  }
  // 这样就可以区分: 是失败情况的err 还是 成功情况的data
  const [err1, data1] = await awaitWrap(request(1))
  const [err2, data2] = await awaitWrap(request(2))
  console.log('err1', err1)
  console.log('data1', data1)
}
// 入口函数
doRequest()
```


## 参考文档

[01 扒一扒，这一次，彻底理解 ES6 Iterator](https://juejin.cn/post/6844904000131694605)

[02 Async是如何被JavaScript实现的](https://juejin.cn/post/7069317318332907550)  </br>
[03 手写generator核心原理](https://github.com/Sunny-lucking/blog/issues/6)      </br>
[04 手写async/await的最简实现](https://juejin.cn/post/6844904102053281806)      </br>

[05 async/await更优雅的错误处理](https://juejin.cn/post/7011299888465969166)

[06 如何给所有的async函数添加try/catch](https://juejin.cn/post/7011299888465969166): 主要内容是关于babel的使用，了解即可
