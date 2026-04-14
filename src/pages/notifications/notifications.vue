<template>
  <view class="notify-container">
    <!-- Frosted Glass Header -->
    <view class="ios-header" id="pageHeader" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-top">
        <view class="back-btn" @click="goBack">
          <view class="ios-back-arrow"></view>
        </view>
        <text class="title">消息中心</text>
        <view class="placeholderIcon"></view>
      </view>
      
      <!-- Segmented Control -->
      <view class="segmented-control-wrap">
        <view class="segmented-control">
          <view 
            v-for="t in menuTabs" 
            :key="t.id"
            @click="activeTab = t.id"
            :class="['segment-item', { active: activeTab === t.id }]">
            <text class="seg-text">{{ t.label }}</text>
            <view v-if="t.id === 'received' && hasNew" class="red-dot"></view>
          </view>
          <view class="active-bg" :style="{ left: activeTab === 'received' ? '2px' : 'calc(50% + 1px)' }"></view>
        </view>
      </view>
    </view>

    <!-- Header Spacer to fix the overlap bug -->
    <view :style="{ height: headerTotalHeight + 'px' }"></view>

    <!-- Signal List -->
    <scroll-view 
      scroll-y 
      class="signal-list" 
      refresher-enabled
      :refresher-triggered="refreshing" 
      @refresherrefresh="onRefresh"
      @scroll="closeSwipes">
      
      <view v-if="loading && signals.length === 0" class="loading-box">
        <view class="ios-spinner"></view>
      </view>

      <view v-else-if="displaySignals.length === 0" class="empty-box">
        <view class="empty-icon-styled">
          <view class="wave-circle"></view>
          <view class="dot"></view>
        </view>
        <text class="empty-text">暂时还没有收到伙伴的联系哦</text>
      </view>

      <view v-for="s in displaySignals" :key="s._id" class="swipe-item-outer">
        <!-- Delete action under the card -->
        <view class="swipe-delete-btn" @click="handleDelete(s)">
          <view class="del-icon-css"></view>
          <text class="del-text">移除</text>
        </view>

        <!-- Main Card Wrapper -->
        <view 
          class="signal-card animate-slide-up"
          :class="[s.status, { 'is-swiped': swipedId === s._id }]"
          @touchstart="onTouchStart($event, s._id)"
          @touchend="onTouchEnd($event, s._id)">
          
          <view class="card-top">
            <image class="sender-avatar" :src="activeTab === 'received' ? s.senderInfo.avatarUrl : (s.receiverAvatar || defaultAvatar)" />
            <view class="sender-meta">
              <view class="name-row">
                <text class="sender-name">{{ activeTab === 'received' ? s.senderInfo.nickname : (s.receiverName || '校友') }}</text>
                <view class="school-pill" v-if="activeTab === 'received' && s.senderInfo.school">
                   {{ s.senderInfo.school }}
                </view>
              </view>
              <view class="time-row">
                <view class="dot-icon"></view>
                <text class="time">{{ formatTime(s.createTime) }}</text>
              </view>
            </view>
            <view class="status-indicator" :class="s.status">
              <view class="indicator-dot"></view>
              <text>{{ statusMap[s.status] }}</text>
            </view>
          </view>

          <view class="target-bubble">
            <view class="quote-mark">“</view>
            <text class="target-content">{{ s.targetTeamContent }}</text>
            
            <view v-if="s.applyMsg" class="user-apply-section">
              <view class="msg-header">
                <view class="msg-icon-css"></view>
                <text class="msg-label">附加言</text>
              </view>
              <text class="msg-text">{{ s.applyMsg }}</text>
            </view>
          </view>

          <!-- Interaction logic displayed upon success -->
          <view v-if="s.status === 'accepted'" class="contact-card-modern">
            <view class="contact-header">
              <view class="success-icon"></view>
              <text>契合度 100% · 已开启实时互通</text>
            </view>
            <view class="contact-grid">
              <view v-for="(val, key) in getContacts(s)" :key="key" class="contact-panel-item">
                <view v-if="val" class="c-item-inner" @click="copy(val, key === 'wechat' ? '微信' : key === 'phone' ? '手机' : 'QQ')">
                  <text class="c-label">{{ key === 'wechat' ? '微信' : key === 'phone' ? '手机' : 'QQ' }}</text>
                  <text class="c-val">{{ val }}</text>
                  <view class="copy-hint">复制</view>
                </view>
              </view>
            </view>
          </view>

          <!-- Action Buttons -->
          <view v-if="activeTab === 'received' && s.status === 'pending'" class="card-actions">
            <button class="accept-btn-modern" @click="handleAccept(s)">
              <text>回应信号并解锁</text>
            </button>
            <view class="ignore-trigger" @click="handleIgnore(s)">暂不考虑</view>
          </view>
          
          <view v-else-if="activeTab === 'sent' && s.status === 'pending'" class="sent-pending-footer">
            <view class="loading-dots">
              <view class="dot"></view><view class="dot"></view><view class="dot"></view>
            </view>
            <text class="tip-text">信号在传输中，静候回音</text>
          </view>
        </view>
      </view>
      <view class="footer-padding"></view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
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
  applyMsg?: string;
  status: SignalStatus;
  createTime: any;
}

const signals = ref<Signal[]>([])
const loading = ref(true)
const refreshing = ref(false)
const hasNew = ref(false)
const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const statusBarHeight = ref(0)
const headerTotalHeight = ref(140) // Default starting value

const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.reLaunch({ url: '/pages/index/index' })
  }
}

const calculateHeaderHeight = () => {
  nextTick(() => {
    const query = uni.createSelectorQuery()
    query.select('#pageHeader').boundingClientRect(data => {
      if (data) {
        headerTotalHeight.value = data.height
      }
    }).exec()
  })
}

onMounted(() => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  calculateHeaderHeight()
  fetchSignals()
})

type SignalStatus = 'pending' | 'accepted' | 'ignored'

const statusMap: Record<SignalStatus, string> = {
  pending: '等待处理',
  accepted: '信号对等',
  ignored: '已关闭'
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

const onRefresh = () => {
  refreshing.value = true
  fetchSignals()
}

const handleAccept = async (s: any) => {
  if (!userStore.isProfileComplete) {
    uni.showModal({
      title: '互通前奏',
      content: '请先补全名片信息，以便伙伴能联系到你哦',
      confirmText: '去完善',
      confirmColor: '#000',
      success: (res) => { if (res.confirm) uni.navigateTo({ url: '/pages/profile/profile' }) }
    })
    return
  }
  
  uni.showLoading({ title: '确认对等信号...' })
  try {
    const res = await wx.cloud.callFunction({
      name: 'signalAction',
      data: {
        action: 'accept',
        id: s._id,
        contacts: userStore.userInfo.contacts
      }
    }) as any
    
    if (res.result && res.result.success !== false) {
      s.status = 'accepted'
      uni.showToast({ title: '已开启互通' })
    } else {
      throw new Error(res.result.msg || '操作失败')
    }
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作异常', icon: 'none' })
  }
}

const handleIgnore = async (s: any) => {
  uni.showModal({
    title: '确认忽略？',
    content: '该动作将标记信号为已关闭状态',
    confirmColor: '#8E8E93',
    confirmText: '确认',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '执行中' })
        try {
          const cloudRes = await wx.cloud.callFunction({
            name: 'signalAction',
            data: { action: 'ignore', id: s._id }
          }) as any
          if (cloudRes.result && cloudRes.result.success !== false) {
            s.status = 'ignored'
            uni.showToast({ title: '已标记' })
          }
        } catch (e: any) {}
      }
    }
  })
}

const getContacts = (s: any) => {
  const raw = activeTab.value === 'received' ? s.senderInfo.contacts : s.receiverContacts;
  if (!raw) return {};
  if (typeof raw === 'string') return { wechat: raw }; // Restore legacy string format compatibility
  return raw;
}

const copy = (val: string, label: string) => {
  if (!val) return
  uni.setClipboardData({
    data: val,
    success: () => uni.showToast({ title: '复制成功', icon: 'none' })
  })
}

// Swipe logic
const startX = ref(0)
const startY = ref(0)
const swipedId = ref<string | null>(null)

const onTouchStart = (e: any, id: string) => {
  startX.value = e.touches[0].clientX
  startY.value = e.touches[0].clientY
}

const onTouchEnd = (e: any, id: string) => {
  const endX = e.changedTouches[0].clientX
  const endY = e.changedTouches[0].clientY
  const deltaX = startX.value - endX
  const deltaY = startY.value - endY
  
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 40) {
    if (deltaX > 50) {
      swipedId.value = id
    } else if (deltaX < -50) {
      if (swipedId.value === id) swipedId.value = null
    }
  }
}

const closeSwipes = () => { if (swipedId.value) swipedId.value = null }

const handleDelete = async (s: any) => {
  uni.showModal({
    title: '永久移除',
    content: '确定要把这条信号从现实中抹除吗？',
    confirmColor: '#FF3B30',
    confirmText: '移除',
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '抹除中...' })
        try {
          const cloudRes = await wx.cloud.callFunction({
            name: 'signalAction',
            data: { action: 'delete', id: s._id }
          }) as any
          if (cloudRes.result && cloudRes.result.success !== false) {
            signals.value = signals.value.filter(item => item._id !== s._id)
            swipedId.value = null
            uni.showToast({ title: '已移除', icon: 'none' })
          }
        } catch (e: any) {}
      }
    }
  })
}

const formatTime = (time: any) => {
  if (!time) return '刚刚'
  const date = new Date(time)
  return `${date.getMonth() + 1}.${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
}
</script>

<style lang="scss" scoped>
.notify-container {
  min-height: 100vh; background: #f8f9fa;
}

.ios-header {
  position: fixed; top: 0; left: 0; width: 100%; z-index: 100;
  background: rgba(255, 255, 255, 0.75); backdrop-filter: blur(30px);
  border-bottom: 1rpx solid rgba(0,0,0,0.03);
  
  .header-top {
    height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 40rpx;
    .back-btn { 
      width: 64rpx; height: 64rpx; display: flex; align-items: center;
      .ios-back-arrow { 
        width: 24rpx; height: 24rpx; border-left: 4rpx solid #1a1a1a; border-bottom: 4rpx solid #1a1a1a; 
        transform: rotate(45deg); 
      }
    }
    .title { font-size: 32rpx; font-weight: 800; color: #1a1a1a; letter-spacing: 1rpx; }
    .placeholderIcon { width: 64rpx; }
  }
}

.segmented-control-wrap {
  padding: 10rpx 40rpx 30rpx;
  .segmented-control {
    background: rgba(0, 0, 0, 0.05); border-radius: 20rpx; height: 72rpx;
    position: relative; display: flex; align-items: center; padding: 4rpx;
    
    .segment-item {
      flex: 1; text-align: center; height: 100%; display: flex; align-items: center; justify-content: center;
      position: relative; z-index: 2; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      
      .seg-text { font-size: 26rpx; color: #8E8E93; font-weight: 600; }
      &.active { .seg-text { color: #111; font-weight: 800; } }
      .red-dot { position: absolute; top: 18rpx; right: 15%; width: 12rpx; height: 12rpx; background: #FF4D4F; border-radius: 50%; border: 2rpx solid #fff; }
    }
    
    .active-bg {
      position: absolute; top: 4rpx; width: calc(50% - 6rpx); height: calc(100% - 8rpx);
      background: #fff; border-radius: 16rpx; box-shadow: 0 4rpx 12rpx rgba(0,0,0,0.08);
      transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
  }
}

.signal-list { 
  flex: 1; width: 100%; box-sizing: border-box; padding: 0 32rpx;
}

.swipe-item-outer {
  position: relative; margin-bottom: 32rpx; overflow: hidden;
  border-radius: 40rpx; background: #1a1a1a;
}

.signal-card {
  background: #fff; border-radius: 40rpx; padding: 48rpx;
  box-shadow: 0 8rpx 30rpx rgba(0,0,0,0.02);
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1); 
  position: relative; overflow: hidden; z-index: 2;
  
  &.is-swiped { transform: translateX(-180rpx); }
  
  &.pending { border-left: 0rpx solid transparent; }
  &.accepted { 
    background: linear-gradient(to bottom right, #ffffff, #fcfdff);
    &::after { content: ''; position: absolute; top: 0; right: 0; width: 100rpx; height: 100rpx; background: radial-gradient(circle at top right, rgba(99,102,241,0.06), transparent); }
  }
  &.ignored { opacity: 0.5; filter: grayscale(1); .indicator-dot { background: #d1d5db; opacity: 0.5; } }

  .card-top {
    display: flex; align-items: center; margin-bottom: 40rpx;
    .sender-avatar { width: 96rpx; height: 96rpx; border-radius: 32rpx; background: #f3f4f6; margin-right: 24rpx; border: 1rpx solid rgba(0,0,0,0.05); }
    .sender-meta {
      flex: 1; 
      .name-row { display: flex; align-items: center; gap: 16rpx; margin-bottom: 4rpx; }
      .sender-name { font-size: 32rpx; font-weight: 800; color: #111; }
      .school-pill { font-size: 20rpx; color: #6366f1; font-weight: 800; background: rgba(99,102,241,0.06); padding: 4rpx 16rpx; border-radius: 10rpx; border: 1rpx solid rgba(99,102,241,0.1); }
      .time-row { 
        display: flex; align-items: center; gap: 8rpx; 
        .dot-icon { width: 8rpx; height: 8rpx; background: #d1d5db; border-radius: 50%; }
        .time { font-size: 22rpx; color: #9ca3af; font-weight: 500; }
      }
    }
    .status-indicator { 
      display: flex; align-items: center; gap: 8rpx; padding: 10rpx 20rpx; background: #f3f4f6; border-radius: 14rpx;
      .indicator-dot { width: 10rpx; height: 10rpx; border-radius: 50%; background: #9ca3af; }
      text { font-size: 20rpx; font-weight: 900; color: #6b7280; }
      
      &.pending { background: rgba(99,102,241,0.08); .indicator-dot { background: #6366f1; } text { color: #6366f1; } }
      &.accepted { background: rgba(16,185,129,0.08); .indicator-dot { background: #10b981; } text { color: #10b981; } }
    }
  }

  .target-bubble {
    background: #f9fafb; border-radius: 32rpx; padding: 32rpx; margin-bottom: 40rpx; position: relative;
    .quote-mark { position: absolute; top: 10rpx; left: 20rpx; font-size: 60rpx; color: #e5e7eb; font-family: serif; line-height: 1; }
    .target-content { font-size: 28rpx; color: #4b5563; font-weight: 700; line-height: 1.5; display: block; padding-left: 20rpx; }
    
    .user-apply-section {
      margin-top: 24rpx; padding-top: 24rpx; border-top: 2rpx solid rgba(0,0,0,0.03);
      .msg-header { 
        display: flex; align-items: center; gap: 10rpx; margin-bottom: 12rpx;
        .msg-icon-css { width: 20rpx; height: 14rpx; border: 3rpx solid #6366f1; border-top: none; border-radius: 0 0 4rpx 4rpx; position: relative; &::after { content: ''; position: absolute; top: -4rpx; left: 0; width: 20rpx; height: 3rpx; background: #6366f1; } }
        .msg-label { font-size: 20rpx; color: #6366f1; font-weight: 900; letter-spacing: 1rpx; text-transform: uppercase; }
      }
      .msg-text { font-size: 26rpx; color: #1f2937; font-weight: 700; display: block; }
    }
  }

  .contact-card-modern {
    background: #fff; border: 2rpx solid #6366f1; border-radius: 32rpx; padding: 32rpx;
    box-shadow: 0 10rpx 30rpx rgba(99,102,241,0.08);
    .contact-header { 
      display: flex; align-items: center; gap: 12rpx; margin-bottom: 24rpx;
      .success-icon { width: 14rpx; height: 14rpx; background: #10b981; border-radius: 50%; box-shadow: 0 0 10rpx #10b981; }
      text { font-size: 22rpx; color: #111; font-weight: 800; }
    }
    .contact-grid {
      display: flex; flex-direction: column; gap: 16rpx;
      .contact-panel-item {
        background: #f8faff; border-radius: 20rpx; padding: 20rpx 24rpx;
        .c-item-inner { 
          display: flex; align-items: center; justify-content: space-between;
          .c-label { font-size: 20rpx; color: #6366f1; font-weight: 800; width: 60rpx; }
          .c-val { flex: 1; font-size: 28rpx; font-weight: 800; color: #1e3a8a; }
          .copy-hint { font-size: 20rpx; background: #fff; color: #6366f1; padding: 4rpx 16rpx; border-radius: 10rpx; font-weight: 800; border: 1rpx solid rgba(99,102,241,0.2); }
        }
      }
    }
  }

  .card-actions {
    display: flex; align-items: center; gap: 24rpx;
    .accept-btn-modern { 
      flex: 1.5; background: #111; color: #fff; border-radius: 24rpx; height: 96rpx;
      display: flex; align-items: center; justify-content: center; font-size: 28rpx; font-weight: 800;
      box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.1);
      &:active { transform: scale(0.97); opacity: 0.9; }
    }
    .ignore-trigger { flex: 0.8; text-align: center; font-size: 24rpx; color: #9ca3af; font-weight: 800; padding: 20rpx; }
  }
  
  .sent-pending-footer { 
    display: flex; align-items: center; gap: 16rpx;
    .loading-dots {
      display: flex; gap: 6rpx;
      .dot { width: 8rpx; height: 8rpx; background: #6366f1; border-radius: 50%; animation: dotPulse 1.4s infinite; &:nth-child(2) { animation-delay: 0.2s; } &:nth-child(3) { animation-delay: 0.4s; } }
    }
    .tip-text { font-size: 24rpx; color: #6366f1; font-weight: 700; letter-spacing: 0.5rpx; }
  }
}

@keyframes dotPulse { 0%, 100% { transform: scale(0.8); opacity: 0.4; } 50% { transform: scale(1.2); opacity: 1; } }

.swipe-delete-btn {
  position: absolute; top: 0; right: 0; width: 180rpx; height: 100%;
  background: linear-gradient(135deg, #FF4D4F, #FF1F22); display: flex; flex-direction: column; align-items: center; justify-content: center;
  z-index: 1; gap: 8rpx;
  
  .del-icon-css { width: 32rpx; height: 32rpx; border: 4rpx solid #fff; border-top: none; border-radius: 0 0 8rpx 8rpx; position: relative; &::before { content: ''; position: absolute; top: -6rpx; left: -4rpx; width: 40rpx; height: 4rpx; background: #fff; } &::after { content: ''; position: absolute; top: -14rpx; left: 10rpx; width: 12rpx; height: 6rpx; border: 4rpx solid #fff; border-bottom: none; border-radius: 4rpx 4rpx 0 0; } }
  .del-text { color: #fff; font-size: 22rpx; font-weight: 900; letter-spacing: 1rpx; }
}

.empty-box {
  text-align: center; padding-top: 20vh;
  .empty-icon-styled {
    width: 200rpx; height: 200rpx; margin: 0 auto 40rpx; position: relative;
    display: flex; align-items: center; justify-content: center;
    .wave-circle { position: absolute; width: 100rpx; height: 100rpx; border: 4rpx solid #e5e7eb; border-radius: 50%; animation: wave 2s infinite cubic-bezier(0.4, 0, 0.6, 1); }
    .dot { width: 20rpx; height: 20rpx; background: #6366f1; border-radius: 50%; }
  }
  .empty-text { font-size: 28rpx; color: #9ca3af; font-weight: 600; }
}

@keyframes wave { 0% { transform: scale(1); opacity: 1; } 100% { transform: scale(3); opacity: 0; } }

.ios-spinner { width: 32rpx; height: 32rpx; border: 4rpx solid #f3f3f3; border-top: 4rpx solid #111; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 60rpx auto; }
@keyframes spin { 100% { transform: rotate(360deg); } }

.footer-padding { height: 100rpx; }
@keyframes slideUp { from { opacity: 0; transform: translateY(30rpx); } to { opacity: 1; transform: translateY(0); } }
.animate-slide-up { animation: slideUp 0.5s cubic-bezier(0.23, 1, 0.32, 1); }
</style>
