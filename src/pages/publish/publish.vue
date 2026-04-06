<template>
  <view class="container">
    <view class="header-box">
      <text class="page-title">发布学习搭子需求</text>
      <text class="page-desc">贴一张便利贴，开启学习之旅</text>
    </view>

    <view class="form-area">
      <view class="input-card">
        <textarea 
          class="content-input" 
          v-model="content" 
          placeholder="想要找个什么样的学习搭子？在这里写下你的需求..." 
          maxlength="100" />
      </view>

      <view class="btn-group">
        <button class="submit-btn" @click="handleSimplePublish">立即发布</button>
        <button class="back-link" @click="goBack">返回广场</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const content = ref('')

const handleSimplePublish = async () => {
  if (!content.value) {
    uni.showToast({ title: '请输入内容', icon: 'none' })
    return
  }
  
  uni.showLoading({ title: '发布中' })
  try {
    const db = wx.cloud.database()
    await db.collection('teams').add({
      data: {
        content: content.value,
        createTime: db.serverDate(),
        school: '测试院校',
        category: 'DAILY'
      }
    })
    uni.showToast({ title: '成功' })
    setTimeout(() => uni.navigateBack(), 1000)
  } catch (e) {
    uni.showToast({ title: '失败', icon: 'none' })
  }
}

const goBack = () => uni.navigateBack()
</script>

<style scoped>
.container { padding: 40rpx; min-height: 100vh; background: #fff; }
.header-box { margin-bottom: 60rpx; margin-top: 60rpx; }
.page-title { font-size: 48rpx; font-weight: bold; display: block; }
.page-desc { font-size: 26rpx; color: #999; margin-top: 10rpx; display: block; }
.input-card { background: #f5f5f5; border-radius: 20rpx; padding: 30rpx; margin-bottom: 60rpx; }
.content-input { width: 100%; height: 300rpx; font-size: 30rpx; }
.submit-btn { background: #1a1a1a; color: #fff; border-radius: 50rpx; margin-bottom: 30rpx; }
.back-link { background: #f0f0f0; color: #666; border-radius: 50rpx; }
</style>
