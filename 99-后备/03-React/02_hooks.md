## Hooks


## 简易 hooks的实现流程

1. 数据的 含义和结构

1. update
  - 每次调用dispatchAction，就会创建一个 对应的 update对象
  - update对象: { action, next }
  - next指向 所属的同一个Hook的 后续update对象
  - 多个update之间形成了 单向环形链表

2. hook
  - 每次调用useState，就会创建一个 对应的 hook对象
  - hook对象: { queue: { pending }, memoizedState, next }
  - hook.queue.pending永远指向 最后一次dispatchAction创建的 update对象
  - hook.memoizedState保存 hook对应的state计算值
  - 多个hook之间形成了 单向无环链表
 

3. 函数组件对应的 fiber对象
  - fiber对象: { memoizedState, stateNode }
  - memoizedState保存 该FunctionComponent内部所有的 Hooks链表


-------------------------------
3. 功能流程   <br/>

S1 schedule
  - 模拟reactDOM.render
  - 每次render前，都让 WIPHook指向第一个定义的 hook
  - 调用 fiber.stateNode()，即调用 App() ==> 触发render

S2 App
  - 调用 useState

S3 useState
  - mount阶段
    - 创建每个UseXXX 对应的hook对象 {queue, memoizedState, next}，记做hookA/ hooB等
    - 建立fiber.memoizedState 单向链表结构: hookA.next = hookB
    - 更新 WIPHook指向最后的hook: WIPHook = hookB

  - update阶段
    - 从fiber.memoizedState里 第一个hook开始，按序更新 WIPHook指向
    - 循环执行 update里的action, 计算出更新处理的 新值
    - 循环完毕后，重置 hook.queue.pending为null

  - 把本次更新处理后的结果，赋值给hook.memoizedState
  - 返回数组 [ baseState, dispatchAction(hookA.queue) ]


S4 dispatchAction
  - dispatchAction是一个 高级函数，默认传入了 hookA.queue/ hookB.queue
  - 当调用dispatchAction，可以传入一个 action函数

  - 创建本次dispatchAction的 update对象 {action, next}，记做 update1/ update2等
  - 创建 update的单向环状链表结构
  - 创建 update所属hook的 hook.queue.pending, 形成 单向环状链表结构
  - 更新 hook.queue.pending，指向本次创建的 update对象

  - 调用 schedule/App（即触发render）

  
## React中 Hooks相关

1. FnCom在render时，调用的hook 是不同的函数
  - 不同类型的hook，是由不同类型的 dispatcher创建的
  - 当前dispatcher信息，保存在 全局变量 ReactCurrentDispatcher上
  - Fn组件 render前，会根据fiber.current相关信息，判断出是 mount/update阶段，从而赋值 ReactCurrentDispatcher.current


2. dispathcer的使用场景
  - 错误的嵌套使用hook时，调用时出现报错，就是因为dispathcer已经指向了ContextOnlyDispatcher


3. React中 Hook的数据结构
  - hook = { memoizedState, baseState, baseQueue, queuel, next }
  - 不同类型的hook，它的memoizedState保存 不同类型的数据


## useState/useReducer 相关

1. mount阶段



2. update阶段
