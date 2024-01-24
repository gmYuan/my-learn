<template>
  <div class="shard-list" ref="shard"></div>
</template>

<script>
export default {
  name: "shard-list",
  data() {
    return {
      total: 1000,
      index: 0,
      id: 0,
    };
  },
  created() {
    this.$nextTick(() => {
      this.load();
    });
  },
  methods: {
    load() {
      this.index += 50;
      if (this.index < this.total) {
        const that = this;
        setTimeout(() => {
          for (let i = 0; i < 50; i++) {
            let li = document.createElement("li");
            li.innerHTML = that.id++;
            that.$refs.shard.appendChild(li);
          }
        }, 0);
        this.load();
      }
    },
  },
};
</script>

<style lang="scss"></style>
