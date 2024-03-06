function isObject(obj) {
  return obj !== null && (typeof obj === "object" || typeof obj === "function");
}

function getType(target) {
  const typeStr = Object.prototype.toString.call(target);
  return typeStr.match(/\[object (.*)\]/)[1];
}

function deepClone(target, cache = new WeakMap()) {
  // S1.1 递归中止条件1: 类型值为基本数据类型
  if (!isObject(target)) {
    return target;
  }
  // S1.2 递归中止条件2: 特殊处理无法继续进行递归知道类型，如Date等
  const targetType = getType(target);
  const deepTypes = ["Object", "Array", "Map", "Set", "Arguments"];
  if (!deepTypes.includes(targetType)) {
    // 此处处理的是 基本类型的包装对象、日期、正则等特殊对象类型
    if (["Date", "Error", "Number", "Boolean", "String"].includes(targetType)) {
      return new target.constructor(target);
    } else if (targetType === "RegExp") {
      return new target.constructor(target.source, target.flags);
    } else if (targetType === "Symbol") {
      return Object(Symbol.prototype.valueOf.call(target));
    } else if (targetType === "Function") {
      return target;
    } else {
      return null;
    }
  }

  // S1.3 递归中止条件3: 循环遇到 已克隆的缓存对象，直接返回缓存的克隆值即可
  const cacheVal = cache.get(target);
  if (cacheVal) {
    return cacheVal;
  }

  // S2 支持各种数据类型
  let cloned = new target.constructor();
  // S2.2 特殊处理Set和Map类型
  if (targetType === "Set") {
    target.forEach((v) => {
      cloned.add(deepClone(v));
    });
    return cloned;
  }
  if (targetType === "Map") {
    target.forEach((v, k) => {
      cloned.set(deepClone(k), deepClone(v));
    });
    return cloned;
  }

  // S3 把 属性值-拷贝后的属性值 存入缓存map里
  cache.set(target, cloned);

  // S4 递归实现深拷贝
  for (const key in target) {
    // S4.2 性能优化：for...in 会遍历包括原型上的 所有可迭代属性
    // 这里可以 过滤掉对象原型身上的属性, 即只遍历对象本身的 属性
    if (target.hasOwnProperty(key)) {
      cloned[key] = deepClone(target[key], cache);
    }
  }

  // S5 返回结果
  return cloned;
}

const map = new Map([['key', 'value']]);
const set = new Set(['a', 'b']);

const target = {
  field1: 1,
  field2: undefined,
  field3: {
    child: "child",
  },
  field4: [1, 2, 3],
  empty: null,
  map,
  set,
  bool: new Boolean(true),
  num: new Number(1),
  str: new String(2),
  symbol: Object(Symbol(3)),
  date: new Date(),
  reg: /\d+/,
  error: new Error(),
  func2(a, b) {
    return a + b;
  },
};


let res = deepClone(target)
console.log('res', res)