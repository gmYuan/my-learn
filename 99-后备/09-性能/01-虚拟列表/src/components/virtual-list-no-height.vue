<template>
  <!-- 虚拟列表 外层容器 -->
  <div class="viewport" ref="viewport" @scroll="throttleFn">
    <!-- 滚动条 -->
    <div class="scroll-bar" ref="scrollBar"></div>
    <!-- 可视区域 -->
    <div
      class="scroll-list"
      :style="{ transform: `translate3d(0, ${offsetVal}px, 0)` }"
    >
      <div
        v-for="item of visibleData"
        :vid="item.id"
        :key="item.id"
        ref="items"
      >
        <slot :back-item="item"></slot>
      </div>
    </div>
  </div>
</template>

<script>
import throttle from 'lodash/throttle'


export default {
  name: "virtual-list",
  props: {
    size: Number, // 每一项的高度
    remain: Number, // 可视区可以看到的列表项个数
    items: Array, // 要渲染的总数据
    variable: Boolean, // 是否是非定高
  },
  data() {
    return {
      startIndex: 0, // 可视列表的开始索引
      endIndex: this.remain, //可视列表的结束索引
      offsetVal: 0, // 可视区偏移的y轴高度
    };
  },
  computed: {
    // 预先渲染的 前一屏项目个数
    preCount() {
      return Math.min(this.startIndex, this.remain);
    },
    // 预先渲染的 下一屏项目个数
    nextCount() {
      return Math.min(this.remain, this.items.length - this.endIndex);
    },

    // 可视区域数据，其渲染的列表成员 会根据startIndex&endIndex自动更新
    visibleData() {
      const start = this.startIndex - this.preCount;
      const end = this.endIndex + this.nextCount;
      return this.items.slice(start, end);
    },
  },

  created() {
    this.throttleFn = throttle(this.handScroll, 200, {leading: false})
  },

  mounted() {
    // S1 设置外层容器 高度
    this.$refs.viewport.style.height = this.remain * this.size + "px";
    // S2 设置滚动条内容 高度
    this.$refs.scrollBar.style.height = this.size * this.items.length + "px";

    // S3 先初始化全部数据的位置信息，等滚动时候再去获取dom的真实高度 + 更新滚动条高度
    this.cacheList();
  },

  // S5 dom 更新后，需要用真实dom的高度信息替换掉 初始化时的位置信息，从而更新滚动条高度
  updated() {
    this.$nextTick(() => {
      const dom = this.$refs.items;
      if (!(dom && dom.length > 0)) return;  //没有dom 就返回
      dom.forEach((item) => {
        const { height } = item.getBoundingClientRect(); // 获取每个节点的真实dom高度
        // 更新缓存里面的数据
        const id = item.getAttribute("vid"); // 拿到节点id
        const oldHeight = this.positions[id].height; // 获取缓存数据高度
        const diffence = oldHeight - height;
        if (diffence) {
          //如果高度改变 更新bottom height  top不需要改动
          this.positions[id].height = height;
          this.positions[id].bottom = this.positions[id].bottom - diffence;
          // 前面的节点位置信息变化了，后面依赖它的的top、bottom值也都需要改变
          for (let i = id + 1; i < this.positions.length; i++) {
            if (this.positions[i]) {
              this.positions[i].top = this.positions[i - 1].bottom;
              this.positions[i].bottom = this.positions[i - 1].bottom - diffence;
            }
          }
        }
      });
      // 计算出滚动条的最新高度
      this.$refs.scrollBar.style.height = this.positions[this.positions.length - 1].bottom + "px";
      console.log('滚动条的最新高度', this.$refs.scrollBar.style.height);
    });
  },

  methods: {
    // S3 缓存数据
    cacheList() {
      // 保存数组中每一项的自定义属性: height、top和bottom
      this.positions = this.items.map((item, index) => {
        return {
          height: this.size,
          top: this.size * index,
          bottom: (index + 1) * this.size,
        };
      });
      // console.log("positions", this.positions);
    },

    handScroll() {
      console.log('scroll')
      // S4 目标: 算出 当前容器在y轴滚过了几个item
      // 假设滚过去了3.25个，就应该从第3个item成员开始显示

      // S4.1 获取容器部分已经滚动的数值
      const scrollTop = this.$refs.viewport.scrollTop;

      if (this.variable) {
        // S4.2 通过滚动距离+item项的bottom值，二分查找startIndex
        this.startIndex = this.getStartIndex(scrollTop);
        this.endIndex = this.startIndex + this.remain;

        // S4.3 根据startIndex + preCount，计算出偏移量
        this.offsetVal = this.positions[this.startIndex - this.preCount]
          ? this.positions[this.startIndex - this.preCount].top
          : 0;
      } else {
        // 固定高度的算法
        // S3.2 根据滚动数值，计算出 当前应该从第几个item开始渲染
        // 假设滚动了3.2个，那么第3个也应该显示，所以向下取整
        this.startIndex = Math.max(Math.floor(scrollTop / this.size), 0);

        // S3.3为了让可视区显示内容高度 === 容器高度，所以endIndex也要更新
        this.endIndex = this.startIndex + this.remain;

        // S3.4 让可视区调整y轴位置，从而 "滑动"已绝对定位的 可视区内容
        // this.offsetVal = this.startIndex * this.size;
        this.offsetVal =
          this.startIndex * this.size - this.preCount * this.size;
      }
    },

    getStartIndex(scrollTop) {
      // 二分查找: 当前的滚动距离是 哪一项的bottom
      let start = 0; // 第一个选项
      let end = this.positions.length - 1; // 最后一个选项
      let temp = null;
      while (start <= end) {
        let midIndex = (start + end) >> 1;
        // 中间一项的bootom值
        let midVal = this.positions[midIndex].bottom;
        if (scrollTop === midVal) {
          // 当前滚动距离是这一项的底部，所以显示的应该是它的下一个item项
          return midIndex + 1;
        } else if (scrollTop > midVal) {
          start = midIndex + 1;
          if (temp === null || temp < midIndex) {
            temp = midIndex;
          }
        } else if (scrollTop < midVal) {
          end = midIndex - 1;
          if (temp === null || temp > midIndex) {
            temp = midIndex;
          }
        }
      }
      return temp;
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
