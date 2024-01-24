# Vue源码之 响应式原理1

## 一 前言

1 本文源码版本: 
  - Vue 2.6.14

2 本文简写词汇:
  - Obj.definePty: 即 Object.definePrpperty属性
  - keyX: 遍历data中的所有keys，某个过程中的一个key
  - obj__keyX: 表示此时正处于 data为obj中某个keyX的defineReactive中
  - obj.keyX: 表示 获取obj中keyX对应的 属性值ValX
 
3 关于所有工具函数，都汇总在本文第三部分

4 本文涉及的 函数调用栈见下，下文就是围绕这个调用栈具体阐述的
```js
1 initState (vm: Component)
  2 initData(vm)
    3 observe(data, true);
      4 Observer.constructor(value)
        5.1 this.walk(value)
          6 defineReactive(obj, keys[i])
        5.2 handleArray()
```

## 二 响应式实现原理

## 1 initState (vm: Component)

1 内部流程: <br/>

S1 initData(vm)
  - do what: 如果定义了vm.$options.data，就调用initData(vm)
  - why: 通过initData，来执行预处理工作（data类型判断、属性同名检测等）

S2 observe((vm._data = {}), true)
  - do what: 定义vm._data默认值 + 调用observe(data, true)
  - why1: 定义vm._data默认值，是为了兼容 后续vm.$data的赋值正常，因为vm.$data属性是一个访问器属性，它代理的值就是vm._data
  - why2: 因为没有自定义的vm.$options.data，所以不需要进行预处理，直接调用observe 开始响应式处理

具体代码实现，见[initState函数实现](./code/instance/state.js)


## 2 initData(vm: Component)

1 内部流程: <br/>

S1 getDataVal
  - do what: 根据data的类型判断，确保获取到 data和vm._data值
  - why: 理论上经过mergeOptions函数处理后，vm.$options.data的返回值一定是一个函数；但是在 mergeOptions-- beforeCreate-- initData流程中，用户还是可以在beforeCreate()阶段修改vm.$options.data值，所以此处需要进行保底的类型判断

S2 checkDataIsPlainObj
  - do what: 确保data是一个纯对象类型
  - why: 只有data是纯对象类型时，才能有Obj.definePty属性，从以实现响应式; 

S3 checkKeyHasDefined
  - do what: 遍历对 data中的keyX进行同名校验
  - why: 防止data中的key和 props/methods中的key冲突，导致覆盖;
  - PS1: key定义的优先级值是 props > data > methods

S4 proxy(vm, `_data`, key)
  - do what: 代理vm._data属性
  - why1: 为了让开发者，可以使用vm.key1 来快捷访问vm._data.key1的值
  - why2: 设置代理前先检查了key 不是保留key，因为保留key是在Vue内部使用的，没必要暴露给用户

S5 observe(data, true /* asRootData */)
  - do what: 把data转化为响应式数据
  - why1: 从而实现 当data.keyX值发生变化时，所有读取了data.keyX的副作用函数都会自动执行
  - why2: vm._data被标志为了rootData，从而在后续进行特殊处理

具体代码实现，见[initData函数实现](./code/instance/state.js)


## 3 observe(value: any, asRootData: ?boolean):  

1 内部流程: <br/>

S1 setReturn
  - do what: 设置递归中止条件，即 当value是基本数据类型时，它没有子内容可以被观测
  - why: observe其实是递归函数（在内部子调用栈里又调用了observe），所以需要设置递归中止条件

S2 getOb
  - do what: 根据value是否被监测过，读取/创建ob实例对象
  - why: ob实例对象最后 会作为observe函数的返回值，被用于指向 后续的childOb

> ob对象的作用:
> 1. 表示当前对象/数组 是一个被观测过的数据
> 2. 用作childOb，存储嵌套关系的依赖(读子属性，父层对象也需要存储 efn);
> 2. 用于存储那些无法通过setter触发的依赖，如新增未定义的对象属性/调用数组变异方法等

S3 incrRootData_vmCount
  - do what: 更新/增加 rootData.vmcount值
  - why: 只有rootData的vmcount值为1，非rootData的vmcount值都为0，从而区分了rootData 和 非rootData==> 要区分rootData 和 非rootData，是因为rootData有一些特殊逻辑需要处理（比如下文介绍的Vue.set/delete）

具体代码实现，见[observe函数实现](./code/Observer/index.js)


## 4 Observer.constructor(value: any)

1 内部流程: <br/>

S1 initObPty: 
  - do what: 创建ob实例的 属性
  - why1: ob.dep是用于 存储某层对象/数组上的 + 所有无法被setter触发的 依赖
  - why2: ob.value的作用是 让ob和value关联上，以后通过ob 就能读到该ob那一层对应的value
  - why3: ob.vmCount的作用是用于区分 rootData和非rootData


S2 define_Value.__ob__: 
  - do what: 创建value的__ob__属性，即 value.__ob__ === ob
  - why: 让value可以有方法，获取到这一层对象/数组 对应的ob实例，即 value和ob互相关联

value.__ob__代码表示
```js
const data = {
  a: 1,
  // __ob__ 是不可枚举的属性:
  // 这样就不会在下面遍历过程中因为读取了value.__ob__循环引用，而一直处于死循环中
  __ob__: {
    value: data,  // value属性指向 data数据对象本身，循环引用
    dep: dep实例对象, 
    vmCount: 0
  }
}
```

S3 handleArray/handleObject: 
  - do what: 分别处理value 是数组/对象的情况
  - why1: 在Vue2.X版本中，数组需要特殊实现响应式，具体原因见下文
  - why2: 经过之前逻辑处理，一开始的rootData必然是一个对象类型，所以下文先讨论handleObject ==> this.waik()

具体代码实现，见[Observer.construcrot的实现](./code/Observer/index.js)


## 5.1 ob.walk(obj: Object)

1 内部流程: <br/>
S1 getKeys: 获取obj 自身上+所有可枚举的 keys集合
  
S2 defineReactive(obj, keyX): 监听obj上每个keyX的 读写事件

具体代码实现，见[Observer.walk的实现](./code/Observer/index.js)


## 6 defineReactive(obj, key, val, customSetter?:Fn, shallow?: Boolean)

1 内部流程: <br/>
S1 createSetterDep
  - do what: 为obj中的每个keyX创建dep，把该dep记做setterDep
  - why: 当valX的值被改变 + 改变值方式会触发setter时，就可以让依赖被收集到 setterDep里

S2 cacheGetterAndSetter
  - do what: 缓存data__key 原本定义的getter/setter
  - why: 防止下面用 Obj.definePty重新定义的setter/getter，覆盖掉原有用户定义的getter/setter

S3 getVal: 
  - do what: 当没有getter/有setter + 只传递data和key时，才会触发getVal 
  - why: 为了处理极端情况 + 获取到val后才能获取到返回值

S4 getChildOb
  - do what: 当声明了是深度观测 + val有值时，就会获取val那一层对象/数组 对应的ob实例(即val.__ob__)
  - why: 见下文解释
  
S5 Obj.definePty.get: 
  - do what: 正确返回属性值value + 当Dep.target存在时，使用dep闭包 收集依赖

  - getValue: 返回值vlaue会通过 原有getter调用/被setter更新后的val获取到，从而作为新定义的getter返回值

  - Dep.target: Dep.target会指向 当前读取了obj.keyX的 依赖/副作用函数，只有在Dep.target有值时，才说明此时有需要收集的 依赖

  - dep.depend(): 把当前依赖，收集到obj__key对应的dep里，记做setterDep。setterDep里的依赖，会在data__key对应的属性值被修改 + 修改值的方式可以被setter拦截到时，触发执行
  - childOb?.dep.depend(): 把当前依赖，收集到obj.key对应的ob.dep里，记做obDep。obDep里的依赖，会在Vue.$set时触发执行 [PS1]

  - dependArray(value): 当value为数组时，子数组的每个成员对象也需要依赖收集  [PS2]
  
[PS1] childOb?.dep.depend举例分析
  - 如果一个依赖efn1 读取了obj.key1，那么当obj.key1.child1值发生了变化时，自然也要让efn1自动执行，以获取到最新的obj.key1.child1值
  - childObDep里的依赖，会在用 $set/Vue.set给数据对象 添加新属性时，触发执行==> 以弥补Vue2.X 直接添加新属性无法观测的问题

```ts
// 例1: childOb?.dep.depend()的执行原因
const data = {
  name: 'haha',
  info: {
    mid: 123,
  }
}

observe(data)
// data的伪代码为
data = {
  name: 'haha',
  // 记做ob1
  __ob__: {value: data, vmCount:1, dep: [] },

  info: {
    mid: 123,
    // 记做ob2
    __ob__: {value: info, vmCount:0, dep: [] }
  }
}

/**
 * 如果一个efn1内读取了data.info
 * 那么当data.info.mid的值发生了变化时，就应该自动触发efn1
 * 从而让efn1内能获取到正确的data.info.mid值
 * 
 */

// 例2: childOb?.dep.depend 和 Vue.$set关系
Vue.set(data.info, 'money', function efn1(newVal) {
  console.log('newVal', newVal)
})
// Vue.set的伪代码
Vue.set = function (obj, key, val) {
  defineReactive(obj, key, val)
  obj.__ob__.dep.notify() 
}

// Vue.set/vm.$set的流程解析
/**
 * S1 触发observe(data): data转化为 响应式数据
 * S2 vm.$watch(data.info, efn1): 
 *   触发了data.info的getter==> 触发了data__info的dep收集 +
 *   data.info.__ob__.dep收集 + data.info.mid_mid的收集
 * 
 * S3 vm.$set(data.info, 'money', 150):
 *   内部会触发data.info.__ob__.dep.notify()==> 
 *   所以会导致efn1的重新执行
 */
```

> 即childOb.dep的作用是: 
> 1. 当data.key1.child1值变化时，观测data.key1值的 efn1也可以被自动执行
> 2. 收集无法被setter触发的依赖，从而响应 vm.$set/arr.push 等其他触发手段


[PS2] dependArray(value)的引入原因
```js
<div id="demo">
  {{arr}}
</div>

const ins = new Vue({
  el: '#demo',
  data: {
    arr: [ { a: 1 } ]
  }
})

//S1 observe(data)后，其结构是
// 对于数组的ob处理，详细会在下文介绍，这里只需先了解即可
{
  arr: [
    { a: 1, __ob__: ob2 },  // 将该 __ob__ 称为 ob2
    __ob__: ob1   // 将该__ob__称为ob1
  ]
}

//S2 读取arr==> arrKeyDep.depend() + arrChildObDep.depend(),即ob1.dep.depend()
//S2 注意，此时ob2是没有收集到依赖的，但是其实依赖了arr，就意味着同时依赖了它所有的成员

//S3 所以需要遍历数组成员，让他每个成员都收集依赖

// 综上，由于data.arr[0]=xxx无法走setter流程，所以通过ob.dep来存储依赖，从而留下vm.$set的手段触发 ob.dep的依赖
```

S6 Obj.definePty.set: 
  - do what: 更新属性值 + 触发对应data__key的依赖
  - judgeValueChange: 对比新旧值是否相等，如果值没变化，则不需要触发更新
  - updateVal: 更新属性值
  - observe(newVal): 监测新的属性值
  - dep.notify(): 触发keyDep的依赖

具体代码实现，见[Observer/defineReactive的实现](./code/Observer/index.js)


## 5.2 handleArray()

1 内部流程: <br/>

S1 定义数组类型的 value.__ob__属性：同上对象类型的处理方式

S2 protoAugment(value, arrayMethods): 创建一个新的代理的 数组原型对象
  - 数组有很多可以改变值的原型方法(把这些方法称做变异方法)，调用他们不会触发getter/setter，所以需要特殊处理数组类型，从而可以拦截数组变异方法的调用
  - 变异方法有: push()/ pop()/ shift()/ unshift()/ splice()/ reverse()/ sort()等
  - 如何拦截数组变异方法: 
    - 获取原数组原型对象 arrayProto
    - 创建新的继承代理对象 arrayMethods
    - 在arrayMethods上定义同名的变异方法，并加入拦截处理逻辑
    - 拦截处理逻辑: 获取到数组实例上的ob对象 + 触发之前ob.dep上收集的依赖 + 观测新增的数组成员 + 返回变异方法执行结果
> 一句话总结: 代理数组原型对象 + 定义同名数组变异方法 + 加入拦截处理逻辑

S3 copyAugment(value, arrayMethods, arrayKeys)
  - why: 需要意兼容处理 浏览器不支持__proto__属性的情况
  - how: 直接在数组实例上定义 与变异方法同名的函数
> 一句话总结: 在数组实例上定义 变异方法同名函数

S4 ob.observeArray(value): 观测数组每个成员对象
  - why: 数组内部的成员，可能还是数组/对象，所以需要深度观测其内部每个成员
  - how: 递归观测数组成员
> 一句话总结: 递归观测每个数组成员


具体代码实现，见[Observer/Observer.constructor的实现](./code/Observer/index.js)


handleArray流程举例
```ts
const data = {
  name: 'haha',
  info: {
    mid: 123
  },
  friends: [{ name: 'a'}, { name: 'b'} ]
}
/**
 * data一开时为对象，所以会触发defineReactive(data, 'friends'):
 *   data__friends过程中，会触发 observe(data.friends);
 * 
 * observe(data.friends):
 *   会定义data.friends.__ob_属性
 *   protoAugment(data.friends, arrayMethods)==> 
 *     在以后调用变异方法时，通过 data.friends.__ob__.dep.notify()触发
 *   会递归监测每个数组成员
 *  
 * 返回childOb = obj.friends.__ob__ + 并在getter时，触发childOb.dep.depend();
 */
```


## 三 Vue.set/vm.$set原理介绍

### 1 vm.$set/$delete 和 Vue.set/delete 关系

S1 本质上是一致的，都是引用的 src/core/observer/index.js文件中定义的 set函数和del函数


### 2 Vue.set/$set

1 内部流程: <br/>
S1 checkTargetType: 目标对象类型校验
  - 如果set函数的第一个参数是 undefined/ null/ 原始类型值，那么会打印警告信息

S2 updateArrayEle: 更新 数组类型的下标值
  - 进行参数校验：target是一个数组 + key是一个有效数组索引
  - target.splice(key, 1, val): 利用之前处理过的数组变异方法，更新/新增元素
  - 更新数组长度: 将数组长度修改为 target.length/key中的较大者，否则如果当要设置的元素的索引大于数组长度时, splice会无效

S3 updateHasDefiendPty: 更新 对象类型中已存在的属性值
  - 已存在的属性经过处理，已经是响应式的了，所以直接更新值即可
  - 注意要 保证key在target上/在target的原型链上 + 必须不能在Object.pty上 [PS1]

S4 setNewValReactive: 创建 对象中未定义的属性值为响应式数据 + 触发ob依赖
  - 当target是 Vue实例对象/根数据对象时，是不允许添加属性的，因为Observer.constructor只能从data.key开始处理，不能处理rootData本身
  - 当target是非响应式时，简单赋值即可
  - 保证新添加的属性是响应式的 + 调用 __ob__.dep.notify 从而触发响应


[PS1] 不使用hasOwn(target, key)的原因
  - 其实就是in操作符和Object.prototype.hasOwnProperty的区别
  - 和in运算符不同，Object.pty.hasOwnProperty会忽略 从原型链上继承到的属性
  - 具体分析，见[issues](https://github.com/vuejs/vue/issues/6845) 


具体代码实现，见[Observer/set的实现](./code/Observer/index.js)


### 3 Vue.delete/$delete

1 内部流程: <br/>
S1 checkTargetType: 目标对象类型校验
  - 如果set函数的第一个参数是 undefined/ null/ 原始类型值，那么会打印警告信息

S2 updateArrayEle: 删除 数组类型的成员
  - 进行参数校验：target是一个数组 + key是一个有效数组索引
  - target.splice(key, 1): 利用之前处理过的数组变异方法，删除元素

S3 readyDeleteVal: 删除对象类型的 属性
  - 当target是 Vue实例对象/根数据对象时，不允许删除属性
  - target不存在该属性则直接返回
  - 删除属性 + 触发ob依赖

具体代码实现，见[Observer/delete的实现](./code/Observer/index.js)


## 四 参考文章

[01 深入浅出Vue.js 1～3章](/): 简单介绍了响应式的实现要点

[02 Vue技术内幕——揭开数据响应系统的面纱](http://caibaojian.com/vue-design/art/7vue-reactive.html): 本文直接参考文档