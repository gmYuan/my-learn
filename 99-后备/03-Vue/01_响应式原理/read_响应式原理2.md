
# Vue源码之 响应式原理2

## 一 前言
1 本文涉及的 函数调用栈见下，下文就是围绕这个调用栈具体阐述的
```js
1 Vue.constructor(options)
  2 Vue.pty._init(options)
    3 vm.$mount(vm.$options.el)
      4 mountComponent(vm, el, hydrating)
        5 Watcher.constructor(vm, updateComponent, etc...)
          6 watcher.get()

7 dep.notify()
  8 watcher.update()
    9 queueWatcher(watcher)
      10 nextTick(flushSchedulerQueue)

11 vm.$watch
  12 vm.$watch.deep实现

13 vm.computed
  14 initComputed(vm, opts.computed)
    
```

## 二 响应式实现原理2

## 1 Vue.constructor(options)

1 内部流程: <br/>
S1 checkIsConstrucor: 确保Vue是被作为构造函数使用的

S2 vue._init(options): 初始化项目
  - Vue.pty._init被定义在 initMixin中，在调用initMixin(Vue)时会被实现

具体代码，见[Vue构造函数实现](./code/instance/index.js)


## 2 Vue.pty._init(options)

1 内部流程: <br/>
S1 setVmPty: 定义vm的属性值，如vm._isVue等，用于标识vue实例

S2 initXXX + callHook: 完成所有初始化工作 + 定义对应生命周期钩子

S3 vm.$mount(vm.$options.el): 把组件挂载到 指定元素

具体代码，见[Vue.pty._init实现](./code/instance/init.js)


## 3 vm.$mount(el?: string | Element, hydrating?: boolean)

1 运行时版Vue 内部流程: <br/>
S1 getElVal: 正确获取到el的值
  - 存在el+当前宿主环境是浏览器==> el为对应DOM元素/ el为undefined

S2 mountComponent(this, el): 调用mountComponent 完成真正的挂载工作

具体代码，见[运行时版Vue的入口文件](./code/platforms/web/runtime/index.js)


2 编译版Vue 内部流程: <br/>
S1 cacheRuntime$mount: 缓存 运行时定义的vm.$mount 并在最后调用
  - 说明是为了 在原有逻辑上，增加 编译模板 的能力

S2 checkElType: 检查el对应的DOM元素,不可以是 document.html/body
  - el这个元素叫做挂载点，挂载点即 组件挂载的占位，它将会被组件自身的模板替换掉，显然 html/body元素 是不能被替换掉的

S3 getTemplate: 利用template/el选项，获取到 template模板字符串内容
  - 当没有$options.render时，就需要根据 $options.template/ el.outerHTML获取到 template模板字符串内容

S4 getRenderFn: 把template字符串编译为 渲染函数(render)
  - compileToFunctions函数: 将字符串编译为渲染函数
  - 将渲染函数render赋值给 vm.$options.render选项

S5 调用cacheRuntime$mount: 提供渲染函数给 mountComponent完成挂载

> 一句话总结编译版vm.$mount: vm.$options.template/el ==> vm.$options.render ==> mountComponent

具体代码，见[编译版Vue的入口文件](./code/platforms/web/entry-runtime-with-compiler.js)


## 4 mountComponent(vm: Component, el, hydrating?: boolean) 

1 内部流程: <br/>
S1 设置vm.$el值
  - vm.$el必然指向组件模板的根元素，而不一定是挂载点  [PS1]

S2 checkRender: 检查render函数是否存在
  - 这里防止传递了template/el后，却没有使用编译版本导致无法生成render函数，所以进行了保险判断+容错处理

S3 callHook(vm, 'beforeMount'): 触发beforeMount生命周期钩子
  
S4 initUpdateComponent: 定义并初始化 updateComponent函数
  - vm._render函数: 调用vm.$options.render函数, 并返回 生成的虚拟节点vnode
  - vm._update函数: 把vm._render函数生成的vnode 渲染成真正的DOM；它的内部是通过 虚拟DOM的补丁算法(patch)来完成的
  - updateComponent函数会作为 Watcher构造函数的 第二个参数
> updateComponent函数的作用==> 把渲染函数生成的虚拟DOM 渲染成真实DOM

S5 createRenderWatcher: 创建 渲染函数的观察者
  - Watcher.construcror ==> 执行updateComponent()==> 执行vm.$options.render()==> 触发响应数据的getter拦截==> 收集到当前的wather依赖
  - 当数据发生变化==> 触发依赖更新==> 再次执行updateComponent()==> 重新渲染页面

> 也就是说，在完成数据的响应式定义后，真正开始触发依赖收集的入口，是一个watcher实例

[PS1]vm.$el值指向

```js
<div id="foo"></div>

<script>
const new Vue({
  el: '#foo',
  template: '<div id="bar"></div>'
})
</script>

/**
 * 上面代码中:
 * 挂载元素是 div#foo元素
 * 组件模板是 div#bar元素
 * vm.$el指向的是 div#bar元素，因为vm.$el【最后】一定是组件模板的根元素；
 * 由于明确指定了 template模板，所以 vm.$el指向 div#bar元素，
 * 假设没有传递 template选项，那么 vm.$el最后会指向 div#foo元素
 * 
 * 虽然mountComponent里vm.$el暂时指向了挂载点，
 * 但是这里仅是暂时赋值而已，是为了给虚拟DOM的patch算法使用的
 * 实际上 vm.$el会被patch算法的 返回值重写
 * 具体见 src/core/instance/lifecycle.js里的Vue.prototype._update
 */
```

具体代码，见[mountComponent函数实现](./code/instance/lifecycle.js)


## 5 Watcher.constructor(vm, expOrFn, cb, options, isRenderWatcher)

1 内部流程: <br/>

S1 setRelaInVmAndWatcher: 建立当前组件实例vm 和 当前watcher实例 关联
  - watcher.vm: 把当前组件实例vm挂载到 当前watcher实例上，从而指明这个观察者是属于哪一个组件的;
  - vm._watcher: 组件实例上的_watcher引用着该组件的 渲染函数观察者;
  - vm._watchers.push(watcher): 属于该组件实例的观察者，都会被添加到该组件实例的_watchers属性中，包括渲染函数watcher 和 非渲染函数watcher

> 即 建立当前组件实例 和 当前watcher实例的 多对多的关系

S2 setOptionPty: 根据选项参数初始化对应的 watcher实例属性
  - watcher.deep: 用来确定当前watcher实例 是否是深度观测；
  - watcher.user: 用来标识当前watcher 是内部定义/开发者定义的，内部定义的一般有 renderWatcher/ computedWatcher等；
  - watcher.computed: 用来标识当前watcher 是否是计算属性的观察者，具体内容见下文；
  - watcher.sync: 用来确定当数据变化时 是否同步求值并执行回调，默认情况下是把 要重新求值的watcher放到一个异步队列中，当所有数据的变化结束之后统一求值
  - watcher.before:可以理解为 watcher实例的钩子==> 当数据变化之后，触发更新之前，会触发before函数钩子

> 即 初始化配置项为 watch属性字段值

S3 setOtherPty: 设置其他 watcher实例属性
  - watcher.cb: 值更新后的回调函数
  - watcher.id: watcher对象的唯一标识
  - watcher.active: 标识着该watcher 是否是激活状态
  - watcher.dirty: 只有是 computedWatcher实例对象，dirty属性才为真，因为计算属性才需要标识是 惰性求值
  - watcher.deps && watcher.depIds: 多次求 值避免重复依赖搜集
  - watcher.newDeps && watcher.newDepIds: 单次求值 避免重复依赖搜集
  - watcher.expression: 缓存expOrFn, 用于报错提示用的

> 即 初始化其他watcher实例属性值

S4 initWatcherGetter: 设置watcher.getter值为1个函数
  - watcher.getter = expOrFn 或者 parsePath(expOrFn) 
  - 对watcher.getter进行函数类型验证，防止读取属性传参 不合法

> 即 把expOrFn统一包装为函数，并赋值给watcher.getter属性


S5 this.get()
  - 对computedWatcher类型的watcher,处理见下文
  - 对非computedWatcher类型的watcher，调用watcher.get()方法，并把结果赋值给watcher.value

> 即用于求值：（1）触发访问器属性的getter从而收集依赖 （2）获取被观察目标的值

具体代码，见[Watcher.constructor实现](./code/Observer/watcher.js)


## 6 watcher.get()

1 内部流程: <br/>

S1 pushTarget(watcher): 让Dep.target指向当前watcher
  - 更新Dep.target指向 + targetStack入栈当前watcher


S2 value = watcher.getter.call(vm, vm): 调用watcher.getter
  - watcher.getter()用于 对被观察目标（属性）的求值
  - watcher.getter()经过调用renderFn，最后会触发dep.depend()
  - 调用了watcher.addDep(dep)，避免一次/多次求值中 收集重复依赖 + 存入depId
  - value最后会作为watcher.get()的返回值，被存入到watcher.value

> 流程为watcher.getter()==> updateComponent() ==> vm._render()==> $data.xxx的getter拦截 ==> 
> dep.depend() ==> 
>   watcher.addDep(dep): 避免在一次/多次求值中 重复依赖收集
>     dep.addSub(watcher): 真正在dep里收集了watcher实例


举例说明 watcher.getter()的内部执行流程
```js
//1. 假设如下模板
<div id="demo">
  <p>{{name}}{{name}}</p>
</div>

//2. 这段模板被编译将生成如下渲染函数：
function anonymous () {
  with (this) {
    return _c('div',
      { attrs:{ "id": "demo" } },
      [_v("\n      "+_s(name)+_s(name)+"\n    ")]
    )
  }
}

//3. 渲染函数的执行会读取$data.name ==> 触发name属性的getter拦截
// 注意由于读取了2次$data.name，所以会触发2次getter
get: function reactiveGetter () {
  // 省略代码...
  dep.depend()
}

// 4. dep.depend()实现，又调用了 watcher.addDep(dep)
// 由于执行了2次dep.depend()，所以会调用2次watcher.addDep(dep)
export default class Dep {
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this)
    }
  }
}

// 5. watcher.addDep实现
export default class Watcher {
  addDep (dep: Dep) {
    const id = dep.id
    // 如果newDepIds里已经保存过dep.id, 则说明已经收集过依赖
    // 用来避免在 一次求值的过程中 收集重复的依赖
    if (!this.newDepIds.has(id)) {
      this.newDepIds.add(id)
      this.newDeps.push(dep)
      //depIds属性是用来在 多次求值中 避免收集重复依赖
      //所谓多次求值 是指当数据发生了变化后 重新求值的过程
      if (!this.depIds.has(id)) {
        dep.addSub(this)
      }
    }
  }
}

// 即 newDepIds/newDeps属性值 所存储的总是当次求值所收集到的 Dep实例;
// 而 depIds/deps属性值 所存储的总是上一次求值过程中所收集到的 Dep实例

//6. dep.addSub实现, 它才是真正用来收集观察者的方法
export default class Dep {
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }
}
```

S3 递归实现深度依赖收集: 这部分具体见下文 vm.$watch.deep 这部分内容分析 

S4 popTarget + watcher.cleanupDeps(): 出栈 + 清空当前newDeps
  - removeUnuseDep: 利用deps属性移除废弃的观察者 [PS1]
  - saveNewInOld: newDepIds属性 && newDeps属性被清空 + 被清空之前把值分别赋给了 depIds属性和deps属性，这两个属性将会用在下一次求值时避免依赖的重复收集

[PS1] 利用deps属性移除废弃的观察者 的实现流程
1. 对上一次求值收集到的 deps数组进行遍历；
2. 检查上一次求值所收集到的Dep实例是否还存在于 当前这次求值收集到的Dep实例中；
3. 如果不存在则说明该 Dep实例已经和该watcher不存在依赖关系了，这时就会调用 dep.removeSub(watcher)方法，从而将watcher从 Dep实例中移除

> 即 移除废弃的观察者 + 缓存本次更新收集的dep

## 7  dep.notify()

1 内部流程: <br/>
S0 修改响应数据的属性值==> setter/ob.dep ==> dep.notify()

S1 sortSubs: 用于同步更新时的watcher排序

S2 subItem.update(): 遍历调用subs里的 watcher.update()


## 8 watcher.update()

1 内部流程: <br/>
S1 handleCoumputed: 处理computedWatcher的分支逻辑，具体见下文

S2 handleSyncWatcher: 调用watcher.run()处理同步更新变化的watcher
  - 调用watcher.get()重新获取修改后的 最新值
  - judgeCallCb: 根据一定条件判断是否可以调用cb回调 [PS1]
  - cb.call(vm, value, oldValue): 执行cb

[PS1]judgeCallCb的判断条件含义

1. 对比新值value和旧值this.value是否相等，只有在不相等的情况下才需要执行回调，注意renderWatcher返回值都是undefiend，所以renderWatcher不会执行cb
> 即wathcer.cb是为 非renderWatcher类型的 watcher准备的

2. 如果新值是对象类型，那么新旧值的引用地址可能不变，但内部属性值可能变化了，所以也要执行cb


S3 queueWatcher(watcher): 把当前观察者对象放到一个异步更新队列，在调用栈被清空后按照一定的顺序执行
  - 异步更新而非同步更新的原因 + 异步更新的原理 [PS2]
  - 具体流程见下文

[PS2] 异步更新而非同步更新的原因 + 异步更新原理 <br/>
1. 如果是同步更新的话，一次渲染函数执行周期内，N个属性值的变化就会导致 N次重新渲染，而实际业务场景中，经常会同时修改多个属性值，所以需要引入异步更新提高性能

2. 异步更新的原理: 修改属性值a==> renderWatcher入队==> 修改属性值b==> renderWatcher已入队了，不会重复入队==> 最后依次调用队列中的 watcher.update()

> 即根据时同步还是异步更新，分别调用 watcher.run()/ queueWatcher(watcher)


## 9 queueWatcher(watcher)

1 内部流程: <br/>
S1 checkIdNotSave: 检查watcherId还未存入到队列中
  - 获取watcher.id + has对象缓存，以避免将相同的watcher 重复入队

S2 checkIsFlushing: 判断队列是否 正在执行更新
  - flushing为true，表示此时 正在执行更新；
  - 如果当前队列 没有执行更新+有观察者入: 直接把将watcher入队到尾部即可 
  - 如果当前队列 正在执行更新+有观察者入队: 特殊处理  [PS1]

[PS1] 什么情况下会出现 队列执行更新的过程中还会有观察者入队 <br/>
1. 队列执行更新时==> 执行renderWatcher更新==> renderWatcher内部存在计算属性
2. 触发计算属性的 get拦截器函数==> computedWatcher入队==> 此时flushing就会为true

S3 nextTick(flushSchedulerQueue)
  - setWaitingTrue: 无论调用多少次queueWatcher函数，nextTick(cb)只执行一次
  - flushSchedulerQueue(): 遍历queue中的所有watcher并重新求值 + 完成重新渲染(re-render) + queue重置为空数组
  - nextTick(flushSchedulerQueue)  [PS1]

[PS1] nextTick相关 <br/>
1.nextTick函数作用 约等于setTimeout(fn, 0)，但是微任务队列的优点在于，它是在 UI渲染之前被执行清空的，这样就可在UI重渲染前，把需要更新的数据全部更新，然后再渲染一次即可

2. nextTick的实现流程是：

自定义wrapCb，并存入到callbacks数组里==> 非Pending时调用timerFunc() ==> 注册微任务 p.then(flushCallbacks)==> flushCallbacks()==> 释放 pending锁 + 清空callbacks数组 + wrapCb()==> 执行cb()

举例理解以上内容
```js
// 例1
created () {
  this.$nextTick(() => { console.log(1) })
  this.$nextTick(() => { console.log(2) })
  this.$nextTick(() => { console.log(3) })
}
/**
 * 上面代码连续调用三次 $nextTick 方法
 * 但只有第一次调用$nextTick方法时才会执行 timerFunc函数 (pending锁)
 * 把flushCallbacks注册为 microtask
 * 
 * 由于微任务特性，flushCallbacks函数会等到调用栈被清空后才会执行，也就是
 * 说会等到接下来的两次$nextTick 方法的调用语句执行完后才会执行
 * 
 * 也就是说当 flushCallbacks函数执行时，callbacks回调队列中，将包含本次
 * 事件循环所收集的 所有通过$nextTick方法 注册的回调
 */

// 例2
created () {
  this.name = 'aaa'
  this.$nextTick(() => {
    this.name = 'bbb'
    this.$nextTick(() => { console.log('第二个 $nextTick') })
  })
}
/**
 * 外层$nextTick内部 再次调用了$nextTick，理论上外层$nextTick不应该与
 * 内层$nextTick 在同一个microtask任务中被执行
 * 
 * S1 修改$data.name1==> ......==> queueWatcher()==> nextTick
 * (flushSchedulerQueue)==> 
 *   callbacks = [flushSchedulerQueue] +
 *   microtask队列 = [flushCallbacks]
 *   
 * S2 调用了$nextTick(bbbFn)==> 
 *   callbacks = [ flushSchedulerQueue, bbbFn]
 * 
 * S3 接下来主线程处于空闲状态==> 执行微任务，即执行flushCallbacks()
 * 
 * S4.1 按照顺序执行callbacks数组中的函数==> flushSchedulerQueue()==>
 *   遍历queue中的所有watcher并重新求值 + 完成重新渲染(re-render) + 
 *   queue重置为空数组
 * 
 * S4.2 bbbFn()==> 
 *   修改$data.name2==>...==> nextTick(flushSchedulerQueue)==> 
 *     callbacks = [flushSchedulerQueue]
 *   但是由于在 S3中执行flushCallbacks()会优先释放pending锁
 *   因此nextTick函数会将再次注册 p.then(flushCallbacks)微任务
 *   所以此时 microtask队列 = [flushCallbacks,  flushCallbacks]
 * 
 * S5 步骤同上，再次依次执行callbacks内成员
 * 
 */
```

具体代码，参考[queueWatcher实现](./code/Observer/scheduler.js)


## 11 vm.$watch实现

1 内部流程: <br/>
S1 handleCbIsObj: 处理cb是纯对象的情况
  - 调用并返回 createWatcher(vm, expOrFn, cb, options) [PS1]

[PS1] 关于createWatcher
  - 1. createWatcher作用: 把纯对象形式的参数规范化一下，然后再通过vm.$watch() 创建观察者
  - 2. initWatch内部，其实就是通过调用createWatcher，来初始化 watch选项的

S2 handleCbIsFn: 处理cb是函数的情况
  - 调用 new Watcher(vm, expOrFn, cb, options)

S3 handleOpts: 处理options.immediate为真的情况：
  - 直接调用 cb.call(vm, watcher.value)

S4 返回unwatchFn，用于解除监听关系
  - 内部调用了 watcher.teardown() [PS1]

[PS1] watcher.teardown()的具体实现
  - 1. 将当前观察者实例对象，从 vm._watchers数组中移除
  - 2. 将当前观察者实例对象，从 watcher.deps里的 deps实例对象中移除
  - 3. 设置 watcher.active为false

> $watch方法的本质，就是创建了一个 Watcher实例对象

具体代码，见[vm.$watch实现](./code/instance/state.js)


## 12 vm.$watch.deep实现

1 内部流程: <br/>
S1 watcher.get==> traverse(value)
  - 会递归地读取 被观察属性的所有子属性的值，这样 被观察属性的所有子属性 都将会收集到观察者，从而达到深度观测的目的
  - 内部会调用递归函数 _traverse(val, seenObjects)

S2 setSeenRecord: 通过读取/保存 valOb.dep.id，从而避免【循环引用导致的 死循环】

S3 _traverse(val: any, seen: SimpleSet)
  - setReturnCase: 检测val的类型，以判断能否进行深度观测/ 设置递归中止条件
  - readValChild: 根据val是数组/对象类型，递归调用 _traverse(val.child)==>
    从而读取子属性值，触发子属性的 get拦截器函数

具体代码，见[watcher.get实现](./code/Observer/watcher.js)


## 13 vm.computed实现

1 内部流程: <br/>

S1 initState==> initComputed(vm, opts.computed)
  - 初始化vm._computedWatchers
  - 初始化 userDef(comp[key]的值) 和 getter(comp[key]值对应的getter)
  - 创建 compWatcher，并把它添加到 vm._computedWatchers对象里
  - comp的key重复性检查，避免和vm.$data/props/method同名
  - 调用 defineComputed(vm, key, userDef)

S2 赋值sharedPropertyDefinition的 get和set属性值
  - 设置 sharedPropertyDefinition.get为 createComputedGetter(key)
  - 设置 sharedPropertyDefinition.set为 userDef.set/ noop

S3 createComputedGetter(key)
  - 返回一个函数 computedGetter

S4 computedGetter内部功能
  - 获取到计算属性compA 的观察者对象，记做compA-Watcher
  - 调用 compA-Watcher.depend()
  - 调用 compA-Watcher.evaluate()

> 计算属性响应式流程：模板中使用了计算属性compA==> 编译成渲染函数==> 触发compA的 getter拦截器，即sharedPropertyDefinition.get==> 触发computedGetter==> watcher.depend/ dep.depend/ watcher.addDep/ dep.addSub==> compA.subs = [renderWatcher]==> 

> 调用compA-Watcher.evaluate/watcher.get() 手动求值==> compA内读取了$data.key1，从而让$data.key1收集了compA-Watcher

> 修改$data.key1的值==> 触发compA-Watcher更新，即compA-Watcher.update ==> watcherdep.notify() + compA.subs = [renderWatcher] ==> 页面重新进行渲染，完成视图更新

具体代码，见[initComputed实现](./code/instance/state.js)


## 三 参考文章

[01 Vue技术内幕——渲染函数的观察者与进阶的数据响应系统](http://caibaojian.com/vue-design/art/8vue-reactive-dep-watch.html): 本文直接参考文档