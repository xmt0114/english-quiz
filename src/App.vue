<template>
  <div class="app">
    <header class="app-header">
      <h1 class="app-title">英语问答游戏</h1>
    </header>
    
    <main class="app-content">
      <router-view />
    </main>
    
    <footer class="app-footer">
      <p>&copy; 2025 英语问答游戏</p>
    </footer>
  </div>
</template>

<style>
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.app-header {
  background-color: #4caf50;
  color: white;
  padding: 1rem;
  text-align: center;
}

.app-title {
  margin: 0;
  font-size: 1.5rem;
}

.app-content {
  flex: 1;
  padding: 1rem 0;
}

.app-footer {
  background-color: #f5f5f5;
  padding: 1rem;
  text-align: center;
  font-size: 0.9rem;
  color: #666;
}
</style>
