<template>
  <view class="publish-container">
    <view class="page-header">
      <text class="title">发布动态</text>
      <text class="subtitle">贴一张便利贴到广场上吧</text>
    </view>

    <!-- 实时预览卡片 -->
    <view class="preview-card" :style="{ backgroundColor: currentColor }">
      <view class="card-tag">[ {{ currentCategory }} ]</view>
      <textarea 
        class="content-input" 
        placeholder="写下你想找什么样的搭子..." 
        v-model="formData.content"
        maxlength="100"
        auto-height
      />
      <view class="role-input-wrap">
        <text class="label">寻找对象：</text>
        <input 
          class="role-input" 
          v-model="formData.urgentRole" 
          placeholder="如：Vue前端 / 饭友" 
        />
      </view>
      <view class="card-bottom">
        <text class="school-tag">@ {{ userStore.userInfo?.school || '我的学校' }}</text>
        <text class="word-count">{{ formData.content.length }}/100</text>
      </view>
    </view>

    <!-- 快捷分类选择 -->
    <view class="section-title">选择领域</view>
    <view class="category-list">
      <view 
        v-for="c in categories" 
        :key="c.name" 
        class="cat-item"
        :class="{ active: currentCategory === c.name }"
        @click="selectCategory(c)">
        {{ c.name }}
      </view>
    </view>

    <button class="publish-btn" :loading="submitting" @click="handlePublish">立即贴上墙</button>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const submitting = ref(false)

const categories = [
  { name: 'MATCH', color: '#E9D5FF' },
  { name: 'STUDY', color: '#CFFAFE' },
  { name: 'SPORT', color: '#DCFCE7' },
  { name: 'LIFE', color: '#FEF9C3' },
  { name: 'PLAY', color: '#FFDADA' }
]

const currentCategory = ref('MATCH')
const currentColor = ref('#E9D5FF')

const formData = reactive({
  content: '',
  urgentRole: ''
})

const selectCategory = (c: any) => {
  currentCategory.value = c.name
  currentColor.value = c.color
}

const handlePublish = async () => {
  if (!formData.content || !formData.urgentRole) {
    uni.showToast({ title: '内容及寻找对象不能为空', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const db = wx.cloud.database()
    await db.collection('teams').add({
      data: {
        content: formData.content,
        urgentRole: formData.urgentRole,
        category: currentCategory.value,
        school: userStore.userInfo?.school || '未知学校',
        publisherName: userStore.userInfo?.nickname,
        publisherAvatar: userStore.userInfo?.avatarUrl,
        createTime: db.serverDate(),
        pokesCount: 0
      }
    })

    uni.showToast({ title: '已贴上墙！', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1200)
  } catch (e) {
    console.error('发布失败', e)
    uni.showToast({ title: '发布失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.publish-container {
  min-height: 100vh; background: #fff; padding: 40rpx;
}

.page-header {
  margin-bottom: 50rpx;
  .title { font-size: 44rpx; font-weight: 900; color: #1a1a1a; display: block; }
  .subtitle { font-size: 24rpx; color: #999; margin-top: 10rpx; display: block; }
}

.preview-card {
  border-radius: 32rpx; padding: 50rpx; transition: background 0.3s ease;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.05); position: relative;
  border-bottom: 10rpx solid rgba(0,0,0,0.1);

  .card-tag { font-size: 22rpx; font-weight: 900; letter-spacing: 4rpx; color: rgba(0,0,0,0.4); margin-bottom: 30rpx; }

  .content-input {
    width: 100%; min-height: 250rpx; font-size: 42rpx; font-weight: 800; color: #1a1a1a; line-height: 1.5;
  }

  .role-input-wrap {
    margin-top: 40rpx; display: flex; align-items: center; border-top: 2rpx dashed rgba(0,0,0,0.1); padding-top: 30rpx;
    .label { font-size: 28rpx; font-weight: bold; color: #333; }
    .role-input { flex: 1; font-size: 28rpx; font-weight: bold; color: #764ba2; }
  }

  .card-bottom {
    margin-top: 40rpx; display: flex; justify-content: space-between; align-items: center;
    .school-tag { font-size: 24rpx; font-weight: bold; color: #666; }
    .word-count { font-size: 20rpx; color: #999; }
  }
}

.section-title { font-size: 28rpx; font-weight: bold; color: #999; margin: 60rpx 0 30rpx; padding-left: 10rpx; }

.category-list {
  display: flex; flex-wrap: wrap; gap: 20rpx;
  .cat-item {
    padding: 15rpx 40rpx; background: #f5f5f5; border-radius: 12rpx; font-size: 24rpx; font-weight: bold; color: #666; font-family: monospace;
    &.active { background: #1a1a1a; color: #fff; }
  }
}

.publish-btn {
  margin-top: 80rpx; background: #1a1a1a; color: #fff; height: 110rpx; line-height: 110rpx; border-radius: 55rpx;
  font-size: 32rpx; font-weight: bold; box-shadow: 0 15rpx 40rpx rgba(0,0,0,0.2);
}
</style>
