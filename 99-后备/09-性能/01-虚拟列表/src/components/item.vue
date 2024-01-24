<template>
  <div class="item" v-if="type !== 'noHeight'"> {{ itemInfo.value  }} </div>
  <div class="item2" v-else> {{ itemInfo.value  }} </div>

</template>

<script>
export default {
  name: "my-item",
  props: {
    itemInfo: Object,
    type: String
  },
  
};
</script>

<style lang="less" scoped>
.item {
  height: 40px;
  outline: 1px solid paleturquoise;
}

.item2 {
  padding: 20px 0;
  outline: 1px solid paleturquoise;
}

</style>
