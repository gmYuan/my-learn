/* @flow */


/**
 * 查询元素
 * 如果参数是字符串，那么将该字符串作为css选择符查询元素，
 * 如果查找到该元素则返回该元素，否则在非生产环境下会打印警告信息并返回一个新创建的 div
 * 如果参数不是一个字符串，则原封不动地返回参数
 */ 

export function query (el: string | Element): Element {
  if (typeof el === 'string') {
    const selected = document.querySelector(el)
    if (!selected) {
      process.env.NODE_ENV !== 'production' && warn(
        'Cannot find element: ' + el
      )
      return document.createElement('div')
    }
    return selected
  } else {
    return el
  }
}
