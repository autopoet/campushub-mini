<template>
  <view class="content">
    <!-- 状态加载遮罩 -->
    <view v-if="!userStore.isLogin || !userStore.isRegistered" class="loading-mask">
      <view class="loader"></view>
      <text class="loading-text">环境初始化中...</text>
    </view>

    <view v-else>
      <image class="logo" src="/static/logo.png" />
      <view class="text-area">
        <text class="title">{{ title }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watchEffect } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const title = ref('校园组队大厅')

// 核心逻辑：强拦截
onShow(() => {
  checkUser()
})

const checkUser = () => {
  // 如果用户已登录但未注册，跳转到注册页
  if (userStore.isLogin && !userStore.isRegistered) {
    uni.reLaunch({
      url: '/pages/register/register'
    })
  }
}

// 监听状态变化（防止初始化场景下的延迟）
watchEffect(() => {
  if (userStore.isLogin && !userStore.isRegistered) {
    checkUser()
  }
})
</script>

<style scoped>
.content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
}

.loading-mask {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.loader {
  width: 48px;
  height: 48px;
  border: 5px solid #667eea;
  border-bottom-color: transparent;
  border-radius: 50%;
  display: inline-block;
  box-sizing: border-box;
  animation: rotation 1s linear infinite;
}

.loading-text {
  margin-top: 30rpx;
  font-size: 28rpx;
  color: #888;
}

@keyframes rotation {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.logo {
  height: 200rpx;
  width: 200rpx;
  margin-top: 100rpx;
  margin-bottom: 50rpx;
}

.text-area {
  display: flex;
  justify-content: center;
}

.title {
  font-size: 36rpx;
  color: #333;
  font-weight: 600;
}
</style>
