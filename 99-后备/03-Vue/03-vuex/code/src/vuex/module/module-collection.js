import { forEachValue } from "../util";
import Module from "./module";
class ModuleCollection {
  constructor(options) {
    this.register([], options);
  }

  register(path, module) {
    let newModule = new Module(module);

    if (path.length == 0) {
      // 根模块
      this.root = newModule; // this.root就是树根
    } else {
      let parentPathArr = path.slice(0, -1)
      // debugger2
      let parentModule = parentPathArr.reduce((memo, curModuleName) => {
        // debugger3
        return memo.getChild(curModuleName);
      }, this.root);
      // path数组的最后一个成员，必然是当前子模块的 模块名称
      parentModule.addChild(path[path.length - 1], newModule);
    }
    if (module.modules) {
      // 循环模块 [a] [b]
      forEachValue(module.modules, (childModule, childModuleName) => {
        // [a,c]
        this.register(path.concat(childModuleName), childModule);
      });
    }
  }

  getNamespaced(path) {
    let curModule = this.root; // 从根模块找起来
    return path.reduce((str, key) => {
      // [a,c]
      curModule = curModule.getChild(key); // 不停的去找当前的模块
      return str + (curModule.namespaced ? key + "/" : "");
    }, ""); // 参数就是一个字符串
  }

}

export default ModuleCollection;

/**
 * this.root = {
 *    _raw: '根模块',
 *    _children:{
 *        a:{
 *          _raw:"a模块",
 *          _children:{
 *              c:{
 *                  .....
 *              }
 *          },
 *          state:'a的状态'
 *        },
 *        b:{
 *          _raw:"b模块",
 *          _children:{},
 *          state:'b的状态'
 *        }
 *    },
 *    state:'根模块自己的状态'
 * }
 *
 */
