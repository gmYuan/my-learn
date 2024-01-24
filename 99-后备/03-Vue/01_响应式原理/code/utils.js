// 对应 src/core/utils.js

// key是否是保留属性
export function isReserved(str: string): boolean {
  const c = (str + "").charCodeAt(0);
  return c === 0x24 || c === 0x5f;
}

// 创建一个默认是不可枚举的对象属性
export function def(obj: Object, key: string, val: any, enumerable?: boolean) {
  Object.defineProperty(obj, key, {
    value: val,
    enumerable: !!enumerable,
    writable: true,
    configurable: true,
  });
}

// 检查当前环境是否可以使用对象的 __proto__ 属性
export const hasProto = '__proto__' in {}


// 定义parsePath解析属性
const bailRE = /[^\w.$]/
export function parsePath (path: string): any {
  // 如果匹配到了非 字母、数字、下划线、.、$类型时，就会命中正则
  // 此时说明是使用了不合法的属性读取方法，如obj~a/ obj+a等
  // 此时，就会直接返回undefined，从而导致watcher.getter是非函数类型
  if (bailRE.test(path)) {
    return
  }
  // 返回的是一个函数，而非函数调用
  const segments = path.split('.')
  return function (obj) {
    for (let i = 0; i < segments.length; i++) {
      if (!obj) return
      obj = obj[segments[i]]
    }
    return obj
  }
}