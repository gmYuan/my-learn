<template>
  <div id="app">

    <!-- 虚拟列表 固定列表高度 -->
    <VirtualList :size="40" :remain="8" :items="items" v-if="isHeight">
      <Item slot-scope="{ backItem }" :item-info="backItem" />
    </VirtualList>

    <VirtualListNoHeight :size="80" :remain="8" :items="items2" :variable="true" v-if="isNoHeight">
      <Item slot-scope="{ backItem }" :item-info="backItem" type="noHeight" />
    </VirtualListNoHeight>

  </div>
</template>

<script>
import VirtualList from "./components/virtual-list.vue";
import VirtualListNoHeight from './components/virtual-list-no-height.vue'
import Item from './components/item.vue'
import Mock from 'mockjs'

// 定高模拟数据
let items = [];
for (let i = 0; i < 1000; i++) {
  items.push({ id: i, value: i });
}

// 不定高模拟数据
let items2 = [];
for (let i = 0; i < 1000; i++) {
  items2.push({ id: i, value: Mock.Random.sentence(5, 50) });
}


export default {
  name: "App",
  components: {
    VirtualList,
    VirtualListNoHeight,
    Item
  },
  data() {
    return {
      items,
      items2,
      isHeight: false,
      isNoHeight: !this.isHeight,
    };
  },
};
</script>

<style lang="less"></style>
