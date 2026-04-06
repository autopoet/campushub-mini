<template>
  <view class="container">
    <!-- 1. 背景装饰 -->
    <view class="header-bg"></view>

    <!-- 2. 核心资料卡片 -->
    <view class="profile-card animate-slide-up">
      <view class="avatar-box">
        <image class="avatar" :src="displayUser.avatarUrl || defaultAvatar" />
        <view v-if="isMe" class="edit-badge" @click="showEdit = true">⚙️</view>
      </view>
      
      <view class="user-info">
        <text class="nickname">{{ displayUser.nickname || '校友' }}</text>
        <view class="tag-row">
          <text class="tag">{{ displayUser.school || '校友会成员' }}</text>
          <text class="tag gender">{{ displayUser.gender === 1 ? '♂' : '♀' }}</text>
        </view>
        <view class="bio text-pixel">{{ displayUser.bio || '这个校友很勤奋，还没写自我介绍~' }}</view>
      </view>

      <!-- 统计数据 -->
      <view class="stats-row">
        <view class="stat-item">
          <text class="num">{{ myTeams.length }}</text>
          <text class="label">{{ isMe ? '我的发布' : 'Ta的发布' }}</text>
        </view>
        <view class="stat-item">
          <text class="num">{{ myPokes.length }}</text>
          <text class="label">{{ isMe ? '组队记录' : 'Ta的动态' }}</text>
        </view>
      </view>
    </view>

    <!-- 3. 内容切换页签 -->
    <view class="content-section animate-slide-up" style="animation-delay: 0.1s">
      <view class="tabs">
        <text 
          v-for="tab in tabs" 
          :key="tab.key" 
          :class="['tab', { active: currentTab === tab.key }]"
          @click="currentTab = tab.key"
        >{{ tab.label }}</text>
      </view>

      <!-- 动态内容列表 -->
      <scroll-view scroll-y class="list-area">
        <!-- 列表：发布的需求 -->
        <view v-if="currentTab === 'my_teams'" class="item-list">
          <view v-for="item in myTeams" :key="item._id" class="post-item">
            <view class="post-main">
              <text class="post-content">{{ item.content }}</text>
              <view class="post-meta">
                <text class="tag">{{ item.category }}</text>
                <text class="time">{{ formatTime(item.createTime) }}</text>
              </view>
            </view>
            <view v-if="isMe" class="post-action" @click="handleAction(item)">管理</view>
          </view>
        </view>

        <!-- 列表：投递记录 -->
        <view v-if="currentTab === 'my_pokes'" class="item-list">
          <view v-for="item in myPokes" :key="item._id" class="poke-item">
            <view class="poke-header">
              <text class="target-title">针对：{{ item.targetTeamContent }}</text>
              <text :class="['status-tag', item.status]">{{ statusMap[item.status] }}</text>
            </view>
            <view v-if="item.status === 'accepted'" class="contact-box">
              <text class="contact-label">🎉 组队成功！联系方式：</text>
              <text class="contact-val" @click="copy(item.senderInfo?.contacts || '未提供')">{{ item.senderInfo?.contacts }} (点击复制)</text>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="getListData.length === 0" class="empty-box">
          <text class="empty-icon">📂</text>
          <text class="empty-text">这里什么都没有哦</text>
        </view>
      </scroll-view>
    </view>

    <!-- 🌟 内嵌设置模态框 (Drawer 风格) -->
    <view v-if="showEdit" class="edit-overlay" @click.self="showEdit = false">
      <view class="edit-panel animate-panel-up">
        <view class="panel-header">
          <text class="panel-title">设置校友名片</text>
          <text class="close" @click="showEdit = false">×</text>
        </view>
        
        <view class="form-item">
          <text class="label">我想被叫作</text>
          <input class="input" v-model="editForm.nickname" placeholder="输入昵称" />
        </view>
        
        <view class="form-item">
          <text class="label">我的学校</text>
          <input class="input" v-model="editForm.school" placeholder="就读学校" />
        </view>

        <view class="form-item">
          <text class="label">一句话简述</text>
          <textarea class="textarea" v-model="editForm.bio" placeholder="比如：热爱摄影，想找后期搭子..." />
        </view>

        <view class="form-item">
          <text class="label">联系方式 (仅互粉成功后可见)</text>
          <input class="input" v-model="editForm.contacts" placeholder="微信号/手机号" />
        </view>

        <button class="save-btn" @click="saveProfile">同步更新名片</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const currentTab = ref('my_teams')
const myTeams = ref<any[]>([])
const myPokes = ref<any[]>([])
const isMe = ref(true)
const targetUserId = ref('')
const showEdit = ref(false)

const displayUser = ref<any>({})
const editForm = ref({
  nickname: '',
  school: '',
  bio: '',
  contacts: ''
})

const tabs = computed(() => [
  { key: 'my_teams', label: isMe.value ? '我的发布' : 'Ta的需求' },
  { key: 'my_pokes', label: isMe.value ? '组队记录' : 'Ta的动态' }
])

interface StatusMap { [key: string]: string }
const statusMap: StatusMap = {
  pending: '待确认',
  accepted: '组队成功',
  rejected: '已谢绝'
}

const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

onLoad(async (options) => {
  const openid = options?.id
  await userStore.login()
  
  if (openid && openid !== userStore.openid) {
    isMe.value = false
    targetUserId.value = openid
    fetchOtherUser(openid)
  } else {
    isMe.value = true
    displayUser.value = userStore.userInfo
    if (userStore.userInfo) {
      editForm.value = {
        nickname: userStore.userInfo.nickname || '',
        school: userStore.userInfo.school || '',
        bio: userStore.userInfo.bio || '',
        contacts: userStore.userInfo.contacts || ''
      }
    }
    fetchMyData()
  }
})

const fetchOtherUser = async (id: string) => {
  const db = wx.cloud.database()
  const userRes = await db.collection('users').where({ _openid: id }).get()
  if (userRes.data.length > 0) displayUser.value = userRes.data[0]
  
  const postsRes = await db.collection('teams').where({ _openid: id }).get()
  myTeams.value = postsRes.data
}

const fetchMyData = async () => {
  try {
    const db = wx.cloud.database()
    const teamsRes = await db.collection('teams').where({ _openid: userStore.openid }).get()
    myTeams.value = teamsRes.data
    const pokesRes = await db.collection('pokes').where({ senderId: userStore.openid }).get()
    myPokes.value = pokesRes.data
  } catch (e) {
    console.error('获取个人数据失败', e)
  }
}

const saveProfile = async () => {
  if (!userStore.openid) {
    uni.showToast({ title: '登录失效', icon: 'none' })
    return
  }
  uni.showLoading({ title: '正在同步...' })
  try {
    const db = wx.cloud.database()
    // 由于我们在注册时 docID 就是 openid，所以这里直接用它更新
    await db.collection('users').doc(userStore.openid).update({
      data: editForm.value
    })
    // 同步到本地 Store
    userStore.userInfo = { ...userStore.userInfo, ...editForm.value }
    displayUser.value = { ...displayUser.value, ...editForm.value }
    showEdit.value = false
    uni.showToast({ title: '修改成功' })
  } catch (e) {
    console.error('保存失败', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

const getListData = computed(() => currentTab.value === 'my_teams' ? myTeams.value : myPokes.value)

const formatTime = (date: any) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
}

const copy = (str: string) => {
  uni.setClipboardData({ data: str, success: () => uni.showToast({ title: '已复制' }) })
}

const handleAction = (item: any) => {
  uni.showActionSheet({
    itemList: ['编辑内容', '下架需求'],
    success: async (res) => {
      if (res.tapIndex === 1) {
        const db = wx.cloud.database()
        await db.collection('teams').doc(item._id).remove()
        fetchMyData()
        uni.showToast({ title: '已下架' })
      }
    }
  })
}
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background: #F9FAFB; padding-bottom: 50rpx; }

.header-bg {
  height: 400rpx; background: linear-gradient(135deg, #764ba2 0%, #667eea 100%);
  border-radius: 0 0 80rpx 80rpx;
}

.profile-card {
  margin: -200rpx 40rpx 40rpx; background: #fff; border-radius: 50rpx; padding: 60rpx 40rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.05); position: relative; text-align: center;
  
  .avatar-box {
    position: absolute; top: -80rpx; left: 50%; transform: translateX(-50%);
    .avatar { width: 160rpx; height: 160rpx; border-radius: 50%; border: 8rpx solid #fff; box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.1); }
    .edit-badge { 
      position: absolute; bottom: 0; right: 0; background: #fff; width: 50rpx; height: 50rpx; 
      border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx;
      box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.1);
    }
  }

  .user-info {
    margin-top: 60rpx;
    .nickname { font-size: 44rpx; font-weight: 900; color: #1a1a1a; display: block; }
    .tag-row { 
      display: flex; gap: 15rpx; justify-content: center; margin: 15rpx 0; 
      .tag { background: #F3F4F6; color: #6B7280; font-size: 22rpx; padding: 6rpx 20rpx; border-radius: 100rpx; }
      .gender { background: #EEF2FF; color: #4F46E5; }
    }
    .bio { font-size: 26rpx; color: #666; line-height: 1.5; padding: 0 40rpx; }
  }

  .stats-row {
    display: flex; margin-top: 50rpx; border-top: 1px solid #f3f3f3; padding-top: 40rpx;
    .stat-item {
      flex: 1; display: flex; flex-direction: column;
      .num { font-size: 36rpx; font-weight: 800; color: #1a1a1a; }
      .label { font-size: 22rpx; color: #999; margin-top: 5rpx; }
    }
  }
}

.content-section {
  padding: 0 40rpx;
  .tabs {
    display: flex; gap: 40rpx; margin-bottom: 30rpx; padding-left: 10rpx;
    .tab { 
      font-size: 32rpx; color: #9CA3AF; font-weight: bold; position: relative; 
      &.active { 
        color: #1A1A1A; 
        &::after { content: ''; position: absolute; bottom: -10rpx; left: 0; width: 40%; height: 6rpx; background: #764ba2; border-radius: 3rpx; }
      }
    }
  }
}

.list-area { height: 600rpx; }

.post-item {
  background: #fff; border-radius: 30rpx; padding: 30rpx; margin-bottom: 20rpx; display: flex; align-items: center; justify-content: space-between;
  .post-main {
    flex: 1;
    .post-content { 
      font-size: 28rpx; color: #1a1a1a; font-weight: 500; 
      display: -webkit-box; -webkit-box-orient: vertical; 
      -webkit-line-clamp: 2; line-clamp: 2; // 标准兼容性
      overflow: hidden; 
    }
    .post-meta { display: flex; gap: 20rpx; margin-top: 15rpx; .tag { color: #764ba2; font-size: 20rpx; font-weight: bold; } .time { color: #999; font-size: 20rpx; } }
  }
  .post-action { font-size: 24rpx; color: #666; padding: 10rpx 20rpx; background: #F3F4F6; border-radius: 12rpx; }
}

.poke-item {
  background: #fff; border-radius: 30rpx; padding: 30rpx; margin-bottom: 20rpx;
  .poke-header {
    display: flex; justify-content: space-between; align-items: flex-start;
    .target-title { font-size: 28rpx; color: #1a1a1a; flex: 1; margin-right: 20rpx; }
    .status-tag { 
      font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 8rpx; font-weight: bold;
      &.pending { background: #FEF3C7; color: #92400E; }
      &.accepted { background: #D1FAE5; color: #065F46; }
      &.rejected { background: #FEE2E2; color: #991B1B; }
    }
  }
  .contact-box { margin-top: 20rpx; padding: 20rpx; background: #F0FDF4; border-radius: 16rpx; .contact-label { font-size: 22rpx; color: #166534; display: block; } .contact-val { font-size: 24rpx; color: #1A1A1A; font-weight: bold; margin-top: 10rpx; } }
}

.empty-box { text-align: center; padding-top: 100rpx; .empty-icon { font-size: 80rpx; display: block; margin-bottom: 20rpx; } .empty-text { font-size: 24rpx; color: #999; } }

.edit-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(10rpx); z-index: 2000;
  display: flex; align-items: flex-end;
  
  .edit-panel {
    background: #fff; width: 100%; border-radius: 60rpx 60rpx 0 0; padding: 60rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
    
    .panel-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 50rpx;
      .panel-title { font-size: 36rpx; font-weight: 900; color: #1a1a1a; }
      .close { font-size: 50rpx; color: #999; }
    }

    .form-item {
      margin-bottom: 40rpx;
      .label { font-size: 24rpx; color: #666; font-weight: bold; display: block; margin-bottom: 20rpx; }
      .input { background: #F3F4F6; height: 90rpx; border-radius: 20rpx; padding: 0 30rpx; font-size: 28rpx; }
      .textarea { background: #F3F4F6; width: 100%; height: 180rpx; border-radius: 20rpx; padding: 20rpx 30rpx; font-size: 28rpx; box-sizing: border-box; }
    }

    .save-btn {
      background: #1a1a1a; color: #fff; height: 100rpx; border-radius: 30rpx; 
      display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 32rpx;
      box-shadow: 0 20rpx 40rpx rgba(0,0,0,0.1); margin-top: 20rpx;
      &:active { transform: scale(0.98); }
    }
  }
}

@keyframes panelUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
.animate-panel-up { animation: panelUp 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94); }
.animate-slide-up { animation: slideUp 0.5s ease-out both; }
@keyframes slideUp { from { transform: translateY(40rpx); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
</style>
