## Vuex详解

## 一 基本使用

Q1 Vuex是什么，有什么作用

A: <br/>

1 Vuex是一个 专为Vue.js应用开发的 状态管理模式
  - 它集中 存储和管理了 所有组件的state;
  - 它制定了一系列的规则，以保证state的变化 是规范的、可被预测的

2 Vuex主要解决了以下问题:
  - 多个组件 依赖读取 同一state
  - 多个组件内的行为 都需要修改 一state

> 即 多组件间的 状态读取和修改 这一问题

3 Vuex的核心思想:
  - 把组件间 共享的state 单独抽取出来，以1个全局单例模式store 进行管理
  - 其核心思想是为了 `保持 视图和状态 间的独立性`

4 vuex的主要作用是: 状态管理 + 数据共享
  - 状态管理: 通过1个统一的 单例模式store + 一些列修改规则，保持 数据修改的可观测性
  - 数据共享: 多个视图间，统一通过 store来读取共享数据


------------------------------------
Q2 vuex和全局对象 有什么区别

A: <br/>

1 Vuex 中的state是响应式的, store内的state值发生变化，读取它的视图会自动更新显示

2 Vuex 中的state不能被直接修改，唯一的修改方法是 显式地调用 commit(mutation)
  - 因为这样可以 明确地追踪到每一个state的变化==> 保存状态快照，以实现时间漫游／回滚之类操作


--------------------------------------------------------
Q3 vuex 的核心概念有哪些/ Vuex有几种核心属性，分别有什么作用

A: <br/>

1 State: 定义 共享数据对象
  - 相当于 vue组件中的 data数据
  - Vuex使用单一状态树, 每个应用只包含一个 store实例
  - 通过 store.state.xx/this.$store.state.xx  获取定义的 数据对象xx
  - 可以通过 mapState(options: Array | Object) 来 快捷读取store.state

2 Getters:
  - 相当于 vue组件中的 computed计算属性
  - getter的返回值 是非函数时 会被缓存 + 只有依赖值发生了改变，才会重新计算
  - getter的返回值 是函数时 不会被缓存，每次调用都会重新执行
  - 通过 store.getters.xxx/ store.getters.xxx(参数) 来使用getters里的 xx属性
  - 可以通过 mapGetters(options: Array | Object) 来 快捷读取store.getters

3 Mutations:
  - 同步函数，可以同步修改state值，它类似于事件: { type: String,  handler: Fn }
  - 要修改store中的state值，唯一方法是 提交mutation==> commit(mutation名称)
  - Mutation 要遵守 Vue的响应规则：Vue.set() / 以新对象 替换老对象
  - 可以通过 mapMutations(options: Array | Object) 来 快捷读取store.commit('mutation-key值')

4 Actions:
  - 异步函数，可以执行异步操作: 它配合Mutation可以实现 state的异步更新
  - Action提交的是 mutation，而mutation是 直接修改状态 + Action 可以包含任意异步操作
  - 通过 store.dispatch('actionName')来触发 Action
  - 可以通过 mapActions(options: Array | Object) 来 快捷读取store.dispatch('action-key值')
  - 由于 Action的处理函数返回的值是 Promise对象，所以可以通过 dispatch('actionA').then()/ async&await 来实现 组合调用

5 Modules:
  - 把store容器 分割成模块，每个模块都有独立的 state/getter/mutation/action
  - 在模块内部的 action/getters, 根节点数据rootState 会作为第3个参数传入

  - 在 带命名空间的模块内的action/getters,参数是
    - getters_a (state, getters, rootState, rootGetters) 
    - Action_a ({ dispatch, commit, getters, rootGetters...... })

  - 对于带命名空间的绑定函数，可以通过 mapState/ mapActions('nested/module', {}) 或者 createNamespacedHelpers(nested/module) 快捷访问

  - 可以使用 store.registerModule() 动态注册模块

用官网一张图表示为：![Vuex核心流程图](https://v3.vuex.vuejs.org/vuex.png)
	

## 二 简易版源码实现

Q1 vuex源码的执行流程 是什么/ 说一下 Vuex的原理

A: <br/>

直接看下面执行流程的 伪代码表示

```js
// src/main.js
1 import store from './store/index'==> 进入 src/store/index.js文件并执行==>
  - 1.1 Vue.use(Vuex)==> initUse (Vue)==> plugin.install.apply(plugin, [Vue实例, args])==> Vuex.install(_Vue)
    - 缓存 全局Vue对象: Vue = _Vue
    - applyMixin(Vue): 定义 Vue.mixin({ beforeCreate: vuexInit })==>
      - vuexInit(): 按 根组件==> 父组件==> 子组件 渲染顺序，从上到下增加 vm.$store属性


  - 1.2 new Vuex.Store(options)==>

    - 2.1 this._modules = new ModuleCollection(options)==> 
      - z.1 this.register(path, module): 创建模块间的树形关系 ==> 
        - new Module(module): 初始化newModule = {state, _raw, _children}
        - path.length === 0: this.root = newModule
        - path.length > 0: parentModule.addChild(childModuleName, newModule)
        - 对 module.modules 里的每个注册module，递归调用 mc.register(path.concat(childModuleName), childModule)


    - 2.2 installModule(store, rootState, path, module): 把所有子模块的state、mutation、actions、getters都 合并到父模块下，并统一注册到_store上的对应属性下 ==>

      - y.1 namespace = store._modules.getNamespaced(path): 获取命名空间前缀
      - y.2 path.length > 0: 把子模块的state 注册合并到rootState/parentState上

      - y.3 module.forEachMutation(cb1): 初始化&合并 store._mutations值 ==> 
          forEachValue(module._raw.mutations, cb)==> 
          objKeys.forEach(key=> cb(obj[key],key))==> 
          cb1(mutationFn, mutationName)==> 即
        - 初始化 store._mutations[namespace + mutationName].push(mutationFnWrap) + 把子模块的mutationFnWarp合并到 store._mutations上
      

      - y.4 module.forEachAction(cb2): 初始化&合并 store._actions值 ==> 
          forEachValue(module._raw.actions, cb)==> 
          objKeys.forEach(key=> cb(obj[key],key))==> 
          cb2(actionFn, actionName)==> 即
        - 初始化 store._actions[namespace + actionName].push(actionFnWrap)

      - y.5 module.forEachGetter(cb3): 初始化&合并 store._wrappedGetters值 ==>
          forEachValue(module._raw.getters, cb)==>  
          objKeys.forEach(key=> cb(obj[key],key))==> 
          cb3(actionFn, actionName)==> 即
        - 初始化 store._wrappedGetters[namespace + getterName] = getterFnWrap

      - y.6 module.forEachGetter(cb4): 递归加载子模块 ==> 
        - 对module每一个child，都递归调用installModule(store, rootState, path.concat(childModuleName), childModule)

    - 2.3 resetStoreVM(store, rootState): 把rootState和getters都定义在 store._vm上 ==>
      - x.1 定义 computed 和 store.getters对象
      - x.2 forEachValue(store._wrappedGetters, cb1)==> 
          objKeys.forEach(getterName=> cb(getterFnWrap, getterName)), 即==> 
          
          - computed[getterName] = getterFnWrap
          - 定义 Object.definePty(store.getters, getterName, { get: ()=>store._vm[getterName] })

      - x.3 创建store._vm = new Vue({data: { $$state: rootState }, computed})
         
    - 2.4 设置属性访问器get state(): 读取store.state 实际是读取 store._vm._data.$$state

    -2.5 options.plugins.forEach(plugin => plugin(this)): 依次执行插件 ==>
      - store.subscribe(subFn): store._subscribes.push(subFn)


小结: 
  - x.3 + 2.5: 实现了 vuex内store.state响应式的功能==> 本质就是通过new Vue()构造了一个响应式data
  - x.2: 实现了 vuex内store.getter缓存功能==> 利用vue.computed + getter代理


3 读取了定义的getters,如 $store.getters.myAge==>
  - 3.1 $store.getters.getterName==> Object.definePty代理==> store._vm[getterName]==> store._vm.computed[getterName]==> getterFnWrap()==>
  getterFn(getState(store, path))==> getterFn(state)==> 获取到getter结果
  
4 调用了commit(type, payload)==> 
  - 4.1 store._mutations[type].forEach(mutationFnWrap)==> mutationFnWrap(payload)==> mutationFn.call(store, getState(store, path), payload)==>
  mutationFn.call(store, state, payload)==>  获取到mutation结果
  - 4.2 执行 store._subscribes.forEach(fn(mutationFn, store.state))==> fn(mutationFn, store.state)==> 执行插件结果

5 调用了dispatch(type, payload)==> 
  - 5.1  store._actions[type].forEach(actionFnWrap)==> actionFnWrap(payload)==>
  actionFn.call(store, store, payload)==> ......==> 通常会异步调用commit()==> 具体过程见S4内容
```

## 三 其他vuex相关

Q1 Vuex是怎么知道 state是通过mutation修改 还是外部直接修改的

A: <br/>
S1 commit(mutationName, payload)的底层，是执行 storem._withCommit(fn)

S2 在函数内部，它会设置内部属性 store._committing标志变量为true，然后才修改state，修改完毕还会还原_committing变量

S3 外部修改虽然能够直接修改state，但是并没有修改_committing标志位，所以只要watch一下state，state change时判断 _committing值是否为true，即可判断修改的合法性


--------------------------
Q2 Vuex和localStorage的区别 && 刷新浏览器后，Vuex的数据是否存在？如何解决？

A: <br/>
S1 Vuex的数据是响应式的，localStorage存储的数据是非响应式的；

S2 Vuex的数据在刷新后会被重置，localStorage存储的数据在缓存过期前不会重置

S3 刷新浏览器后，页面会重新加载vue实例，导致store里的数据被重新初始化
  - 解决方法1: 使用对应vuex持久化插件，如 vuex-persistedstate/ vuex-along
  - 解决方法2: 使用 localStorage/sessionStroage


------------------------------------------------
Q3 为什么要用 Vuex 或者 Redux，他们有什么异同

A: <br/>
S1 相同点:
  - 1 流程一致: 定义全局state，触发action来 修改state
  - 2 原理相似: 都是向全局根实例 注入store
  - 3 都是单一数据源: 都使用单一的store对象 管理共享数据
  - 4 本质上: redux与vuex都是对mvvm思想的实现，是把 【数据从视图中抽离】的一种方案

S2 不同点:
  - 实现原理角度: 
    - 1 Redux 使用的是不可变数据，而Vuex的数据是可变的。Redux每次都是用新的state替换旧的state，而Vuex是直接修改
    - 2 Redux在检测数据变化的时候，是通过diff的方式比较差异的，而Vuex是和Vue的原理一样，通过 getter/setter来比较的
  
  - 从使用方法角度:
    - vuex定义了state、getter、mutation、action3个对象; redux定义了state、reducer、action 3个对象
    - vuex中state统一存放，方便理解; redux里的 state依赖所有reducer的初始值
    - vuex有getter,目的是快捷得到state; redux没有这层，react-redux里的 mapStateToProps参数做了这个工作
    - vuex修改方式有2种: commit同步和dispatch异步; redux同步和异步都使用dispatch




## 四 参考文档

[01 Vuex实现系列文章](https://juejin.cn/post/7001133461020868645): 直接参考文档

[02 vuex为什么不建议在action中修改state](https://juejin.cn/post/6844904054108192776): 重点介绍了commit和dispatch的实现

[03 Vuex框架原理与源码分析](https://juejin.cn/post/6844903543984521224): 循序渐进的源码分析文章

[04 Vuex源码解析](https://juejin.cn/post/6844903507057704974): 全面的源码介绍