## 虚拟DOM 和 DIFF算法

## 一 前置知识

### 1 渲染器相关

Q1 什么是渲染器

A: <br/>
1 渲染器: 用来执行渲染任务==> 把虚拟节点(vnode) 渲染成特定平台的 真实元素
  - 把虚拟节点(vnode) 渲染成 真实DOM元素/APP原生节点==> 支持 跨平台的能力

2 渲染器renderer 的主要功能：
  - render: 根据vnode 生成 真实节点，并挂载到容器上
	- hydrate: 激活 已有的 DOM元素

--------------------------------------------
Q2 renderer.render的 大致实现流程是什么

A: <br/>
1.1 存在newVnode==> patch(oldVnode, newVnode, container)进行挂载/打补丁
  - 1.2 pathch(oldVnode, newVnode, container)
	  - 1.3.1 如果 不存在oldVnode==> 意味着挂载，调用mountElement() 完成挂载
    - 1.3.2 如果 存在oldVnode==> 意味着打补丁，todo

1.3 mountElement()
  - 一系列设计特定平台的API操作，如 document.createElement()/ el.textContent/ container.appendChild()等
  - 为了实现跨平台功能，所以可以 通过配置项，让mountElement内部不固定使用某一个宿主环境的API
  
2 不存在newVnode + 存在oldVnode==> unmount()进行卸载

3 把本次的newVnode存储到 container._vnode下，作为下一次渲染的 oldVnode

具体伪代码实现，见 [renderer最简版 伪代码实现](./code/code-8.0.html)
	

### 2 虚拟dom相关

Q1 什么是 虚拟DOM

A: <br/>

虚拟DOM/vnode: 模拟描述【dom树形结构的】的 `JS对象`，举例如下

```js
// html结构
<div>
	<p>hello</p>
</div>

const vnode = {
  type: 'div',
  children: [
		{ 
			type: 'p',
      children: 'hello'
    }
  ]
}
```

## 二 虚拟DOM渲染

Q1 如何实现 vnode的初次渲染

A: <br/>
vnode的初次渲染 整体实现流程是：

1.1 存在newVnode==> patch(oldVnode, newVnode, container)进行挂载/打补丁

1.2 不存在newVnode + 存在oldVnode==> unmount(oldVnode) 卸载oldVnode

1.3 把本次的newVnode存储到 container._vnode下，作为下一次渲染的 oldVnode


2 pathch(oldVnode, newVnode, container)
	- 2.1 如果 不存在oldVnode==> 意味着挂载，调用mountElement() 完成挂载
  - 2.2 如果 存在oldVnode==> 意味着打补丁，todo


3 mountElement()
  - 一系列设计特定平台的API操作，如 document.createElement()/ el.textContent/ container.appendChild()等

  - 为了实现跨平台功能，所以可以 通过配置项，让mountElement内部不固定使用某一个宿主环境的API

  - 3.1 创建真实el元素==> createElement(vnode.type)
  - 3.2 支持不同类型的vnode.children==> 递归调用patch()创建子真实元素el
  - 3.3 支持vnode上设置的属性==> patchProps(el, key, preVal, nextVal)
  - 3.4 在容器中挂载 创建的el==> insert(el, container)


---------------------------------------------------
Q2 支持vnode上设置的属性，在具体实现时有哪些注意点

A: <br/>

1 要注意 HTML Attributes 和 DOM Properties 的复杂对应情况

```js
// HTML Attributes
<input id="my-input" type="text" value="foo" />

// DOM Properties
const el = document.querySelector('#my-input')

// 情况1：HTML Attributes 和 DOM Properties是 对应 + 同名的
<input id /> ===  el.id 

// 情况2：HTML Attributes 和 DOM Properties是 对应 + 不同名的
<div class="foo"></div> === el.className

// 情况3：HTML Attributes 是特有的，没有对应的DOM Properties
<div aria-valuenow="75"></div> 中 aria-*类的 HTML Attributes是独有的

// 情况4：DOM Properties 是特有的，没有对应的HTML Attributes
el.textContent可设置元素的文本内容，没有对应的 HTML Attributes 能完成该功能

// 情况5 一个 HTML Attributes 可能关联多个 DOM Properties
<input value="foo" /> 之后，用户手动修改为 foo-->bar

// HTML Attributes 的作用是: 设置与之 对应的 DOM Properties 的初始值
// 可以通过 el.defaultValue 来访问初始值
console.log(el.getAttribute('value')) // 仍然是 'foo'
console.log(el.value)                 // 'bar'
```

2 要注意 可省略值的 HTML Attributes

```js
<button :disabled = 'false'> Button </button>
<button disabled> Button </button>
```

3 由于Vue支持class和style的增加写法，所以需要特殊处理class属性
  - 封装normalizeClass 函数，把不同类型的class值 转化为 字符串
  - 考虑到性能差异，el.className性能要明显优于setAttribute，所以使用el.className特殊处理


4 基于以上3个注意点的 patchProps函数的 基本思路:
  - 由于依赖了特定宿主环境，所以需要抽象为 渲染器的选项传入
  - 对class属性使用el.className 进行特殊处理
  - 优先使用el[key]设置属性值
  - 对于一些只读el[key]属性 和 不存在对应DOM Properties的 属性，使用 el.setAttribute来设置值

具体代码，见 [实现首次渲染流程code8.1~8.5](./code/code-8.5.html)

----------------------------------------
Q3 如何实现 vnode的更新渲染

A: <br/>
vnode的更新渲染 整体实现流程是：

1 renderer.render(vnode, container)
  - 2 存在newVnode ==> patch(oldVnode, newVnode, container)
  - 3 不存在newVnode + 存在oldVnode ==> unmount(oldVnode)
  - 4 把本轮新节点作为旧节点 ==> container._vnode = vnode  
    

2 patch(oldVnode, newVnode, container): 进行挂载/补丁更新
  - 2.1 如果旧节点和新节点类型不一样，直接 先卸载旧节点  (此时已必然存在 newVnode)
  - 2.2 判断新节点的类型，如果是 原生tag类型 
    - 2.2.1 如果 不存在oldVnode==> 意味着挂载，调用mountElement() 完成挂载
    - 2.2.2 同时存在 新旧节点==> patchElement(oldVnode, newVnode) 完成更新
  
  - 2.3 处理 文本类型/注释类型 节点
    - createText(newVnode.children)/ setText(el, newVnode.children)
  
  - 2.4 处理 Fragment类型 节点
    - patch(null, newChild, container)/ patchChildren(old, new, container)

  - 2.5 处理 组件类型 节点==> 暂时先忽略


2.2.1 mountElement(vnode, container)
  - 一系列设计特定平台的API操作，如 document.createElement()/ el.textContent/ container.appendChild()等
  - 为了实现跨平台功能，所以可以 通过配置项，让mountElement内部不固定使用某一个宿主环境的API

  - 创建 + 引用 真实el元素==> vnode.el = createElement(vnode.type)
  - 支持不同类型的vnode.children==> 递归调用patch() 创建 子真实元素el
  - 支持vnode上设置的属性==> patchProps(el, key, preVal, nextVal)
    - 注意特殊处理了事件类型：invoker代理模式

  - 在容器中挂载 创建的el==> insert(el, container)


2.2.2 patchElement(oldVnode, newVnode)
  - 通过patchProps 更新 props
  - 通过调用 patchChildren(oldVnode, newVnode, el)
    - 根据 newVnode的3种情况 (文本节点、数组节点、null) 进行分类讨论
    - 核心是 umount() + setElementText + diff + patch(null, newChild, container)
    - 在 新旧节点都是数组类型时，会进度DiFF算法比较

3 unmount(oldVnode)
  - 通过封装unmount函数，可以实现执行 卸载相关的生命周期/指令 钩子
  - 核心是oldVnode.el.parentNode.removeChild(oldVnode.el)


总体执行流程为

```js
renderer.render() ==> patch() ==> mountElement()/ patchElement()
                      / unmount(oldVnode)
                      container._vnode = vnode 

patch()
  原生Tag: 
    mountElement()==> createElement() + 处理 vnode.children + insert()
    patchElement()==> patchProps() + patchChildren()
      patchChildren() ==> 核心是 umount()/ setElementText()/ patch()/ DIFF
  
  文本/注释类型:
    createText(newVnode.children) / setText(el, newVnode.children)
  
  Fragment类型:
    patch(null, newChild, container)/ patchChildren(old, new, container)
  
  组件类型:
    暂时忽略

unmount(oldVnode)
  Fragment类型: vnode.children.forEach(c => unmount(c))
  其他类型: oldEle.parentNode.removeChild(oldEle)
```

具体代码，见 [实现更新流程code8.6~8.11](./code/code-8.11.html)


## 三 DiFF算法

### 1 简单DIFF算法

1 当 新旧vnode的子节点都是 一组节点时，为了以最小的性能开销 完成更新，需要比较两组子节点，用于比较差异的算法就叫作 Diff算法

2 简单DIFF流程-版本1：
  - 对commonLength，进行 patch(oldChildX, newChildX)
  - 如果 newLen>oldLen，则对 新节点进行挂载 patch(null, newChildX, container)
  - 如果 oldLen>newLen，则对 多余旧节点进行卸载 unmount(oldChildX)


3.1 如果newVnode和 oldVnode之间存在大量位置移动，而非节点变化，以上流程就会造成DOM的多余销毁和新建，最佳处理方法应该是 识别是相同节点后 + 只进行位置移动==> 所以问题的关键是，如何识别一个节点 是否发生改变

> 3.2 解决方法其实很简单，给每个节点打上1个唯一标识即可，这就是 "key" 的作用==> 
  - 只要2个vnode的 type + key 属性值都相同，那么我们就认为它们是相同的，即可以进行复用
  - 注意，DOM可复用并不意味着 不需要更新，因为其内部的文本内容可能发生了变化，所以还是需要进行patch()操作


> PS补充: 为什么不建议使用index作为节点的key
  - key的作用 是在diff算法中，用于辅助更快地定位 新旧节点是可复用的
  - 如果使用index作为key，当插入/删除节点后，就有可能导致 实际上可复用的节点却被判断为不可复用，导致本轮只需要进行节点移动的操作，变成了 更消耗性能新增操作
  - 如果使用相同标签元素过渡切换的时候，还会导致只替换其内部属性，而不会触发过渡效果


3.3 简单DIFF流程-版本2：
  - 遍历新的 children + 在其内部再 遍历旧的 children
  - 如果找到了具有 相同key值的 2个节点，则调用patch() 更新
    - 根据 当前新节点在旧节点位置的最大索引值lastIndex 和 子节点的旧位置j比较大小，从而判断该节点 是否需要移动
    - 如果需要移动，则根据上一个新节点的位置依次插入到 上一个新节点的下面即可,
      即 insert(newVNode.el, container, prevVNode.el.nextSibling)
  
  - 如果newVnode无可复用旧节点，则需要在正确位置 新增该节点==> patch(null, newVNode, container, anchor)

  - 处理完所有新节点后，为了防止有多余的旧节点，就需要遍历旧节点，如果它在新的里面不存在，就卸载它 unmount(oldVNode)


4 小结一下 简单DIFF执行流程为

```js
// S1 初次渲染
renderer.render(vnode, container)==> 
  patch(oldVnode, newVnode, container): 递归函数，作用是根据vnode.type, 来挂载/更新vnode为 真实DOM ==> 
    mountElement(newVnode, container) ==> 
      - 创建真实DOM，即el: vnode.el = createElement(vnode.type)
      - 创建子节点内容: setElementText() / patch()
      - 创建节点属性:  patchProps(el, key, prevVal, nextVal)
      - 把el插入到容器内: insert(el, container)
  
  把 vnode 存储到 container._vnode 下，作为 后续渲染中的 旧vnode
       

// S2.1 更新节点
renderer.render(vnode, container)==> 
  patch(oldVnode, newVnode, container): 挂载/更新vnode为 真实DOM ==>
    - oldVnode和newVnode type类型不一样: unmount(oldVnode) + 挂载新节点
    - oldVnode和newVnode 存在 + type类型一样: patchElement()==>
    
    patchElement(oldVnode, newVnode)
      - 通过patchProps 更新该节点本身的 props
      - 更新节点的children ==> patchChildren(oldVnode, newVnode, el)
    
      patchChildren(oldVnode, newVnode, el)
        - 新节点的子节点是 文本节点: unmount(childX) + setElementText()
        - 新节点的子节点是 null: unmount(childX) / setElementText()
        - 新节点的子节点是 数组子节点: DIFF算法


// S2.2 DIFF算法之 简单DIFF算法
renderer.render() ==> patch()==> patchElement() ==> patchChildren()
  - 遍历新的children + 遍历旧的children ==> 
    - 如果找到了具有相同key值的 2个节点:
      - 调用patch():  更新节点属性 和 子节点值
      - 利用旧节点位置索引j 和 新节点在旧节点中的最大索引位置lastIndex，判断哪些是需要移动的vnode
      - 移动旧节点到正确位置：insert(newVNode.el, container, prevVNode.el.nextSibling)
    
    - 如果newVnode无可复用旧节点，则需要在正确位置 新增该节点==> patch(null, newVNode, container, anchor)

  - 处理完所有新节点后，为了防止有多余的旧节点，就需要遍历旧节点，如果它在新的里面不存在，就卸载它 unmount(oldVNode)

```

具体代码，见[实现简单DIFF算法 code9.1~9.6](./code/code-9.6.html)


### 2 双端 DIFF算法

1 简单Diff算法 存在的问题：会让DOM进行位置移动时，移动次数大于最优解情况，即 DOM移动次数非最优解 

2 双端Diff算法的原理:
  - 通过4个索引值，分别指向 
    新子节点的 头节点(newStartIdx / newStartVNode)
    新子节点的 尾节点(newEndIdx / newEndVNode)
    旧子节点的 头节点(oldStartIdx / oldStartVNode)
    旧子节点的 尾节点(oldEndIdx / oldEndVNode)

  - 每一轮新旧节点的比较, 都依次通过 "旧头-新头" ==> "旧尾-新尾" ==> "旧头-新尾" ==> "旧尾-新头" 顺序

   - "旧头-新头"是同一节点: 
      - 通过 patch(oldStart, newStart, con)更新 属性和子节点
      - 向下更新oldStartIdx 和 向下更新newStartIdx 索引值

    - "旧尾-新尾"是同一节点: 
      - 通过 patch(oldEnd, newEnd, con)更新 属性和子节点
      - 向上更新oldEndIdx 和 向上更新newEndIdx 索引值

    - "旧头-新尾"是同一节点: 
      - 通过 patch(oldStart, newEnd, con)更新 属性和子节点
      - 把 oldStart.el 移动到 oldEnd.el后面 (即 旧头 变 新尾)
      - 向下更新oldStartIdx 和 向上更新newEndIdx 索引值

    - "旧尾-新头"是同一节点: 
      - 通过 patch(oldEnd, newStart, con)更新 属性和子节点
      - 把 oldEnd.el 移动到 oldStart.el前面 (即 旧尾 变 新头)
      - 向上更新oleEndIdx 和 向下更新newStartIdx 索引值

    - 以上4种情况 都没找到同一节点:
      - 让newStart 在所有旧子节点中查找一遍，以获取它在旧数组中idxInOld + 获取到目标移动节点 moveVNode==> pahch() + 移动moveVNode到oldStart前 + 设置idxInOld值为undefined(表示已被处理过，后续遇到可以直接跳过它)+ 更新newStart指针

      - 如果newStart 在旧节点中都没找到，说明是新增头节点：把新头结点挂载到oldStart节点前面 + 更新newStartIdx指针值

  - 如果旧节点都处理完了，新节点还有未处理的，那么就需要 添加这些新节点
  - 如果新节点都处理完了，旧节点还有未处理的，那么就需要 卸载这些旧节点


3 双端Diff算法的执行流程是:

```js
// S1 初次渲染
renderer.render(vnode, container)==>
  patch(oldVnode, newVnode, container, anchor): 
    递归函数，作用是根据 vnode.type, 来挂载/更新vnode为 真实DOM ==> 
    
    mountElement(newVnode, container, anchor) ==> 
      - 创建真实DOM，即el: vnode.el = createElement(vnode.type)
      - 创建子节点内容: setElementText() / DFS递归调用 patch(null, child, el)
      - 创建节点属性:  patchProps(el, key, preVal, nextVal)
      - 把el插入到容器内: insert(el, container)
  

  把 vnode 存储到 container._vnode 下，作为 后续渲染中的 旧vnode
       

// S2.1 更新节点
renderer.render(vnode, container)==> 
  patch(oldVnode, newVnode, container): 挂载/更新vnode为 真实DOM ==>
    - oldVnode和newVnode type类型不一样: unmount(oldVnode) + 挂载新节点
    - oldVnode和newVnode 存在 + type类型一样: patchElement()==>
    
    patchElement(oldVnode, newVnode)
      - 通过patchProps 更新该节点本身的 props
      - 更新节点的children ==> patchChildren(oldVnode, newVnode, el)
    
      patchChildren(oldVnode, newVnode, el)
        - 新节点的子节点是 文本节点: unmount(oldChildX) + setElementText(new)
        - 新节点的子节点是 null: unmount(oldChildX) / setElementText('')
        - 新节点的子节点是 数组子节点: 双端DIFF算法，即
          patchKeyedChildren(oldVnode, newVnode, container)

// S2.2 DIFF算法之 双端DIFF算法
renderer.render() ==> patch()==> patchElement() ==> patchChildren()==> patchKeyedChildren()
  - "旧头-新头" 是同一节点: patch()更新 属性和子节点 + 更新 "旧头-新头" 指针
  - "旧尾-新尾" 是同一节点: patch()更新 属性和子节点 + 更新 "旧尾-新尾" 指针

  - "旧头-新尾"是同一节点:
    - 通过 patch(oldStart, newEnd, con)更新 属性和子节点
    - 把 oldStart.el 移动到 oldEnd.el后面 (即 旧头 变 新尾)
    - 向下更新oldStartIdx 和 向上更新newEndIdx 索引值

  - "旧尾-新头"是同一节点: 
    - 通过 patch(oldEnd, newStart, con)更新 属性和子节点
    - 把 oldEnd.el 移动到 oldStart.el前面 (即 旧尾 变 新头)
    - 向上更新oleEndIdx 和 向下更新newStartIdx 索引值

  - 以上4种都没有找到同一节点: 
    - 让newStart 在所有旧子节点中查找一遍，以获取它在旧数组中idxInOld + 获取到目标移动节点 moveVNode==> pahch() + 移动moveVNode到oldStart前 + 设置idxInOld值为undefined(表示已被处理过，后续遇到可以直接跳过它) + 更新newStart指针

    - 如果newStart 在旧节点中都没找到，说明是新增头节点：把新头结点挂载到oldStart节点前面 + 更新newStartIdx指针值

  - 如果旧节点都处理完了，新节点还有未处理的，那么就需要添加这些新节点

  - 如果新节点都处理完了，旧节点还有未处理的，那么就需要 卸载这些旧节点
```

具体代码，见[实现双端DIFF算法 code10.1~10.5](./code/code-10.5.html)


### 3 快速 DIFF算法

1 快速Diff算法 的原理:

S1 更新 相同的前缀节点
  - 通过startIdx索引，不断尝试向下寻找相同的 newStart和oldStart，直到不同的节点

S2 更新 相同的后缀节点
  - 通过oldEnd 和 newEnd索引，不断尝试向上寻找相同的 newEnd和oldEnd，直到不同的节点

S3 旧节点都遍历结束 + 新节点未遍历结束==>  挂载 新节点
  - 当 startIdx > oldEnd 同时 startIdx <= newEnd时，此时 startIdx到newEnd 之间的节点 应作为新节点插入
  - 依次把这些新节点，挂载到 newEndIdx+1的节点 的后面

S4 新节点都遍历结束 + 旧节点未遍历结束==> 卸载 旧节点
  - 当 startIdx > newEnd 同时 startIdx <= oldEnd时，此时 startIdx到oldEnd 之间的节点 应作为旧节点卸载
  - 依次把这些旧节点 unmout()

S5 新旧节点都未遍历结束
  - 创建source数组：new Array(newEnd - stratIdx + 1).fill(-1)
  - 更新source值:
    - 目标: 让[stratIdx, newEndIdx]里的每个新节点newVnodeX，在source里对应位置，都存储它在旧数组里的对应位置索引
    - 实现方法:
      - 创建映射信息: key就是 节点的key属性值 + value是 该节点在 新数组里的位置索引

      - 遍历旧的一组子节点里 剩余未处理的节点i，即起止范围是 [oldStart, oldEnd]的节点 - 拿旧节点的key，去映射表里查找同样的key对应的 新值位置k
        - 找到了k，说明节点可复用==> patch()新旧节点 + source[k - newStart] = i
        - 没找到k, 说明该节点是 多余旧节点==> unmount()即可

  - 确定哪些节点需要移动： moved表示变量 + pos存储最大索引位置

  - 删除多余旧节点： 如果遍历旧节点过程中，已更新的数量 > 剩余新节点需要更新的数量，说明剩下的旧节点都是多余的，需要通过unmount()删除

  - 处理 需要移动位置的节点


3 快速Diff算法的 执行流程是:

```js
// S1 初次渲染
renderer.render(vnode, container)==>
  - patch(oldVnode, newVnode, contain, anchor): 递归函数_ 挂载/更新Vnode ==>
    - mountElement(vnode, container, anchor)==>
      - setElementText(vnode.children) / patch(null, child, parentEl)
      - patchProps(vnode.el, key, null, vnode.props[key])
      - insert(vnode.el, parentEl, anchor)
       
  - container._vnode = vnode
 
       
// S2.1 更新节点
renderer.render(vnode, container)==>
  - patch(oldVnode, newVnode, contain, anchor): 递归函数_ 挂载/更新Vnode ==>
    - oldVnode和newVnode的类型不一样: unmount(old) + mountElement()

    - patchElement(oldVnode, newVnode)
      - patchProps(): 更新props属性
      - patchChildren(oldVnode, newVnode, parentEl): 更新子节点
        - 新节点的子节点是文本节点: 【unmount(child)】 + setElementText(child)
        - 新节点的子节点是null:【unmount(child)】 + setElementText('')
        - 新节点的子节点是 数组子节点: patchKeyedChildren(): 快速Diff算法

// S2.2 DIFF算法之 快速Diff算法
patchKeyedChildren(n1, n2, parentEl)
  - 1 更新相同的前缀节点: patch() + 更新新旧子节点的共同头指针j
  - 2 更新相同的后缀节点: patch() + 更新 新&旧 子节点的尾索引 newEnd & oldEnd

  - 3 经过 相同前缀&后缀处理，如果此时旧子节点都被处理完 + 有剩余 新子节点:
    - 依次挂载[j, newEnd]之间的子节点: patch(null, newChild, parentEl, anchor)

  - 4 经过 前缀&后缀处理，如果此时新子节点都被处理完 + 有剩余 旧子节点:
    - 依次删除[j, oldEnd]之间的子节点: unmount(oldChild)

  - 5 经过 相同前缀&后缀处理，新旧子节点都还有剩余:
    - S1 通过上面定义的 j、oldEnd、newEnd，定义要处理的 新旧头尾子节点索引:   
        oldStart&oldEnd + newStart&newEnd
      获取 新的子节点中 剩余未处理的 节点数量: count
      定义 已处理过的新的子节点数量: patched

    - S2 构建 { 新子节点的key: 在[newStrat, newEnd]范围里的idx} 的映射关系

    - S3 遍历[oldStart, oldEnd]范围里 所有这些未处理的旧节点
      - S4.1 通过patched计数 已经处理了的 新子节点
        - S5 通过 oldVnode.key在 key_index映射里 查找相同key值的 新节点的索引值k
          - S6.1 k存在，说明新旧节点可复用：
            - patch()新旧节点 + 更新已处理过的 新节点值 patched++
            - 通过 source[k-newStart]找到 source里对应该新节点的 位置索引，并让它的值等于 旧节点位置索引i
            - 更新当前的新节点在source位置的 最大索引值 pos = k
            - 后续里 如果有新节点对应的 k < pos, 说明这个节点在旧数组里的顺序是靠后的，但是在新数组里 却变成了靠前，所以需要标识 有需要移动的节点 moved

          - S6.2 k不存在，说明改旧节点 无可复用的新节点：umount(oldVNode)

      - S4.2 如果patched计数已经超过了需要处理的新节点数量count,说明剩下的旧节点一定都是冗余的，直接删除即可:  unmount(oldVNode) 

    - S7 如果moved为true，说明有需要移动的节点，移动这些节点到正确位置
      - 获取 最长递增子序列中的元素 在source数组中的 位置索引: seq = lis(source)
        索引s: 指向 最长递增子序列seq中的 最后一个元素 seq.length - 1
        索引i: 指向新的一组子节点中的 最后一个节点 count - 1

      - 通过i 倒序遍历 新的一组子节点中的节点，每一轮 i--
        - source[i] === -1,说明在旧的中无对应的，是新增节点: patch挂载
        - i !== seq[s]，说明该节点需要移动，通过insert()进行移动

        - i === seq[s]，说明该节点不需要移动，只需要让s指针向上移动即可    
```

具体代码，见[实现快速DIFF算法 code11.1](./code/code-11.1.html)


### 4 diff 算法小结

1 各类 diff算法的基本思路都是：
  - S1 优先寻找 不需要移动+同时可复用的 节点: 只需要直接 patch() 更新节点即可
  - S2 确定 需要移动 + 但可复用 的节点: patch() + 通过insert()进行移动插入
  - S3 确定 新增节点:   通过 patch()  挂载 新节点
  - S4 确定 多余旧节点: 通过 unmount() 卸载 旧节点


## 四 参考文档

[01 Vue设计与实现 第7-11章] (/): 直接参考文档，写的非常好

[02 深入浅出虚拟DOM和Diff算法](https://juejin.cn/post/7010594233253888013): 解释了key的作用

[03 搞定虚拟DOM](https://juejin.cn/post/6997579802215448606): 介绍了一些vnode类型的作用

[04 Vue核心之虚拟DOM](https://juejin.cn/post/6844903895467032589): 内容比较全面