function isObject(obj) {
  return (obj && typeof obj === 'object' ) || typeof obj === 'function';
}

function deepClone(target) {
  // 递归中止条件：基本类型
  if (!isObject(target)) {
    return target
  }
  // 递归实现深拷贝
  let cloned = {};
  for (const key in target) {
    cloned[key] = deepClone(target[key])
  }
  return cloned;
};





