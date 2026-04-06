<template>
  <view class="notify-container">
    <view class="page-header">
      <text class="title">收到信号</text>
      <text class="subtitle">这些校友想和你一起学习</text>
    </view>

    <!-- 信号列表 -->
    <scroll-view scroll-y class="signal-list" :refresher-enabled="true" :refresher-triggered="refreshing" @refresherrefresh="onRefresh">
      <view v-if="loading" class="loading-box">
        <text class="loading-text">信号扫描中...</text>
      </view>

      <view v-else-if="signals.length === 0" class="empty-box">
        <text class="empty-icon">📡</text>
        <text class="empty-text">暂时还没有收到信号哦</text>
      </view>

      <view v-for="s in signals" :key="s._id" class="signal-card animate-slide-up">
        <view class="card-top">
          <image class="sender-avatar" :src="s.senderInfo.avatarUrl" />
          <view class="sender-meta">
            <view class="name-row">
              <text class="sender-name">{{ s.senderInfo.nickname }}</text>
              <text class="school-tag">@ {{ s.senderInfo.school }}</text>
            </view>
            <text class="time">{{ formatTime(s.createTime) }}</text>
          </view>
          <view :class="['status-flag', s.status]">{{ statusMap[s.status] }}</view>
        </view>

        <view class="target-bubble">
          <text class="target-label">针对贴纸：</text>
          <text class="target-content">{{ s.targetTeamContent || '已删除的需求贴' }}</text>
        </view>

        <view class="skills-row">
          <view v-for="skill in (s.senderInfo.skills || [])" :key="skill" class="skill-tag">#{{ skill }}</view>
        </view>

        <view class="card-actions">
          <button v-if="s.status === 'pending'" class="accept-btn" @click="handleAccept(s)">同意并互换名片</button>
          <button v-else-if="s.status === 'accepted'" class="view-btn" @click="showContact(s)">查看联系方式</button>
          <text class="ignore-btn" v-if="s.status === 'pending'" @click="handleIgnore(s)">忽略</text>
        </view>
      </view>
    </scroll-view>

    <!-- 联系方式弹窗 -->
    <view v-if="currentContact" class="contact-modal" @click="currentContact = null">
      <view class="modal-content animate-pop-in" @click.stop>
        <view class="modal-header">
          <text class="modal-title">对方联系方式</text>
          <text class="modal-sub">快去发起学术交流吧</text>
        </view>
        <view class="contact-list">
          <view v-if="currentContact.phone" class="contact-item" @click="copy(currentContact.phone, '手机号')">
            <text class="c-label">手机号</text>
            <text class="c-value">{{ currentContact.phone }}</text>
            <text class="c-copy">复制</text>
          </view>
          <view v-if="currentContact.wechat" class="contact-item" @click="copy(currentContact.wechat, '微信号')">
            <text class="c-label">微信号</text>
            <text class="c-value">{{ currentContact.wechat }}</text>
            <text class="c-copy">复制</text>
          </view>
          <view v-if="currentContact.qq" class="contact-item" @click="copy(currentContact.qq, 'QQ号')">
            <text class="c-label">QQ号</text>
            <text class="c-value">{{ currentContact.qq }}</text>
            <text class="c-copy">复制</text>
          </view>
        </view>
        <button class="close-modal-btn" @click="currentContact = null">知道了</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
interface Signal {
  _id: string;
  senderInfo: any;
  targetTeamContent: string;
  status: 'pending' | 'accepted' | 'ignored';
  createTime: any;
}

const signals = ref<Signal[]>([])
const loading = ref(true)
const refreshing = ref(false)
const currentContact = ref<any>(null)

const statusMap = {
  pending: '等待处理',
  accepted: '已互换',
  ignored: '已忽略'
}

const fetchSignals = async () => {
  if (!userStore.openid) await userStore.login()
  loading.value = true
  try {
    const db = wx.cloud.database()
    const { data } = await db.collection('pokes')
      .where({ receiverId: userStore.openid }) 
      .orderBy('createTime', 'desc')
      .get()
    
    signals.value = data as Signal[]
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

const handleAccept = async (s: Signal) => {
  uni.showLoading({ title: '处理中' })
  try {
    const db = wx.cloud.database()
    await db.collection('pokes').doc(s._id).update({
      data: { status: 'accepted' }
    })
    s.status = 'accepted'
    uni.showToast({ title: '已开启互换', icon: 'success' })
    showContact(s)
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const handleIgnore = async (s: Signal) => {
  uni.showModal({
    title: '确认忽略？',
    content: '忽略后该信号将进入存档',
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

const showContact = (s: Signal) => {
  currentContact.value = s.senderInfo.contacts
}

const copy = (val: string, label: string) => {
  uni.setClipboardData({
    data: val,
    success: () => uni.showToast({ title: `${label}已复制` })
  })
}

const formatTime = (time: any) => {
  if (!time) return '刚刚'
  const date = new Date(time)
  return `${date.getMonth() + 1}-${date.getDate()} ${date.getHours()}:${date.getMinutes()}`
}

onMounted(fetchSignals)
</script>

<style lang="scss" scoped>
.notify-container {
  min-height: 100vh; background: #f9fafb; padding: 100rpx 40rpx;
}

.page-header {
  margin-bottom: 60rpx;
  .title { font-size: 56rpx; font-weight: 900; color: #111827; display: block; }
  .subtitle { font-size: 26rpx; color: #6b7280; margin-top: 15rpx; display: block; }
}

.signal-list {
  height: calc(100vh - 300rpx);
}

.signal-card {
  background: #fff; border-radius: 40rpx; padding: 40rpx; margin-bottom: 30rpx;
  box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.02); border: 2rpx solid #f3f4f6;

  .card-top {
    display: flex; align-items: center; margin-bottom: 30rpx; position: relative;
    .sender-avatar { width: 90rpx; height: 90rpx; border-radius: 30rpx; background: #eee; margin-right: 20rpx; }
    .sender-meta {
      flex: 1;
      .name-row { display: flex; align-items: center; gap: 12rpx; }
      .sender-name { font-size: 32rpx; font-weight: 800; color: #111827; }
      .school-tag { font-size: 20rpx; color: #764ba2; font-weight: bold; background: rgba(118,75,162,0.08); padding: 4rpx 12rpx; border-radius: 8rpx; }
      .time { font-size: 22rpx; color: #9ca3af; margin-top: 4rpx; display: block; }
    }
    .status-flag { 
      font-size: 20rpx; font-weight: bold; padding: 8rpx 16rpx; border-radius: 12rpx;
      &.pending { color: #f59e0b; background: rgba(245,158,11,0.1); }
      &.accepted { color: #10b981; background: rgba(16,185,129,0.1); }
      &.ignored { color: #9ca3af; background: rgba(156,163,175,0.1); }
    }
  }

  .target-bubble {
    background: #f9fafb; border-radius: 20rpx; padding: 24rpx; margin-bottom: 24rpx;
    .target-label { font-size: 22rpx; color: #9ca3af; }
    .target-content { font-size: 24rpx; color: #4b5563; font-weight: 500; }
  }

  .skills-row {
    display: flex; flex-wrap: wrap; gap: 12rpx; margin-bottom: 35rpx;
    .skill-tag { font-size: 22rpx; color: #6366f1; font-weight: bold; }
  }

  .card-actions {
    display: flex; align-items: center; gap: 20rpx;
    .accept-btn { flex: 2; background: #111827; color: #fff; border-radius: 20rpx; font-size: 26rpx; font-weight: bold; }
    .view-btn { flex: 2; background: #f3f4f6; color: #111827; border-radius: 20rpx; font-size: 26rpx; font-weight: bold; }
    .ignore-btn { flex: 1; text-align: center; font-size: 24rpx; color: #9ca3af; font-weight: 500; }
  }
}

.contact-modal {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(8px); z-index: 999; display: flex; align-items: center; justify-content: center; padding: 48rpx;
  .modal-content {
    background: #fff; width: 100%; border-radius: 56rpx; padding: 60rpx;
    .modal-header { text-align: center; margin-bottom: 50rpx; .modal-title { font-size: 40rpx; font-weight: 900; display: block; } .modal-sub { font-size: 24rpx; color: #888; } }
    .contact-list {
      display: flex; flex-direction: column; gap: 24rpx; margin-bottom: 60rpx;
      .contact-item { 
        background: #f8f8f8; padding: 30rpx; border-radius: 24rpx; display: flex; align-items: center;
        .c-label { font-size: 22rpx; color: #999; width: 100rpx; }
        .c-value { flex: 1; font-size: 30rpx; font-weight: bold; color: #111; }
        .c-copy { font-size: 22rpx; color: #6366f1; font-weight: bold; }
      }
    }
    .close-modal-btn { background: #111; color: #fff; border-radius: 30rpx; font-weight: bold; }
  }
}

.empty-box {
  text-align: center; padding-top: 15vh;
  .empty-icon { font-size: 100rpx; display: block; margin-bottom: 30rpx; }
  .empty-text { font-size: 28rpx; color: #9ca3af; }
}

@keyframes slideUp { from { opacity: 0; transform: translateY(20rpx); } to { opacity: 1; transform: translateY(0); } }
.animate-slide-up { animation: slideUp 0.4s ease-out; }
@keyframes popIn { from { opacity: 0; transform: scale(0.9); } to { opacity: 1; transform: scale(1); } }
.animate-pop-in { animation: popIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1); }
</style>
