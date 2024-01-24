## Fiber


### 状态更新流程的总调用栈




### 触发更新

1. 触发状态更新的方法有:
  - ReactDOM.render ==> HostRoot组件
  - this.setState / this.forceUpdate   ==> ClassComponent组件
  - useState / useReducer  ==> FunctionComponent组件


### 创建fiberRoot和rootFiber

S1 ReactDOM.render ==> 调用 legacyRenderSubtreeIntoContainer
  - fiberRoot是整个应用的根节点，rootFiber是 要渲染组件 所在组件树的根节点
  - 创建fiberRoot 和 rootFiber的关联==> 调用createFiberRoot


S2 createFiberRoot
  - 创建fiberRoot: 调用 new FiberRootNode()
  - 创建rootFiber: 调用 createHostRootFiber
  - 连接rootFiber与fiberRootNode
  - 初始化updateQueue: 调用 initializeUpdateQueue


### 创建Update对象

1. 生成 update对象的方法
  - 每次状态更新，都会创建一个 保存更新状态相关内容的对象，即Update
  - 在render阶段的beginWork中，会根据Update 计算新的state
  - 所以，每次 触发状态更新的fiber上，就会生成一个 Update对象

2. update
  - HostRoot/Class组件的 update = {lane, tag, payload, callback, next}
  - 每次触发状态更新，就会生成一个update对象，因此可能会同时存在多个update对象
  - 某个Fiber节点上的 多个Update会组成链表，并被包含在fiber.updateQueue中


3. updateQueue
```ts
updateQueue = {
  baseState,  //本次更新前 该Fiber节点的state，Update基于此计算 更新后的state
  firstBaseUpdate,  // 本次更新前该Fiber节点 已保存的Update
  lastBaseUpdate,
  // 触发更新时，产生的Update 会保存在shared.pending中形成 单向环状链表
  // shared.pending会始终指向 最后一个插入的update
  // 在render阶段，这个环会被剪开 并连接在lastBaseUpdate后面
  shared: { pending: null }, 
  // 数组，保存update.callback!== null的 Update
  effects: null
}
```

4. update相关的执行流程

S1 触发更新 ==> 
S2 调用 createUpdate ==> 生成1个/多个 不同优先级的 update对象

S3 调用 enqueueUpdate ==> 
  - update会入队到 fiber.updateQueue中
  - fiber.updateQueue.shared.pending是 一个单向环形链表
  - fiber.updateQueue.shared.pending始终指向 最后一个入队的 update对象，即入队的顺序是 从左到右
  

S4 进入render阶段

S4.1 调用 processUpdateQueue ==>
  - 剪开fiber.updateQueue.shared.pending链表环 + 拼接在fiber.updateQueue.lastBaseUpdate之后
  - 注意，剪开之后的链表头，是之前的右队头（即最早入队的 update）

  - 遍历updateQueue.baseUpdate链表， 以fiber.updateQueue.baseState为初始state，依次reduce每个Update，从而计算出新的state
  - 注意，优先级不足的 update，会被跳过执行


S4.2 state的变化 ==> 生成与上次更新不同的JSX对象 ==> JSX和currentFiber进行Diff比较，从而生成WIP.effectTag ==> 在commit阶段 渲染出新DOM 在页面上



### 从fiber到root

1. markUpdateLaneFromFiberToRoot
  - 从触发状态更新的fiber，一直向上遍历到rootFiber + 返回rootFiber



### 调度更新

1. ensureRootIsScheduled
  - 功能: 通知Scheduler根据更新的优先级，决定以同步/异步方式  调度本次更新
  - 调用  scheduleSyncCallback(level, perform【xxx】WorkOnRoot）





### render阶段

1.整体目标
  - 创建Fiber节点 + 构建Fiber树

----------------
2.函数调用栈
performSyncWorkOnRoot / performConcurrentWorkOnRoot
  - workLoopSync / workLoopConcurrent
    - performUnitOfWork
      - beginWork
        - 复用节点: bailoutOnAlreadyFinishedWork
          - cloneChildFibers
        - 新建节点:不同类型的处理函数, 如 updateHostComponent
          - reconcileChildren
            - mountChildFibers / reconcileChildFibers
                - createFiber

      - completeUnitOfWork
        - completeWork
          - 不同类型的处理函数,如updateHostContainer
            - updateHostComponent
               - mount阶段
                 - createInstance
                   - createElement
                 - appendAllChildren
               - update阶段
                 - updateHostComponent$1 
                   - prepareUpdate
                     - diffProperties


----------------
3.实现流程(do what)

S1 workLoop【xxx】
  - 只要 当前帧还有剩余时间，就调用 performUnitOfWork

S2 performUnitOfWork
  - 从rootFiber开始, 向下深度优先遍历
  - "递"阶段 调用beginWork, 返回值为next + "归"阶段 调用completeUnitOfWork

S3.1 `beginWork`
  - 根据current是否为null, 来区分当前节点是 mount/update阶段
  - 根据变量情况，确定didReceiveUpdate变量值
  - 根据情况，来确定是 复用该fiber节点，还是创建新fiber节点
  - 创建新fiber节点: 根据tag不同, 调用类型处理函数 ==> 调用reconcileChildren
  - 总体功能: 创建并返回了当前fiber的第一个子fiber节点，并作为 下一轮performUnitOfWork的WIP


S4 reconcileChildren
  - 对mount的组件，它会 创建新的子Fiber节点 ==> 调用mountChildFibers
  - 对update的组件，它会通过Diff算法，来更新生成 新的Fiber节点 ==> 调用reconcileChildFibers

S5 mountChildFibers/reconcileChildFibers
  - reconcileChildFiber会给创建的fiber节点 标记上effectTag属性
  - 最后都调用createFiber，从而 创建了新的fiber节点，记做 fiber_1
  - fiber_1赋值给 workInProgress.child

S3.1～S5的流程，图示见下:
![bgeinWork流程图](./img/01_Fiber/01_beginWork.png)


S3.2 `completeUnitOfWork`
  - 构造 effetagList 链表
  - 调用 completeWork


S6 completeWork
  - 根据tag不同, 调用不同的 类型处理函数 ==> 如调用 updateHostContainer

S7 updateHostContainer
  - 根据current和wIP.stateNode 是否为null, 来区分当前节点是 mount/update阶段
  - update阶段: 已有DOM节点，所以主要处理props==> 调用 diffProperties
  - mount阶段: 
    - 为Fiber节点 生成对应的DOM节点  ==> 调用createInstance
    - 把子孙DOM节点 插入 刚生成的DOM节点中 ==> 调用appendAllChildren
    - 把新生成的DOM节点 赋值给fiber.stateNode
    - 处理props

S8 diffProperties
  - 处理props + 处理完的props记做 p = ['id', '2']
  - p会被赋值给 workInProgress.updateQueue
  - 只要存在updateQueue，就会在该WIP.efftag标记上 update标志


S3.2～S8的流程，图示见下:
![completeWork流程图](./img/01_Fiber/02_completeWork.png)


### commit阶段

1.整体目标
  - 根据efftagList(单向链表, 保存了所有 有副作用的Fiber节点)，执行副作用对应的DOM操作
  - 执行某些 生命周期钩子和hook

2. 整体阶段
  - before mutation之前: 变量重置 + 获取到firstEffect
  - before mutation阶段 (执行DOM操作前): 调用部分 生命周期钩子和hook钩子
  - mutation阶段 (执行DOM操作):
  - layout阶段 (执行DOM操作后): 处理useEffect + 执行某些 生命周期钩子和hook


----------------
2.函数调用栈

commitRoot
  - commitRootImpl
    - commitBeforeMutationEffects
      - commitBeforeMutationEffectOnFiber
      - flushPassiveEffects

    - commitMutationEffects
      - commitPlacement
      - commitWork
        - commitHookEffectListUnmount
        - commitUpdate
          - updateDOMProperties

      - commitDeletion

    - commitLayoutEffects
      - commitLayoutEffectOnFiber
      - commitAttachRef
  

----------------
3.实现流程(do what)

S1 commitRootImpl
  - before mutation之前
    - 触发useEffect回调与其他同步任务: 调用 flushPassiveEffects
    - 重置 fiberRoot上的有关变量值, 如 callbackNode/finishedWork
    - 重置优先级 相关变量: 调用 markRootFinished
    - 重置全局变量，如: workInProgress
    - 获取到第一个含有efftag的fiber节点, 并赋值给 firstEffect

  - before mutation阶段
    - 保存之前的优先级，以同步优先级执行，执行完毕后 恢复之前优先级
    - 将当前上下文标记为CommitContext，作为commit阶段的标志
    - 处理focus状态
    - 进入before mutation阶段主函数 ==> 调用commitBeforeMutationEffects

S2.1 commitBeforeMutationEffects
  - 处理DOM节点渲染/删除后的 autoFocus/blu等逻辑
  - 调用 getSnapshotBeforeUpdate生命周期钩子
  - scheduleCallback(NormalSchedulerPriority,flushPassiveEffects): 以某个优先级 异步调度一个回调函数，即异步调用 flushPassiveEffects

S3 flushPassiveEffects
  - 可以通过全局变量rootWithPendingPassiveEffects 获取到 effectList
  - 内部遍历effectList ==> 执行effect回调函数,从而触发了 useEffect回调
  - useEffect异步执行的原因: 主要是防止同步执行时, 阻塞浏览器渲染


S2.2 commitMutationEffects
  - 遍历effectList, 对每个Fiber节点进行处理
  - 根据ContentReset 和 effectTag, 重置文字节点
  - 更新ref
  - 根据effectTag分别调用 对应处理函数: 
    - Placement effect: commitPlacement
    - Update effectTag: commitWork
    - Deletion effectTag: commitDeletion

S4 commitPlacement
  - 功能: 用于处理Placement effect(插入节点)
  - 获取父级DOM节点
  - 获取Fiber节点的 兄弟DOM节点: getHostSibling的执行 很耗时
  - 根据兄弟DOM节点是否存在, 分别调用parentNode.insertBefore / parentNode.appendChild 执行DOM插入操作

S5 commitWork
  - 功能: 用于处理Update effectTag(更新节点)
  - 根据Fiber.tag分别调用 对应处理函数,如commitHookEffectListUnmount /commitUpdate

S5.2 commitHookEffectListUnmount
  - 当fiber.tag为FunctionComponent，会调用commitHookEffectListUnmount
  - 遍历effectList, 执行所有useLayoutEffect hook的 销毁函数

S5.3 commitUpdate
  - 当fiber.tag为HostComponent，会调用commitUpdate
  - 调用updateDOMProperties ==> 把 Fiber.updateQueue对应内容 渲染到页面上

S6 commitDeletion
  - 功能: 用于处理Deletion effectTag(删除节点)
  - 递归调用componentWillUnmount生命周期钩子，从页面移除Fiber节点对应DOM节点
  - 解绑ref
  - 调度useEffect的销毁函数


S2.3 commitLayoutEffects
  - 遍历effectList, 对每个Fiber节点调用 commitLayoutEffects
  - 调用某些 生命周期钩子和hook ==> 调用 commitLayoutEffectOnFiber
  - 赋值ref ==> 调用 commitAttachRef

S7 commitLayoutEffectOnFiber
  - 根据Fiber.tag类型分别调用 对应处理函数
  - 根据current是否存在，分别调用 componentDidMount/ componentDidUpdate
  - 执行 useLayoutEffect的回调函数 ==> commitHookEffectListMount
  - 调度 useEffect的 销毁函数 与 回调函数 ==> schedulePassiveEffects

S8 commitAttachRef
  - 获取DOM实例，更新ref


关于useEffect和useLayoutEffect的执行区别,见下图

![useEffect和useLayoutEffect区别](./img/01_Fiber/03_useEffect.png)