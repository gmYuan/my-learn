https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bd8b1c97913d45c79a452b928b754835~tplv-k3u1fbpfcp-jj-mark:3024:0:0:0:q75.awebp#?w=2296&h=1252&s=330469&e=png&b=fdf8f6


https://juejin.cn/column/7140197390996226061





injectEventPluginsByName():
  - 形成 事件名 -> 事件模块插件的映射: namesToPlugins = { SimpleEventPlugin }
  - recomputePluginOrdering()==> 形成插件数组 + publishEventForPlugin()
    - 形成registrationNameModules 和 registrationNameDependencies对象中的映射关系

构建 React合成事件 和 原生事件的对应关系 + 合成事件 和 对应的事件处理插件 关系



----------------------------------------------------------

事件收集

_updateDOMProperties ==> 
  - enqueuePutListener: 
    - listenTo: 注册事件，将事件注册到document上
    - transaction.getReactMountReady().enqueue: 存储事件,放入事务队列中
      - putListener: 生成 listenerBank['onclick'][nodeId] = listener
 

listenTo
  - listenToTopLevel

    - trapCapturedEvent: 注册捕获事件
      - addEventCaptureListener==>  element.addEventListener

    - trapBubbledEvent: 注册冒泡事件
      - addEventBubbleListener==>  element.addEventListener


事件触发:
找到触发事件的最深的一个节点，向上遍历拿到所有的callback放在eventQueue
根据事件类型构建event对象，遍历执行eventQueue

dispatchEventForPluginEventSystem
  - batchedEventUpdates(handleTopLevel, bookKeeping)
    - handleTopLevel
      - runExtractedPluginEventsInBatch
        - extractPluginEvents: 构造合成事件
        - runEventsInBatch: 批处理构造出的合成事件



-----------------------------
React17 && React18