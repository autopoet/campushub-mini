<template>
  <view class="publish-page">
    <view class="safe-header">
      <view class="title">{{ isEdit ? '编辑学习贴纸' : '发布学习贴纸' }}</view>
      <view class="subtitle">寻找志同道合的学霸搭子</view>
    </view>

    <!-- 便利贴预览区 -->
    <view class="preview-area">
      <view class="sketch-card" :style="{ backgroundColor: currentColor }">
        <view class="urgent-sticker" v-if="formData.urgentRole">急缺: {{ formData.urgentRole }}</view>
        <textarea 
          class="sketch-input" 
          v-model="formData.content" 
          placeholder="想要找个什么样的学习搭子？在这里写下你的需求..." 
          maxlength="100" />
        <view class="sketch-footer">
          <text class="school-tag">@ {{ userStore.userInfo?.school || '学霸认证中' }}</text>
          <text class="count">{{ formData.content.length }}/100</text>
        </view>
      </view>
    </view>

    <!-- 配置面板 -->
    <view class="config-panel">
      <view class="panel-item">
        <view class="label">选择领域</view>
        <view class="pills-box">
          <view 
            v-for="cat in categories" 
            :key="cat.name" 
            @click="selectCategory(cat)"
            :class="['pill', { active: currentCategory === cat.name }]"
            :style="{ backgroundColor: currentCategory === cat.name ? cat.color : '#f8f8f8' }">
            {{ cat.label }}
          </view>
        </view>
      </view>

      <view class="panel-item">
        <view class="label">急缺搭子角色 (选填)</view>
        <input 
          class="soft-input" 
          v-model="formData.urgentRole" 
          placeholder="如：后端/英语口语/考研同伴" 
          maxlength="10" />
      </view>

      <view class="action-zone">
        <button class="push-btn" :loading="submitting" @click="handlePublish">
          {{ isEdit ? '更新贴纸' : '正式贴出' }}
        </button>
        <view class="back-text" @click="goBack">返回广场</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const submitting = ref(false)
const isEdit = ref(false)
const targetId = ref('')

const categories = [
  { name: 'COMPETITION', label: '竞赛项目', color: '#E0F2FE' }, 
  { name: 'POSTGRAD', label: '考研上岸', color: '#FDF2F8' },    
  { name: 'CIVIL', label: '考公考编', color: '#F0FDF4' },       
  { name: 'DAILY', label: '日常学习', color: '#FEFCE8' }        
]

const currentCategory = ref('COMPETITION')
const currentColor = ref('#E0F2FE')

const formData = reactive({
  content: '',
  urgentRole: ''
})

const selectCategory = (cat: any) => {
  currentCategory.value = cat.name
  currentColor.value = cat.color
}

const handlePublish = async () => {
  // 1. 拦截：如果自己的联系方式不全，提示去补全
  if (!userStore.isContactComplete) {
    uni.showModal({
      title: '开启学习名片',
      content: '为了让寻找搭子的校友能联系上你，请先补全一种联系方式',
      confirmText: '去补全',
      success: (res) => {
        if (res.confirm) uni.navigateTo({ url: '/pages/register/register' })
      }
    })
    return
  }

  if (!formData.content) {
    uni.showToast({ title: '写点想说的吧', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const db = wx.cloud.database()
    
    const payload = {
      category: currentCategory.value,
      content: formData.content,
      urgentRole: formData.urgentRole || '未填',
      color: currentColor.value,
      publisherName: userStore.userInfo?.nickname || '校友',
      publisherAvatar: userStore.userInfo?.avatarUrl || '',
      school: userStore.userInfo?.school || '未知学校',
      createTime: db.serverDate()
    }

    if (isEdit.value) {
      await db.collection('teams').doc(targetId.value).update({ data: payload })
      uni.showToast({ title: '已更新！', icon: 'success' })
    } else {
      await db.collection('teams').add({
        data: {
          ...payload,
          pokesCount: 0
        }
      })
      uni.showToast({ title: '贴出成功！', icon: 'success' })
    }
    
    setTimeout(() => uni.navigateBack(), 1500)
  } catch (e) {
    console.error('Publish Error:', e)
    uni.showToast({ title: '网络繁忙，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

onLoad(async (options) => {
  if (options?.id) {
    isEdit.value = true
    targetId.value = options.id
    // 如果是编辑模式，拉取原数据
    const db = wx.cloud.database()
    const { data } = await db.collection('teams').doc(options.id).get()
    if (data) {
      formData.content = data.content
      formData.urgentRole = (data.urgentRole === '未填' || !data.urgentRole) ? '' : data.urgentRole
      currentCategory.value = data.category
      currentColor.value = data.color
    } else {
      uni.showToast({ title: '贴纸不存在', icon: 'none' })
      setTimeout(() => uni.navigateBack(), 1000)
    }
  }
})
</script>

<style lang="scss" scoped>
.publish-page {
  min-height: 100vh; background: #ffffff; padding: 100rpx 48rpx;
}
.safe-header {
  margin-bottom: 60rpx;
  .title { font-size: 48rpx; font-weight: 900; color: #1a1a1a; letter-spacing: 2rpx; }
  .subtitle { font-size: 26rpx; color: #9ca3af; margin-top: 15rpx; }
}
.preview-area {
  display: flex; justify-content: center; margin-bottom: 70rpx;
}
.sketch-card {
  width: 100%; border-radius: 32rpx; padding: 48rpx; background: #E0F2FE;
  box-shadow: 20rpx 20rpx 60rpx rgba(0,0,0,0.04); position: relative;
  display: flex; flex-direction: column; justify-content: space-between;
  min-height: 400rpx; border-bottom: 8rpx solid rgba(0,0,0,0.1);
  .urgent-sticker {
    position: absolute; top: 30rpx; right: -20rpx; background: #1a1a1a; color: #fff; padding: 8rpx 30rpx; transform: rotate(15deg); font-size: 20rpx; font-weight: 900; border-radius: 8rpx;
  }
  .sketch-input {
    width: 100%; height: 260rpx; font-size: 40rpx; font-weight: 800; color: #111; line-height: 1.4;
  }
  .sketch-footer {
    display: flex; justify-content: space-between; align-items: center;
    .school-tag { font-size: 24rpx; color: #333; font-weight: 900; opacity: 0.8; }
    .count { font-size: 22rpx; color: #888; }
  }
}
.config-panel {
  .panel-item {
    margin-bottom: 50rpx;
    .label { font-size: 28rpx; font-weight: 800; color: #374151; margin-bottom: 25rpx; display: block; padding-left: 10rpx; }
    .pills-box {
      display: flex; flex-wrap: wrap; gap: 20rpx;
      .pill { 
        padding: 16rpx 32rpx; border-radius: 40rpx; font-size: 24rpx; color: #6b7280; transition: all 0.3s;
        &.active { color: #1a1a1a; font-weight: 900; box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.06); transform: translateY(-2rpx); }
      }
    }
  }
}
.soft-input {
  background: #f9fafb; padding: 30rpx 40rpx; border-radius: 24rpx; font-size: 30rpx; color: #111827;
}
.action-zone {
  margin-top: 100rpx; text-align: center;
  .push-btn { background: #1a1a1a; color: #fff; border-radius: 30rpx; font-weight: bold; font-size: 32rpx; padding: 20rpx 0; box-shadow: 0 25rpx 50rpx rgba(0,0,0,0.15); }
  .back-text { margin-top: 50rpx; font-size: 26rpx; color: #9ca3af; }
  .edit-badge { 
      position: absolute; bottom: 0; right: 0; background: #fff; width: 56rpx; height: 56rpx; 
      border-radius: 18rpx; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 4rpx 15rpx rgba(0,0,0,0.1); border: 2rpx solid #6366f1;
      .gear-icon { font-size: 32rpx; line-height: 1; }
    }
}
</style>
