function isObject(obj) {
  return (obj && typeof obj === "object") || typeof obj === "function";
}

function deepClone(target, cache = new WeakMap()) {
  // 递归中止条件1: 类型值为基本数据类型
  if (!isObject(target)) {
    return target;
  }
  // todo 解决循环引用，需要进行debug分析
  // 递归中止条件2: 循环遇到 已克隆的缓存对象，直接返回缓存的克隆值即可
  if (cache.get(target)) {
    return cache.get(target);
  }

  // 递归实现深拷贝
  // 支持数组类型
  let cloned = Array.isArray(target) ? [] : {};

  // 把 属性值-拷贝后的属性值 存入缓存map里
  cache.set(target, cloned);

  for (const key in target) {
    cloned[key] = deepClone(target[key], cache);
  }
  return cloned;
}

const temp = {
  field1: 1,
  field2: undefined,
  field3: {
    child: "child",
  },
  field4: [2, 4, 8],
};
temp.self = temp

// 深拷贝使用
const res = deepClone(temp);
console.log(res);
