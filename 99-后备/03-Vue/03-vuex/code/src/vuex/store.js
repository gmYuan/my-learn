import applyMixin from "./mixin";
import { forEachValue } from "./util";
import ModuleCollection from "./module/module-collection";
export let Vue;

// Vue.use 方法会调用 插件的install方法 + 参数就是Vue的构造函数
// plugin.install.apply(plugin, [Vue实例, args])

export const install = (_Vue) => {
  // debugger0
  // _Vue 是Vue的构造函数
  Vue = _Vue;
  // 需要将根组件中注入的store 分派给每一个组件(子组件）
  applyMixin(Vue);
};

export class Store {
  // options 就是new Vuex.Store({state,mutation,actions})
  constructor(options) {
    // 数据变化要更新视图 （vue的核心逻辑依赖收集）
    const state = options.state;
    this._mutations = {};
    this._actions = {};
    this._wrappedGetters = {};
    this._subscribes = [];

    // debugger1
    // 1.模块收集: 数据格式化，创建模块间的树形关系
    this._modules = new ModuleCollection(options);

    // 2.安装模块 根模块的状态中 要将子模块通过模块名 定义在根模块上
    // debugger4
    installModule(this, state, [], this._modules.root);

    // 3. 把 state和getters 都定义在 store._vm上
    // debugger
    resetStoreVM(this, state);

    // 5. 依次执行内部插件
    options.plugins && options.plugins.forEach((plugin) => plugin(this));
  }

  // 4. 属性访问器 new Store().state: 即 Object.defineProperty({get()})
  get state() {
    return this._vm._data.$$state;
  }

  replaceState(state) {
    // 替换掉最新的状态
    this._vm._data.$$state = state;
  }

  subscribe(fn) {
    this._subscribes.push(fn);
  }

  // 箭头函数: 保证当前this 当前store实例
  commit = (type, payload) => {
    // debugger // debugger7
    // 调用commit其实 就是去找绑定的好的mutation
    this._mutations[type].forEach((mutation) => mutation.call(this, payload));
  };

  dispatch = (type, payload) => {
    debugger // debugger8
    this._actions[type].forEach((action) => action.call(this, payload));
  };
}


const installModule = (store, rootState, path, module) => {
  // 遍历当前模块上的 state、mutation、actions、getters 
  // 把所有子模块的state、mutation、actions、getters都 合并到父模块下
  // 并统一注册到_store上的对应属性下

  // debugger5
  // 给当前订阅的事件 增加一个命名空间==> 获取命名空间前缀
  let namespace = store._modules.getNamespaced(path);

  if (path.length > 0) {
    // 把子模块的state 注册合并到rootState上
    let parent = path.slice(0, -1).reduce((memo, current) => {
      return memo[current];
    }, rootState);
    // 如果这个对象本身不是响应式的 那么Vue.set 就相当于obj[属性]= 值
    Vue.set(parent, path[path.length - 1], module.state);
  }

  // 初始化/合并 子模块的mutations，统一挂载在store._mutations属性上
  module.forEachMutation((mutationFn, mutationName) => {
    store._mutations[namespace + mutationName] =
      store._mutations[namespace + mutationName] || [];
    store._mutations[namespace + mutationName].push((payload) => {
      mutationFn.call(store, getState(store, path), payload);
      store._subscribes.forEach((fn) => {
        fn(mutationFn, store.state); // 用最新的状态
      });
    });
  });

  module.forEachAction((actionFn, actionName) => {
    store._actions[namespace + actionName] =
      store._actions[namespace + actionName] || [];
    store._actions[namespace + actionName].push((payload) => {
      actionFn.call(store, store, payload);
    });
  });

  module.forEachGetter((getterFn, getterName) => {
    // 模块中getter的名字重复了会覆盖
    store._wrappedGetters[namespace + getterName] = function() {
      return getterFn(getState(store, path));
    };
  });

  module.forEachChild((childModule, childModuleName) => {
    // 递归加载模块
    installModule(store, rootState, path.concat(childModuleName), childModule);
  });
};

function resetStoreVM(store, rootState) {
  const computed = {}; // 定义计算属性
  store.getters = {}; // 定义store中的getters

  forEachValue(store._wrappedGetters, (getterFnWrap, getterName) => {
    computed[getterName] = () => {
      return getterFnWrap();
    };
    // 通过代理store.getters[getterName]，从而可以实现按属性调用函数
    Object.defineProperty(store.getters, getterName, {
      get: () => {
        // debugger // debugger6
        return store._vm[getterName]
      }, 
    });
  });

  store._vm = new Vue({
    data: {
      $$state: rootState,
    },
    computed, // 计算属性有缓存效果
  });
}


/**
 *
 * @param {*} store  容器
 * @param {*} rootState 根模块
 * @param {*} path  所有路径
 * @param {*} module 格式化后的结果
 */

function getState(store, path) {
  // 获取最新的状态 可以保证视图更新
  return path.reduce((newState, current) => {
    return newState[current];
  }, store.state);
}
