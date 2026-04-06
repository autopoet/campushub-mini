<template>
  <view class="profile-container">
    <!-- 头部：用户精选卡片 -->
    <view class="user-header">
      <view class="user-card animate-blur-in">
        <image class="avatar" :src="userStore.userInfo?.avatarUrl || defaultAvatar" />
        <view class="info">
          <text class="nickname">{{ userStore.userInfo?.nickname || '校友' }}</text>
          <text class="school">{{ userStore.userInfo?.school || '学霸认证中' }} · {{ userStore.userInfo?.grade || '年级未知' }}</text>
        </view>
        <view class="edit-icon" @click="goToEdit">⚙️</view>
      </view>
      
      <!-- 数据看板 -->
      <view class="stats-row">
        <view class="stat-item">
          <text class="num">{{ myTeams.length }}</text>
          <text class="label">我的需求</text>
        </view>
        <view class="stat-item">
          <text class="num">{{ myPokes.length }}</text>
          <text class="label">发出申请</text>
        </view>
      </view>
    </view>

    <!-- 选项卡切换 -->
    <view class="tabs">
      <view v-for="t in tabs" :key="t.key" 
            @click="activeTab = t.key"
            :class="['tab-item', { active: activeTab === t.key }]">
        {{ t.label }}
      </view>
    </view>

    <!-- 内容区域 -->
    <scroll-view scroll-y class="content-scroll">
      <!-- 列表 A: 我的发帖 -->
      <view v-if="activeTab === 'posts'" class="list-wrap">
        <view v-for="item in myTeams" :key="item._id" class="mini-post-it" :style="{ backgroundColor: item.color || '#fff' }">
          <view class="post-header">
            <text class="cat-tag">{{ item.category }}</text>
            <text class="delete-btn" @click="handleDelete(item._id)">删除</text>
          </view>
          <text class="post-content">{{ item.content }}</text>
          <text class="post-date">{{ formatDate(item.createTime) }}</text>
        </view>
        <view v-if="myTeams.length === 0" class="empty">还没有发布过需求贴哦</view>
      </view>

      <!-- 列表 B: 我的投递 -->
      <view v-if="activeTab === 'pokes'" class="list-wrap">
        <view v-for="poke in myPokes" :key="poke._id" class="poke-record">
          <view class="poke-info">
            <text class="target-text">我戳了：{{ poke.targetTeamContent }}</text>
            <view class="status-bar">
              <text :class="['status', poke.status]">{{ statusMap[poke.status] }}</text>
              <text v-if="poke.status === 'accepted'" class="view-contact" @click="handleViewContact(poke)">查看联系方式</text>
            </view>
          </view>
          <text class="post-date">{{ formatDate(poke.createTime) }}</text>
        </view>
        <view v-if="myPokes.length === 0" class="empty">还没有给校友投过名片呢</view>
      </view>
    </scroll-view>

    <!-- 底部返回 -->
    <view class="back-home" @click="goHome">回到广场</view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const activeTab = ref('posts')
const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const tabs = [
  { label: '我的发帖', key: 'posts' },
  { label: '我戳过的', key: 'pokes' }
]

interface StatusMap {
  [key: string]: string;
}

const statusMap: StatusMap = {
  pending: '等待响应',
  accepted: '已互换',
  ignored: '已失效'
}

const myTeams = ref<any[]>([])
const myPokes = ref<any[]>([])

const fetchMyData = async () => {
  if (!userStore.openid) await userStore.login()
  const db = wx.cloud.database()
  
  // 1. 获取我的发帖
  const teamsRes = await db.collection('teams')
    .where({ _openid: userStore.openid })
    .orderBy('createTime', 'desc')
    .get()
  myTeams.value = teamsRes.data

  // 2. 获取我的投递记录
  const pokesRes = await db.collection('pokes')
    .where({ senderId: userStore.openid })
    .orderBy('createTime', 'desc')
    .get()
  myPokes.value = pokesRes.data
}

const handleDelete = (id: string) => {
  uni.showModal({
    title: '下架需求',
    content: '确定要删除这张学习便利贴吗？',
    success: async (res) => {
      if (res.confirm) {
        const db = wx.cloud.database()
        await db.collection('teams').doc(id).remove()
        myTeams.value = myTeams.value.filter(t => t._id !== id)
        uni.showToast({ title: '已撤回' })
      }
    }
  })
}

const handleViewContact = (poke: any) => {
  // 这里逻辑可以复用 notifications.vue 的弹窗，由于时间关系先展示 Toast
  uni.showModal({
    title: '校友联系方式',
    content: `对方微信号：${poke.senderInfo?.contacts?.wechat || '暂无'}`,
    showCancel: false
  })
}

const formatDate = (time: any) => {
  if (!time) return ''
  const d = new Date(time)
  return `${d.getMonth() + 1}-${d.getDate()}`
}

const goToEdit = () => uni.navigateTo({ url: '/pages/register/register' })
const goHome = () => uni.reLaunch({ url: '/pages/index/index' })

onMounted(fetchMyData)
</script>

<style lang="scss" scoped>
.profile-container {
  min-height: 100vh; background: #f8fafc; padding: 120rpx 40rpx;
}

.user-card {
  background: #fff; border-radius: 48rpx; padding: 48rpx; display: flex; align-items: center; position: relative;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.03); margin-bottom: 40rpx;
  .avatar { width: 120rpx; height: 120rpx; border-radius: 40rpx; margin-right: 30rpx; background: #eee; }
  .info {
    flex: 1;
    .nickname { font-size: 40rpx; font-weight: 900; color: #1e293b; display: block; }
    .school { font-size: 24rpx; color: #64748b; margin-top: 8rpx; }
  }
  .edit-icon { font-size: 44rpx; color: #94a3b8; }
}

.stats-row {
  display: flex; gap: 30rpx; margin-bottom: 60rpx;
  .stat-item {
    flex: 1; background: #ffffff; border-radius: 32rpx; padding: 30rpx; text-align: center;
    .num { font-size: 42rpx; font-weight: 900; color: #1e293b; display: block; }
    .label { font-size: 22rpx; color: #94a3b8; margin-top: 5rpx; }
  }
}

.tabs {
  display: flex; gap: 40rpx; margin-bottom: 40rpx; padding-left: 10rpx;
  .tab-item {
    font-size: 30rpx; color: #94a3b8; font-weight: bold; position: relative;
    &.active { 
      color: #1e293b; 
      &::after { content: ''; position: absolute; bottom: -10rpx; left: 0; width: 40rpx; height: 6rpx; background: #6366f1; border-radius: 4rpx; }
    }
  }
}

.content-scroll { height: calc(100vh - 750rpx); }

.mini-post-it {
  border-radius: 24rpx; padding: 30rpx; margin-bottom: 24rpx; box-shadow: 0 10rpx 20rpx rgba(0,0,0,0.02);
  display: flex; flex-direction: column; gap: 20rpx;
  .post-header { display: flex; justify-content: space-between; .cat-tag { font-size: 20rpx; font-weight: bold; padding: 4rpx 12rpx; background: rgba(0,0,0,0.05); border-radius: 8rpx; } .delete-btn { font-size: 22rpx; color: #ef4444; font-weight: bold; } }
  .post-content { font-size: 28rpx; font-weight: 800; line-height: 1.4; color: #1e293b; }
  .post-date { font-size: 20rpx; color: #94a3b8; }
}

.poke-record {
  background: #fff; padding: 30rpx; border-radius: 24rpx; margin-bottom: 24rpx;
  display: flex; flex-direction: column; gap: 15rpx;
  .target-text { font-size: 26rpx; color: #475569; font-weight: 600; }
  .status-bar { 
    display: flex; justify-content: space-between; align-items: center;
    .status { font-size: 22rpx; font-weight: bold; &.pending { color: #f59e0b; } &.accepted { color: #10b981; } &.ignored { color: #94a3b8; } }
    .view-contact { font-size: 22rpx; color: #6366f1; font-weight: bold; text-decoration: underline; }
  }
  .post-date { font-size: 20rpx; color: #94a3b8; align-self: flex-end; }
}

.back-home {
  position: fixed; bottom: 80rpx; left: 50%; transform: translateX(-50%);
  background: #1e293b; color: #fff; padding: 25rpx 80rpx; border-radius: 40rpx; font-size: 28rpx; font-weight: bold; box-shadow: 0 20rpx 40rpx rgba(0,0,0,0.2);
}

.empty { text-align: center; color: #94a3b8; font-size: 26rpx; padding-top: 100rpx; }

@keyframes blurIn { from { opacity: 0; filter: blur(10px); transform: translateY(20rpx); } to { opacity: 1; filter: blur(0); transform: translateY(0); } }
.animate-blur-in { animation: blurIn 0.5s ease-out; }
</style>
