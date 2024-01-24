<template>
  <div id="app">
    <!-- state -->
    <section>
      <div>state内的 age是: {{ $store.state.age }}</div>
      <div>
        a/c模块里的 state内的 getter-myAge是: {{ $store.state.a.c.age }}
      </div>
    </section>

    <!-- getters -->
    <section class="mt30">
      <div>getters内的myAge是: {{ $store.getters.myAge }}</div>

      <div>
        a/c模块里的 state内的 getter-myAge是: {{ $store.getters["a/c/myAge"] }}
      </div>

    </section>

    <!-- commit(mutation) -->
    <p>
      <button @click="$store.commit('changeAge', 5)">
        同步更新age: age+5
      </button>

      <button @click="$store.commit('a/c/changeAge', 15)">
        同步更新a/c模块里的age: age+15
      </button>
    </p>

    <!-- dispatch(action) -->
    <p>
      <button @click="$store.dispatch('changeAge', -5)">
        异步更新age: age-5
      </button>
    </p>
  </div>
</template>
<script>
export default {};
</script>


<style>
.mt30 {
  margin: 30px 0;
}
</style>