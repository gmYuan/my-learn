// 缺点1
// const obj = {
//   undef: undefined,
//   fun: () => { console.log("我是函数") },
// };
// const objCopy = JSON.parse(JSON.stringify(obj));

// console.log("obj", obj);  // obj   { undef: undefined, fun: [Function: fun] }
// console.log("objCopy", objCopy); // objCopy  {}

// --------------------------------------------------------
// 缺点2
// const obj = {
//   re: /hello/ig
// }
// const objCopy = JSON.parse(JSON.stringify(obj));
// console.log("obj", obj);              // obj { re: /hello/gi }
// console.log("objCopy", objCopy);  // objCopy { re: {} }
// console.log("objCopy-typeof", typeof objCopy.re); // 'object'

// --------------------------------------------------------
// 缺点3
// const obj = {
//   nan: NaN,
//   infinityMax: Number.POSITIVE_INFINITY,
//   infinityMin: Number.NEGATIVE_INFINITY,
// }
// const objCopy = JSON.parse(JSON.stringify(obj));
// // obj { nan: NaN, infinityMax: Infinity, infinityMin: -Infinity }
// console.log("obj", obj);
// // objCopy { nan: null, infinityMax: null, infinityMin: null }
// console.log("objCopy", objCopy);

// --------------------------------------------------------
// 缺点4
// const obj = {
//   date: new Date()
// }
// const objCopy = JSON.parse(JSON.stringify(obj));

// console.log('obj', typeof obj.date === 'object')          // true
// console.log('objCopy', typeof objCopy.date === 'string')  // true

// --------------------------------------------------------
// 缺点5
// const obj = {
//   self: null
// }
// obj.self = obj;
// const objCopy = JSON.parse(JSON.stringify(obj));

// // TypeError: Converting circular structure to JSON
// console.log("objCopy", objCopy);

// --------------------------------------------------------
// 深拷贝实现版本1- 递归支持 基本数据类型+简单引用类型(不支持 Array/Func/Date/RegExp)
// function deepClone(target) {
//   // 递归中止条件: 类型值为基本数据类型
//   if (!target || typeof target !== "object") {
//     return target;
//   }
//   // 对于引用类型，递归进行深拷贝即可
//   const cloned = {};
//   for (let key in target) {
//     cloned[key] = deepClone(target[key]);
//   }
//   return cloned;
// }

// const obj1 = {
//   name: "hello",
//   child: {
//     name: "我是child",
//   },
// };
// const obj2 = deepClone(obj1);
// console.log('obj2', obj2)

// -----------------------------------------------------------
// 实现版本2- 支持基本数据类型+ 简单引用类型+ Array/RegExp/Date/Func

// function deepClone(target) {
//   // 递归中止条件: 类型值为基本数据类型
//   if (!target || typeof target !== "object") {
//     return target;
//   }
//   // 对于引用类型，递归进行深拷贝
//   // const cloned = {};
//   let cloned;
//   if (target instanceof Array) {
//     cloned = [];
//   } else if (target instanceof RegExp) {
//     // source属性能 获取到正则的模式，flags属性 能获取到 正则的参数
//     cloned = new RegExp(target.source, target.flags);
//   } else if (target instanceof Date) {
//     cloned = new Date(target);
//   } else if (target instanceof Function) {
//     cloned = function() {
//       // 在函数中去执行原来的函数，确保 返回值相同
//       return target.call(this, ...arguments)
//     }
//   } else {
//     cloned = {};
//   }

//   for (let key in target) {
//     cloned[key] = deepClone(target[key]);
//   }
//   return cloned;
// }

// const obj1 = {
//   name: "hello",
//   time: new Date()
// };
// const obj2 = deepClone(obj1);
// console.log('obj2', obj2.time.getTime) // obj2 [Function: getTime]

// -------------------------------------------------------------
// 实现版本3- 优化实现
// - 优化点1: 不克隆target原型上的 属性
// - 优化点2: 解决 循环对象导致的 递归爆栈问题

function deepClone(target, cache = new Map()) {
  // 递归中止条件1: 循环遇到 已克隆过的缓存对象，直接返回缓存的克隆值即可
  if (cache.get(target)) {
    return cache.get(target);
  }
  // 递归中止条件2: 类型值为基本数据类型
  if (!target || typeof target !== "object") {
    return target;
  }

  // 对于引用类型，递归进行深拷贝
  // 根据不同引用类型，初始化对应类型值
  let cloned;
  if (target instanceof Array) {
    cloned = [];
  } else if (target instanceof RegExp) {
    // source属性能 获取到正则的模式，flags属性 能获取到 正则的参数
    cloned = new RegExp(target.source, target.flags);
  } else if (target instanceof Date) {
    cloned = new Date(target);
  } else if (target instanceof Function) {
    cloned = function () {
      // 在函数中去执行原来的函数，确保 返回值相同
      return target.call(this, ...arguments);
    };
  } else {
    cloned = {};
  }
  // 把 属性值-拷贝后的属性值 存入缓存map里
  cache.set(target, cloned);

  // 拷贝属性值
  // for...in 会遍历包括原型上的 所有可迭代属性
  for (let key in target) {
    // 优化点1: 过滤掉原型身上的属性, 即只遍历本身的属性
    if (target.hasOwnProperty(key)) {
      cloned[key] = deepClone(target[key], cache);
    }
  }
  return cloned;
}

const obj1 = {
  name: "hello",
  friends: ["a", "b"],
  self: null,
};
obj1.self = obj1;
const obj2 = deepClone(obj1);
console.log("obj2", obj2); // { name: 'hello', friends: [ 'a', 'b' ], self: [Circular *1] }
