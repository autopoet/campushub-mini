<template>
  <view class="notify-container">
    <view class="page-header">
      <text class="title">消息中心</text>
      <view class="tabs-header">
        <view 
          v-for="t in menuTabs" 
          :key="t.id" 
          @click="activeTab = t.id"
          :class="['menu-tab', { active: activeTab === t.id }]">
          {{ t.label }}
          <view v-if="t.id === 'received' && hasNew" class="dot"></view>
        </view>
      </view>
    </view>

    <!-- 信号列表 -->
    <scroll-view scroll-y class="signal-list" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <view v-if="loading" class="loading-box">
        <text class="loading-text">信号扫描中...</text>
      </view>

      <view v-else-if="displaySignals.length === 0" class="empty-box">
        <text class="empty-icon">📡</text>
        <text class="empty-text">暂时还没有{{ activeTab === 'received' ? '收到' : '发出' }}信号哦</text>
      </view>

      <view v-for="s in displaySignals" :key="s._id" 
            class="signal-card animate-slide-up"
            :class="[s.status]">
        <view class="card-top">
          <image class="sender-avatar" :src="activeTab === 'received' ? s.senderInfo.avatarUrl : (s.receiverAvatar || defaultAvatar)" />
          <view class="sender-meta">
            <view class="name-row">
              <text class="sender-name">{{ activeTab === 'received' ? s.senderInfo.nickname : (s.receiverName || '校友') }}</text>
              <text v-if="activeTab === 'received' && s.senderInfo.school" class="school-tag">@ {{ s.senderInfo.school }}</text>
            </view>
            <text class="time">{{ formatTime(s.createTime) }}</text>
          </view>
          <view class="status-badge" :class="s.status">{{ statusMap[s.status] }}</view>
        </view>

        <view class="target-bubble">
          <text class="target-label">{{ activeTab === 'received' ? '他在你的贴纸留了言：' : '你对他的贴纸感兴趣：' }}</text>
          <text class="target-content">{{ s.targetTeamContent || '已删除的需求贴' }}</text>
        </view>

        <!-- 只有在互通后才显示联系方式 -->
        <view v-if="s.status === 'accepted'" class="contact-card">
          <view class="contact-header">🎉 成功互通！点击复制联系方式</view>
          <view class="contact-row">
            <view v-if="getContacts(s).wechat" class="c-item" @click="copy(getContacts(s).wechat, '微信')">微信: {{ getContacts(s).wechat }}</view>
            <view v-if="getContacts(s).phone" class="c-item" @click="copy(getContacts(s).phone, '手机')">手机: {{ getContacts(s).phone }}</view>
          </view>
        </view>

        <view v-if="activeTab === 'received' && s.status === 'pending'" class="card-actions">
          <button class="accept-btn" @click="handleAccept(s)">回应并解锁</button>
          <text class="ignore-btn" @click="handleIgnore(s)">婉拒</text>
        </view>
        
        <view v-else-if="activeTab === 'sent' && s.status === 'pending'" class="sent-pending-tip">
          <text class="tip-text">信号已发出，等待学霸回复中...</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const activeTab = ref('received')
const menuTabs = [
  { id: 'received', label: '收到的信号' },
  { id: 'sent', label: '我发出的' }
]

interface Signal {
  _id: string;
  senderId: string;
  receiverId: string;
  senderInfo: any;
  receiverName?: string;
  receiverAvatar?: string;
  receiverContacts?: any;
  targetTeamContent: string;
  status: SignalStatus;
  createTime: any;
}

const signals = ref<Signal[]>([])
const loading = ref(true)
const refreshing = ref(false)
const hasNew = ref(false)
const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

type SignalStatus = 'pending' | 'accepted' | 'ignored'

const statusMap: Record<SignalStatus, string> = {
  pending: '未响应',
  accepted: '成功互通',
  ignored: '已婉拒'
}

const displaySignals = computed(() => {
  return signals.value.filter(s => {
    if (activeTab.value === 'received') return s.receiverId === userStore.openid
    return s.senderId === userStore.openid
  })
})

const fetchSignals = async () => {
  loading.value = true
  try {
    const db = wx.cloud.database()
    const _ = db.command
    // 同时查收到的和发出的
    const { data } = await db.collection('pokes')
      .where(_.or([
        { receiverId: userStore.openid },
        { senderId: userStore.openid }
      ]))
      .orderBy('createTime', 'desc')
      .get()
    
    signals.value = data as unknown as Signal[]
    hasNew.value = (data as unknown as Signal[]).some(s => s.receiverId === userStore.openid && s.status === 'pending')
  } catch (e) {
    console.error('Fetch signals error:', e)
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

watch(activeTab, () => {
  // 可以在这里做一些刷新逻辑，或者直接依赖 fetchSignals 下载的所有数据
})

const onRefresh = () => {
  refreshing.value = true
  fetchSignals()
}

const handleAccept = async (s: any) => {
  uni.showLoading({ title: '处理中' })
  try {
    const db = wx.cloud.database()
    // 获取我自己的完整联系方式，方便对方也看到
    await db.collection('pokes').doc(s._id).update({
      data: { 
        status: 'accepted',
        receiverContacts: userStore.userInfo.contacts // 回传自己的联系方式
      }
    })
    s.status = 'accepted'
    uni.showToast({ title: '互通成功', icon: 'success' })
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const handleIgnore = async (s: any) => {
  uni.showModal({
    title: '确认婉拒？',
    content: '极简主义建议：勇敢拒绝不合适的学习搭子',
    confirmText: '婉拒',
    success: async (res) => {
      if (res.confirm) {
        const db = wx.cloud.database()
        await db.collection('pokes').doc(s._id).update({
          data: { status: 'ignored' }
        })
        s.status = 'ignored'
      }
    }
  })
}

const getContacts = (s: any) => {
  if (activeTab.value === 'received') return s.senderInfo.contacts || {}
  return s.receiverContacts || {} // 如果我发出且对方同意了，显示对方回发的联系方式
}

const copy = (val: string, label: string) => {
  if (!val) return
  uni.setClipboardData({
    data: val,
    success: () => uni.showToast({ title: `${label}已复制` })
  })
}

const formatTime = (time: any) => {
  if (!time) return '刚刚'
  const date = new Date(time)
  return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}

onMounted(fetchSignals)
</script>

<style lang="scss" scoped>
.notify-container {
  min-height: 100vh; background: #f9fafb; padding: 100rpx 40rpx;
}

.page-header {
  margin-bottom: 60rpx;
  .title { font-size: 56rpx; font-weight: 900; color: #111827; display: block; margin-bottom: 40rpx; }
  .tabs-header {
    display: flex; gap: 40rpx;
    .menu-tab { 
      font-size: 30rpx; color: #9ca3af; font-weight: 800; position: relative; padding-bottom: 10rpx;
      &.active { 
        color: #111827; 
        &::after { content: ''; position: absolute; bottom: 0; left: 0; width: 40%; height: 6rpx; background: #6366f1; border-radius: 4rpx; }
      }
      .dot { position: absolute; top: -4rpx; right: -20rpx; width: 12rpx; height: 12rpx; background: #ef4444; border-radius: 50%; }
    }
  }
}

.signal-list { height: calc(100vh - 350rpx); }

.signal-card {
  background: #fff; border-radius: 40rpx; padding: 40rpx; margin-bottom: 30rpx;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.02); border: 2rpx solid #f3f4f6; transition: all 0.3s;

  &.pending { border-left: 8rpx solid #6366f1; .status-badge { background: rgba(99,102,241,0.1); color: #6366f1; } }
  &.accepted { .status-badge { background: rgba(16,185,129,0.1); color: #10b981; } }
  &.ignored { opacity: 0.6; filter: grayscale(0.8); .status-badge { background: #f3f4f6; color: #9ca3af; } }

  .card-top {
    display: flex; align-items: center; margin-bottom: 30rpx;
    .sender-avatar { width: 80rpx; height: 80rpx; border-radius: 24rpx; background: #eee; margin-right: 20rpx; }
    .sender-meta {
      flex: 1; .name-row { display: flex; align-items: center; gap: 12rpx; }
      .sender-name { font-size: 32rpx; font-weight: 800; color: #111827; }
      .school-tag { font-size: 20rpx; color: #764ba2; font-weight: bold; background: rgba(118,75,162,0.08); padding: 4rpx 12rpx; border-radius: 8rpx; }
      .time { font-size: 22rpx; color: #9ca3af; margin-top: 4rpx; display: block; }
    }
    .status-badge { font-size: 20rpx; font-weight: 900; padding: 8rpx 20rpx; border-radius: 12rpx; }
  }

  .target-bubble {
    background: #f9fafb; border-radius: 24rpx; padding: 24rpx; margin-bottom: 30rpx;
    .target-label { font-size: 22rpx; color: #9ca3af; display: block; margin-bottom: 8rpx; }
    .target-content { font-size: 26rpx; color: #4b5563; font-weight: 700; line-height: 1.4; }
  }

  .contact-card {
    background: #f0f7ff; border-radius: 24rpx; padding: 24rpx; border: 1rpx dashed #6366f1;
    .contact-header { font-size: 22rpx; color: #6366f1; font-weight: 900; margin-bottom: 16rpx; }
    .contact-row {
      display: flex; flex-direction: column; gap: 10rpx;
      .c-item { font-size: 28rpx; font-weight: 800; color: #1e3a8a; text-decoration: underline; }
    }
  }

  .card-actions {
    display: flex; align-items: center; gap: 20rpx;
    .accept-btn { flex: 2; background: #111827; color: #fff; border-radius: 20rpx; font-size: 26rpx; font-weight: 900; padding: 20rpx 0; }
    .ignore-btn { flex: 1; text-align: center; font-size: 24rpx; color: #9ca3af; font-weight: 800; }
  }
  
  .sent-pending-tip { .tip-text { font-size: 24rpx; color: #6366f1; font-style: italic; } }
}

.empty-box {
  text-align: center; padding-top: 15vh;
  .empty-icon { font-size: 100rpx; display: block; margin-bottom: 30rpx; }
  .empty-text { font-size: 28rpx; color: #9ca3af; }
}

@keyframes slideUp { from { opacity: 0; transform: translateY(20rpx); } to { opacity: 1; transform: translateY(0); } }
.animate-slide-up { animation: slideUp 0.4s ease-out; }
</style>
