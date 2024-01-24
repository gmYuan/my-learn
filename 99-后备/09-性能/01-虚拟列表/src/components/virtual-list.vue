<template>
  <!-- 虚拟列表 外层容器 -->
  <div class="viewport" ref="viewport" @scroll="handScroll">
    <!-- 滚动条 -->
    <div class="scroll-bar" ref="scrollBar"></div>
    <!-- 可视区域 -->
    <div class="scroll-list" :style="{transform: `translate3d(0, ${offsetVal}px, 0)`}">
      <div v-for="item of visibleData" :vid="item.id" :key="item.id">
        <slot :back-item="item"></slot>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: "virtual-list",
  props: {
    size: Number, // 每一项的高度
    remain: Number, // 可视区可以看到的列表项个数
    items: Array, // 要渲染的总数据
  },
  data() {
    return {
      startIndex: 0, // 可视列表的开始索引
      endIndex: this.remain, //可视列表的结束索引
      offsetVal: 0,  // 可视区偏移的y轴高度
    };
  },
  computed: {
    // 预先渲染的 前一屏项目个数
    preCount() {
      return Math.min(this.startIndex, this.remain)
    },
    // 预先渲染的 下一屏项目个数
    nextCount() {
      return Math.min(this.remain, this.items.length - this.endIndex)
    },

    // 可视区域数据，其渲染的列表成员 会根据startIndex&endIndex自动更新
    visibleData() {
      const start = this.startIndex - this.preCount
      const end = this.endIndex + this.nextCount
      return this.items.slice(start, end);
    },
  },

  mounted() {
    // S1 设置外层容器 高度
    this.$refs.viewport.style.height = this.remain * this.size + "px";
    // S2 设置滚动条内容 高度
    this.$refs.scrollBar.style.height = this.size * this.items.length + "px";
  },

  methods: {
    handScroll() {
      // S3 目标: 算出 当前容器在y轴滚过了几个item
      // 假设滚过去了3.25个，就应该从第3个item成员开始显示

      // S3.1 获取容器部分已经滚动的数值
      const scrollTop = this.$refs.viewport.scrollTop;
     
      // S3.2 根据滚动数值，计算出 当前应该从第几个item开始渲染
      // 假设滚动了3.2个，那么第3个也应该显示，所以向下取整
      this.startIndex = Math.max(Math.floor(scrollTop / this.size), 0)
      
      // S3.3为了让可视区显示内容高度 === 容器高度，所以endIndex也要更新
      this.endIndex = this.startIndex + this.remain;

      // S3.4 让可视区调整y轴位置，从而 "滑动"已绝对定位的 可视区内容
      // this.offsetVal = this.startIndex * this.size;
      this.offsetVal = this.startIndex * this.size - (this.preCount * this.size);

      console.log('scrollTop', scrollTop)
      console.log('startIndex & endIndex', this.startIndex, this.endIndex)
      
    },
  },
};
</script>

<style lang="less" scoped>
.viewport {
  outline: 1px solid green;
  position: relative;
  overflow-y: scroll;
}

.scroll-list {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  z-index: 2;
}

// 设置mac下滚动条常驻显示
::-webkit-scrollbar {
  -webkit-appearance: none;
  width: 20px;
  background: #f4f4f8;
}

::-webkit-scrollbar-thumb {
  border-radius: 20px;
  height: 60px;
  background-color: rgba(0, 0, 0, 0.5);
  box-shadow: 0 0 1px rgba(255, 255, 255, 0.5);
}
</style>
