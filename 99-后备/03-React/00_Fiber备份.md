## Fiber


### 状态更新流程的总调用栈









---------------------------------
Q0: React17 宏观流程概述

A: <br />
S1 接收 更新请求
  - 每次触发数据更新(setState等)，就相当于 发起一次更新请求
  - React-reconciler 会接收到 更新请求

S2 注册 调度任务
  - React-reconciler 收到请求后, 会去调度中心 scheduler 注册一个新任务task, 即 把更新请求转换成 一个task
  - scheduler通过任务调度循环，确定出优先级最高的 task，返回给 React-reconciler

S3 执行 调度任务
  - react-reconciler接收到task后，触发 fiber构造循环，来构造出最新的 fiber树

S4 渲染 请求结果
  - react-reconciler调用 React-dom提供的API, 把构造出的fiber树 渲染到页面上

小结一下流程为: <br />

S1 发起更新请求 ==> 
S2 reconciler 接收更新请求，包装成更新任务 + 发送到任务中心 ==>
S3 scheduler 接收所有任务 + 通过 调度任务循环，返回优先级最高的 任务 ==> 
S4 reconciler 接收/执行任务 + 通过 Fiber构造循环，构造出最新 Fiber树 ==> 
S5 根据Fiber树，渲染更新 DOM节点


-----------------------------------------------
Q1: 详述 S1发起更新请求

A:  <br />

S1 React渲染入口 ==> 创建 ReactDOMRoot对象

方式1: legacy模式  <br />
a1 ReactDOM.render(<App />, container)
  - 包装函数，调用了 legacyRenderSubtreeIntoContainer

a2 legacyRenderSubtreeIntoContainer
  - legacyCreateRootFromDOMContainer: 创建ReactDOMRoot对象，并赋值给root
  - fiberRoot = root._internalRoot
  - updateContainer: 更新组件

a3 legacyCreateRootFromDOMContainer
  - 包装函数，调用了 createLegacyRoot

a4 createLegacyRoot
  - return new ReactDOMBlockingRoot: 真正创建 ReactDOMRoot对象


方式2: Concurrent模式  <br />
a1 ReactDOM.createRoot(container).render(<App />)
  -  return new ReactDOMRoot: 直接真正创建了 ReactDOMRoot对象


S2 创建fiberRoot对象的前置准备 + 自定义 ReactDOMRoot的原型对象 

a1 ReactDOMRoot / ReactDOMBlockingRoot内部逻辑
  - this._internalRoot = createRootImpl(xx): 创建fiberRoot对象, 并将其挂载到this._internalRoot上 

a2 定义 ReactDOMRoot/ReactDOMBlockingRoot .prototype.render / unmount
  - 在 ReactDOMRoot对象的 原型上，定义了render/unmount
  - 在render/unmount内部，调用 updateContainer进行更新

  
S3 真正创建 fiberRoot对象 + 准备创建 HostRootFiber

a1 createRootImpl内部逻辑
  - createContainer: 创建 fiberRoot的容器函数，并赋值给root
  - markContainerAsRoot: 标记dom对象, 把dom和fiber对象关联起来
  - return root: 返回fiberRoot对象

a2 createContainer内部逻辑
  - return createFiberRoot: 还是 创建fiberRoot对象的 容器函数

a3 createFiberRoot内部逻辑
  - new FiberRootNode: 真正创建了 fiberRoot对象, 并赋值给 root
  - createHostRootFiber: 准备创建 HostRootFiber, 并赋值给 uninitializedFiber
  - root.current = uninitializedFiber + uninitializedFiber.stateNode = root: 创建fiberRoot 和 rootFiber 互相关联
  - initializeUpdateQueue: 初始化HostRootFiber的updateQueue


S4 真正创建 HostRootFiber对象

a1 createHostRootFiber内部逻辑
  -  return createFiber(HostRoot, null, null, mode): createFiber的包装函数

a2 createFiber内部逻辑
  - todo 待补充，应该是创建了一个 Fiber节点对象


经过S1～S4步骤后，此时在内存中，创建的React对象之间关系为

legacy:
![legacy时3个对象间关系](./img/01_Fiber/01_legacy%E6%97%B63%E4%B8%AA%E5%AF%B9%E8%B1%A1%E9%97%B4%E5%85%B3%E7%B3%BB.png)

concurrent:
![concurrent时3个对象间关系](./img/01_Fiber/01_concurrent%E6%97%B63%E4%B8%AA%E5%AF%B9%E8%B1%A1%E9%97%B4%E5%85%B3%E7%B3%BB.png)


S5 在创建完3个对象后，执行更新逻辑， 即ReactDOMRoot.render

a1 legacyRenderSubtreeIntoContainer / ReactDOMRoot.render内部逻辑
  - 在内部，都调用了updateContainer

a2 updateContainer内部逻辑
  - requestUpdateLane(rootFiber): 获取当前时间戳 + 计算本次更新的优先级
  - createUpdate: 根据车道优先级, 创建update对象
  - enqueueUpdate: 把update对象 加入到 fiber.updateQueue.pending队列
  - scheduleUpdateOnFiber(rootFiber, lane, eventTime): 真正发起了 更新请求


以上S1~S5的步骤，用流程图表示为

![发起请求时的入口](./img/01_Fiber/01_%E5%8F%91%E8%B5%B7%E8%AF%B7%E6%B1%82%E5%85%A5%E5%8F%A3.png)


总结流程为
S1 发起更新请求
  - a1: 构造3个全局对象，并创建对象间关系
  - a2: 通过 updateContainer ==> scheduleUpdateOnFiber，真正发起了更新请求


-----------------------------------------------
Q2:详述 S2 reconciler接收更新请求，包装成更新任务 + 发送到任务中心

A:  <br />

S1 scheduleUpdateOnFiber
  - 标记优先级: root = markUpdateLaneFromFiberToRoot(fiber, lane)
  - 某些情况下 直接进行fiber构造: performSyncWorkOnRoot()
  - 某些情况下 直接进行手动更新: flushSyncCallbackQueue()
  - 某些情况下 构造任务调度: ensureRootIsScheduled()

S2 ensureRootIsScheduled: 注册更新任务
  - 判断是否需要注册新的调度;
  - 注册更新任务的性能优化: 
    1. 节流: 如果新旧任务 更新的优先级相同，就直接return，无需注册新task

  - 注册调度任务
    1. scheduleCallback(xxxPriority, performSyncWorkOnRoot.bind())
    2. scheduleCallback(xxxPriorityLevel,performConcurrentWorkOnRoot.bind())

  - 更新标记: root.callbackPriority + root.callbackNode

S3 scheduleCallback: 包装函数
  - 包装函数，调用了 unstable_scheduleCallback(priorityLevel, cb, options);

S4 unstable_scheduleCallback: 真正创建 更新任务
  - 根据传入的优先级, 设置任务的过期时间: expirationTime
  - 创建新任务: newTask
  - 加入任务队列: push(taskQueue, newTask);
  - 请求调度 ==> requestHostCallback(flushWork);


总结流程为
S2 reconciler接收更新请求，包装成更新任务 + 发送到任务中心
  - a1: 接收到请求，创建 调度任务 + 把任务 加入到任务队列
  - a2: 发送任务到任务中心 ==> requestHostCallback(flushWork)

-----------------------------------------------
Q3:详述 S3 scheduler接收所有任务 + 通过 调度任务循环，返回优先级最高的 任务

A:  <br />

S1 scheduler接收任务: requestHostCallback(flushWork);

S2 requestHostCallback: 任务调度中心
  - scheduledHostCallback = callback
  - port.postMessage ==> 订阅发布 ==> performWorkUntilDeadline
  
  - performWorkUntilDeadline: hasMoreWork = scheduledHostCallback()
  - 如果还有剩余任务, 就继续 发起新的发布请求 + 如果没有，就正常退出


任务调度中心的图示为:
![任务调度图](./img/01_Fiber/03_%E4%BB%BB%E5%8A%A1%E8%B0%83%E5%BA%A6%E5%9B%BE.png)

S3 flushWork
  - 做好全局标记, 表示现在已经进入调度阶段
  - 循环消费队列： return workLoop()
  - 还原全局标记

S4 workLoop
  - 获取队列中的第一个任务:  currentTask = peek(taskQueue)
  - 时间切片: shouldYieldToHost()
  - 执行回调: continuationCallback = callback();
  - 递归执行: continuationCallback && currentTask.callback = continuationCallback;

  - 把currentTask移出队列: pop(taskQueue)
  - 更新currentTask: currentTask = peek(taskQueue);

S4.2 shouldYieldToHost: 判断当前task是否让出 给主线程
  - currentTime >= deadline(currentTime + yieldInterval)
  - maxYieldInterval
  - needsPaint


总结流程为
S3 scheduler接收所有任务 + 通过 调度任务循环，返回优先级最高的 任务
  - a1: 任务调度中心 通过订阅发布，每次发布了新任务，就执行订阅回调 flushWork
  - a2: flushWork创建一个 调度任务循环 WorkLop
  - a3: WorkLop每次都会挑选出 优先级最高的task，并执行其 task.callback
  - a4: task.callback，即是在 S2中传入的
    performSyncWorkOnRoot / performConcurrentWorkOnRoot

S2~S3的循环图示为:
![两大循环图](./img/01_Fiber/02_%E5%BE%AA%E7%8E%AF%E5%9B%BE.png)



--------------------
Q4:详述S4 reconciler接收/执行任务 + 通过 Fiber构造循环，构造出最新 Fiber树 

A: <br />

初次渲染时的构造过程: <br />

S1 performSyncWorkOnRoot
  - 获取本次render的优先级: renderLanes = getNextLanes();
  - 从root节点开始, 至上而下更新: exitStatus = renderRootSync(root, lanes);
  - 将最新的fiber树 挂载到root.finishedWork节点上
  - 进入commit阶段: commitRoot(root)


S2 renderRootSync
  - 更新executionContext: executionContext |= RenderContext;
  - 如果fiberRoot变动/update.lane变动, 都会刷新栈帧, 丢弃上一次渲染进度:  prepareFreshStack(root, lanes)

  - 循环执行 workLoopSync()
  - render结束后，重置全局变量

S3.1 prepareFreshStack(root, lanes)
  - 重置FiberRoot对象上的属性
  - 给HostRootFiber对象创建一个alternate, 并将其设置成全局 workInProgress
  - 重置全局变量

S3.2 workLoopSync
  - 包装函数，调用了 performUnitOfWork(workInProgress)


S4 performUnitOfWork(unitOfWork)
  - 双缓冲技术: workInProgress 和 current
  - 递阶段: next = beginWork()
  - 归阶段: completeUnitOfWork(unitOfWork);

S4.1 beginWork(current, unitOfWork, subtreeRenderLanes)
  - 设置workInProgress优先级为 NoLanes(最高优先级)
  - 根据workInProgress节点的类型, 使用 不同的updateXXX 创建出子节点

S4.2 completeUnitOfWork(unitOfWork)
  - 创建DOM实例 + 为DOM节点设置属性/绑定事件: completeWork 
  - 把 当前fiber对象的副作用队列(firstEffect和lastEffect)，添加到 父节点的副作用队列之后, 更新父节点的firstEffect和lastEffect指针
  - 识别 beginWork阶段设置的fiber.flags, 判断 当前fiber是否有副作用(增/删/改), 如果有, 需要将 当前fiber加入到父节点的effects队列, 等待commit阶段处理


S5.1 updateXXX 函数
  - 获取下级 ReactElement对象 ==> 调用reconcileChildren 创建fiber节点
  - 在fiber节点上 挂载状态数据 ==> fiber.memoizedState / fiber.stateNode
  - 在fiber节点上 挂载操作标志 ==> fiber.flags


S5.2 completeWork(current,workInProgress,renderLanes)
  - 创建DOM对象:  createInstance()
  - 把子树中的DOM对象append到本节点的DOM对象之后: appendAllChildren()
  - 设置DOM对象的属性, 绑定事件等: finalizeInitialChildren()
  - 设置 fiber.flags标记(Update): markUpdate(workInProgress)
  - 设置 fiber.flags标记(Ref): markRef(workInProgress)








## 参考文档

01 [React技术揭秘](https://react.iamkasong.com/)

02 [图解Fiber](https://7kms.github.io/react-illustration-series/)
