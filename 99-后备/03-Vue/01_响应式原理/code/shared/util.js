//对应 src/shared/util.js

// 判断给定变量是否是纯对象
const _toString = Object.prototype.toString
export function isPlainObject (obj: any): boolean {
  return _toString.call(obj) === '[object Object]'
}

// 可以用来检测一个对象是否含有特定的自身属性；
// 和 in 运算符不同，该方法会忽略掉那些从原型链上继承到的属性
const hasOwnProperty = Object.prototype.hasOwnProperty
export function hasOwn (obj: Object | Array<*>, key: string): boolean {
  return hasOwnProperty.call(obj, key)
}

// 检测obj是否是对象类型
export function isObject (obj: mixed): boolean %checks {
  return obj !== null && typeof obj === 'object'
}

// 判断给定变量是否是未定义
export function isUndef (v: any): boolean %checks {
  return v === undefined || v === null
}

// 判断给定变量是否是原始类型值
export function isPrimitive (value: any): boolean %checks {
  return (
    typeof value === 'string' ||
    typeof value === 'number' ||
    // $flow-disable-line
    typeof value === 'symbol' ||
    typeof value === 'boolean'
  )
}

// 判断给定变量的值是否是有效的数组索引
export function isValidArrayIndex (val: any): boolean {
  const n = parseFloat(String(val))
  // 大于等于 0 的整数 + 该整数是有限的
  return n >= 0 && Math.floor(n) === n && isFinite(val)
}


// 为一个纯函数 创建一个缓存版本的函数
// 具体分析，见 http://caibaojian.com/vue-design/appendix/shared-util.html#cached
export function cached<F: Function> (fn: F): F {
  const cache = Object.create(null)
  return (function cachedFn (str: string) {
    const hit = cache[str]
    return hit || (cache[str] = fn(str))
  }: any)
}


export function remove (arr: Array<any>, item: any): Array<any> | void {
  if (arr.length) {
    const index = arr.indexOf(item)
    if (index > -1) {
      return arr.splice(index, 1)
    }
  }
}