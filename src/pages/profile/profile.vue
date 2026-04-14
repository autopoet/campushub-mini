<template>
  <view class="container" :style="{ paddingTop: (statusBarHeight + 44) + 'px' }">
    <!-- iOS 风格标题栏 -->
    <view class="ios-header" :style="{ paddingTop: statusBarHeight + 'px' }">
      <view class="header-top">
        <view class="back-btn" @click="goBack">
          <view class="ios-back-arrow"></view>
        </view>
        <text class="title">{{ isMe ? '个人中心' : '伙伴名片' }}</text>
        <view class="placeholder"></view>
      </view>
    </view>
    <!-- 1. 背景装饰 -->
    <view class="header-bg"></view>

    <!-- 2. 核心资料卡片 -->
    <view class="profile-card animate-slide-up">
      <view class="avatar-box">
        <image class="avatar" :src="displayUser.avatarUrl || defaultAvatar" />
        <view v-if="isMe" class="edit-badge-minimal" @click="showEdit = true">
          <view class="gear-icon-css"></view>
        </view>
      </view>
      
      <view class="user-info">
        <text class="nickname">{{ displayUser.nickname || '校友' }}</text>
        <view class="tag-row">
          <text class="tag">{{ displayUser.school || '学习伙伴' }}</text>
          <text class="tag gender">{{ displayUser.gender === 1 ? '♂' : '♀' }}</text>
        </view>
        <view class="bio text-pixel">{{ displayUser.bio || '这位伙伴很勤奋，还没写自我介绍~' }}</view>
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
            <view v-if="item.status === 'accepted'" class="contact-box-modern">
               <view class="contact-header">信号已配对 · 现可查看联系方式</view>
              <view class="contact-items">
                <view v-if="getContacts(item).wechat" class="c-tag" @click="copy(getContacts(item).wechat)">微信: {{ getContacts(item).wechat }}</view>
                <view v-if="getContacts(item).phone" class="c-tag" @click="copy(getContacts(item).phone)">手机: {{ getContacts(item).phone }}</view>
                <view v-if="getContacts(item).qq" class="c-tag" @click="copy(getContacts(item).qq)">QQ: {{ getContacts(item).qq }}</view>
              </view>
            </view>
          </view>
        </view>

        <!-- 空状态 -->
        <view v-if="getListData.length === 0" class="empty-box-styled">
          <view class="empty-dot-icon"></view>
          <text class="empty-text">这里还没有任何信号记录</text>
        </view>
      </scroll-view>
    </view>

    <!-- 🌟 内嵌设置模态框 (Drawer 风格) -->
    <view v-if="showEdit" class="edit-overlay" @click.stop="showEdit = false">
      <view class="edit-panel animate-panel-up" @click.stop>
        <view class="panel-header">
          <text class="panel-title">设置学习名片</text>
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
          <view class="label-row">
            <text class="label">联络方式 (互通可见)</text>
            <text class="label-sub">必填其一</text>
          </view>
          
          <view class="ios-segmented-control-contacts">
            <view 
              v-for="t in contactTypes" :key="t.value" 
              @click="activeContactType = t.value"
              :class="['segment-item', { active: activeContactType === t.value, hasValue: !!editForm.contacts[t.value] }]">
              {{ t.label }}
              <view v-if="editForm.contacts[t.value]" class="ios-dot-indicator"></view>
            </view>
            <!-- 磁吸位移背景 -->
            <view class="active-pill-bg" :style="{ left: getContactIndex(activeContactType) * 33.33 + '%' }"></view>
          </view>
          
          <view class="dynamic-input-area">
            <view class="input-container">
              <view class="input-prefix">{{ contactTypes.find(t => t.value === activeContactType)?.label }}号</view>
              <input 
                class="inner-input" 
                v-model="editForm.contacts[activeContactType]" 
                :placeholder="'填写您的' + contactTypes.find(t => t.value === activeContactType)?.label" 
                placeholder-class="ios-placeholder" />
            </view>
          </view>
        </view>

        <button class="save-btn" @click="saveProfile">保存名片设置</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const currentTab = ref('my_teams')
const myTeams = ref<any[]>([])
const myPokes = ref<any[]>([])
const isMe = ref(true)
const targetUserId = ref('')
const showEdit = ref(false)
const headerHeight = ref(0)

const displayUser = ref<any>({})

interface Contacts {
  wechat: string;
  qq: string;
  phone: string;
  [key: string]: string; // 索引签名用于解决模版中的动态访问
}

const editForm = reactive({
  nickname: '',
  school: '',
  bio: '',
  contacts: { wechat: '', qq: '', phone: '' } as Contacts
})

const activeContactType = ref('wechat')
const contactTypes = [{ label: '微信', value: 'wechat' }, { label: '手机', value: 'phone' }, { label: 'QQ', value: 'qq' }]
const getContactIndex = (val: string) => contactTypes.findIndex(t => t.value === val)

const tabs = computed(() => [
  { key: 'my_teams', label: isMe.value ? '我的发布' : 'Ta的需求' },
  { key: 'my_pokes', label: isMe.value ? '组队记录' : 'Ta的动态' }
])

interface StatusMap { [key: string]: string }
const statusMap: StatusMap = {
  pending: '待确认',
  accepted: '互通成功',
  rejected: '已谢绝'
}

const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const statusBarHeight = ref(0)
const goBack = () => {
  const pages = getCurrentPages()
  if (pages.length > 1) {
    uni.navigateBack()
  } else {
    uni.switchTab({ url: '/pages/index/index' })
  }
}

onLoad(async (options) => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  headerHeight.value = statusBarHeight.value + 44 + 60

  const openid = options?.id
  await userStore.login()
  
  if (openid && openid !== userStore.openid) {
    isMe.value = false
    targetUserId.value = openid
    fetchOtherUser(openid)
  } else {
    isMe.value = true
    
    // Convert existing cloud:// or wxfile:// to https:// on the fly for fast local caching
    let uInfo = userStore.userInfo
    if (uInfo && uInfo.avatarUrl && (uInfo.avatarUrl.startsWith('cloud://') || uInfo.avatarUrl.startsWith('wxfile://'))) {
      try {
        const tempRes = await wx.cloud.getTempFileURL({ fileList: [uInfo.avatarUrl] })
        if (tempRes.fileList[0].tempFileURL) uInfo.avatarUrl = tempRes.fileList[0].tempFileURL
      } catch(e) {}
    }
    displayUser.value = uInfo
    if (uInfo) {
      editForm.nickname = uInfo.nickname || ''
      editForm.school = uInfo.school || ''
      editForm.bio = uInfo.bio || ''
      if (uInfo.contacts) {
        // 兼容旧格式或确保结构正确
        const c = userStore.userInfo.contacts
        editForm.contacts = { 
          wechat: typeof c === 'string' ? c : (c.wechat || ''), 
          qq: c.qq || '', 
          phone: c.phone || '' 
        }
      }
    }
    fetchMyData()
  }
})

const fetchOtherUser = async (id: string) => {
  try {
    uni.showNavigationBarLoading()
    const db = wx.cloud.database()
    const userRes = await db.collection('users').where({ _openid: id }).get()
    if (userRes.data.length > 0) {
      const u = userRes.data[0]
      if (u.avatarUrl && (u.avatarUrl.startsWith('cloud://') || u.avatarUrl.startsWith('wxfile://'))) {
        try {
          const tempRes = await wx.cloud.getTempFileURL({ fileList: [u.avatarUrl] })
          if (tempRes.fileList[0].tempFileURL) u.avatarUrl = tempRes.fileList[0].tempFileURL
        } catch(e) {}
      }
      displayUser.value = u
    }
    
    const postsRes = await db.collection('teams').where({ _openid: id }).get()
    myTeams.value = postsRes.data
  } catch (e) {
    console.error('获取伙伴数据失败', e)
  } finally {
    uni.hideNavigationBarLoading()
  }
}

const fetchMyData = async () => {
  try {
    uni.showNavigationBarLoading() // 增加视觉反馈
    const db = wx.cloud.database()
    const _ = db.command
    // 使用 '{openid}' 宏更稳定
    const teamsRes = await db.collection('teams').where({ _openid: '{openid}' }).get()
    myTeams.value = teamsRes.data
    
    // 组队记录需要包含发出和收到的
    const pokesRes = await db.collection('pokes').where(
      _.or([
        { senderId: userStore.openid },
        { receiverId: userStore.openid }
      ])
    ).get()
    myPokes.value = pokesRes.data
  } catch (e) {
    console.error('获取个人数据失败', e)
    uni.showToast({ title: '数据加载弱', icon: 'none' })
  } finally {
    uni.hideNavigationBarLoading()
  }
}

const saveProfile = async () => {
  if (!userStore.openid) {
    uni.showToast({ title: '登录失效', icon: 'none' }); return
  }

  // 必须至少填写一个联系方式
  const { wechat, qq, phone } = editForm.contacts
  if (!wechat && !qq && !phone) {
    uni.showToast({ title: '请至少填写一个联系形式', icon: 'none' }); return
  }

  uni.showLoading({ title: '正在同步...' })
  try {
    const db = wx.cloud.database()
    await db.collection('users').doc(userStore.openid).update({
      data: {
        nickname: editForm.nickname,
        school: editForm.school,
        bio: editForm.bio,
        contacts: editForm.contacts,
        updateTime: db.serverDate()
      }
    })
    userStore.userInfo = { ...userStore.userInfo, ...editForm }
    displayUser.value = { ...displayUser.value, ...editForm }
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
      if (res.tapIndex === 0) {
        // 编辑：带着ID跳回发布页
        uni.navigateTo({ url: `/pages/publish/publish?id=${item._id}` })
      } else if (res.tapIndex === 1) {
        uni.showModal({
          title: '下架需求?',
          content: '确定要下架这个学习贴纸吗？',
          confirmText: '确认下架',
          success: async (mRes) => {
            if (mRes.confirm) {
              const db = wx.cloud.database()
              await db.collection('teams').doc(item._id).remove()
              fetchMyData()
              uni.showToast({ title: '已下架' })
            }
          }
        })
      }
    }
  })
}

const getContacts = (item: any) => {
  const raw = item.senderInfo?.contacts
  if (!raw) return {}
  if (typeof raw === 'string') return { wechat: raw } // 兼容旧版单一联系方式
  return raw
}
</script>

<style lang="scss" scoped>
.container { min-height: 100vh; background: #F2F2F7; padding-bottom: 50rpx; }

.ios-header {
  position: fixed; top: 0; left: 0; width: 100%; z-index: 100;
  background: rgba(249, 249, 249, 0.94); backdrop-filter: blur(20px);
  border-bottom: 0.5px solid rgba(0,0,0,0.1);
  
  .header-top {
    height: 44px; display: flex; align-items: center; justify-content: space-between; padding: 0 30rpx;
    .back-btn { 
      width: 60rpx; height: 60rpx; display: flex; align-items: center; justify-content: center;
      .ios-back-arrow { 
        width: 24rpx; height: 24rpx; border-left: 5rpx solid #6366F1; border-bottom: 5rpx solid #6366F1; 
        transform: rotate(45deg); margin-left: 10rpx;
      }
    }
    .title { font-size: 34rpx; font-weight: 700; color: #000; }
    .placeholder { width: 60rpx; }
  }
}

.header-bg {
  height: 380rpx; background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%);
  border-radius: 0 0 100rpx 100rpx; margin-top: -44px;
}

.profile-card {
  margin: -140rpx 40rpx 40rpx; background: rgba(255,255,255,0.95); backdrop-filter: blur(20px); 
  border-radius: 50rpx; padding: 120rpx 40rpx 40rpx;
  box-shadow: 0 40rpx 100rpx rgba(118, 75, 162, 0.08); position: relative; text-align: center;
  border: 1px solid rgba(255,255,255,0.8);
  
  .avatar-box {
    position: absolute; top: -80rpx; left: 50%; transform: translateX(-50%);
    .avatar { width: 160rpx; height: 160rpx; border-radius: 56rpx; border: 8rpx solid #fff; box-shadow: 0 10rpx 40rpx rgba(0,0,0,0.1); }
    .edit-badge-minimal { 
      position: absolute; bottom: -10rpx; right: -10rpx; background: #fff; width: 64rpx; height: 64rpx; 
      border-radius: 20rpx; display: flex; align-items: center; justify-content: center;
      box-shadow: 0 8rpx 24rpx rgba(0,0,0,0.1); border: 2rpx solid #6366f1;
      .gear-icon-css { width: 28rpx; height: 28rpx; border: 4rpx solid #6366f1; border-radius: 50%; position: relative; &::after { content: ''; position: absolute; inset: -4rpx; border: 4rpx dashed #6366f1; border-radius: 50%; opacity: 0.5; } }
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

.edit-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(10rpx); z-index: 2000;
  display: flex; align-items: flex-end;
  
  .edit-panel {
    background: #fff; width: 100%; border-radius: 60rpx 60rpx 0 0; padding: 60rpx 40rpx calc(40rpx + env(safe-area-inset-bottom));
    position: relative; overflow: hidden;
    
    .panel-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 50rpx;
      .panel-title { font-size: 36rpx; font-weight: 900; color: #1a1a1a; }
      .close { font-size: 50rpx; color: #999; }
    }

    .form-item {
      margin-bottom: 40rpx;
      .label-row { display: flex; align-items: baseline; margin-bottom: 20rpx; }
      .label { font-size: 24rpx; color: #666; font-weight: bold; }
      .label-sub { font-size: 20rpx; color: #9ca3af; margin-left: 10rpx; }
      .input { background: #F3F4F6; height: 90rpx; border-radius: 20rpx; padding: 0 30rpx; font-size: 28rpx; width: 100%; box-sizing: border-box; }
      .textarea { background: #F3F4F6; width: 100%; height: 180rpx; border-radius: 20rpx; padding: 20rpx 30rpx; font-size: 28rpx; box-sizing: border-box; }
    }

    .ios-segmented-control-contacts {
      background: rgba(118, 118, 128, 0.12); border-radius: 20rpx; height: 72rpx;
      position: relative; display: flex; align-items: center; padding: 2px; margin-bottom: 30rpx;
      
      .segment-item {
        flex: 1; text-align: center; font-size: 26rpx; color: #3A3A3C; font-weight: 500;
        position: relative; z-index: 2; transition: all 0.2s;
        &.active { color: #000; font-weight: 700; }
        .ios-dot-indicator { position: absolute; top: 4rpx; right: 20%; width: 10rpx; height: 10rpx; background: #6366f1; border-radius: 50%; opacity: 0.8; }
      }
      
      .active-pill-bg {
        position: absolute; top: 2px; width: 33.33%; height: calc(100% - 4px);
        background: #fff; border-radius: 18rpx; box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.1);
        transition: left 0.3s cubic-bezier(0.645, 0.045, 0.355, 1);
      }
    }

    .dynamic-input-area {
      .input-container {
        background: #F3F4F6; border-radius: 24rpx; height: 100rpx; display: flex; align-items: center; padding: 0 30rpx;
        border: 2rpx solid transparent; transition: border-color 0.3s;
        &:focus-within { border-color: rgba(99,102,241,0.2); background: #fff; box-shadow: 0 10rpx 40rpx rgba(99,102,241,0.05); }
        .input-prefix { font-size: 24rpx; font-weight: 900; color: #6366f1; background: rgba(99,102,241,0.1); padding: 4rpx 16rpx; border-radius: 10rpx; margin-right: 20rpx; }
        .inner-input { flex: 1; font-size: 32rpx; color: #000; }
        .ios-placeholder { color: #8E8E93; font-size: 28rpx; font-weight: 400; }
      }
    }

    .save-btn {
      background: #1a1a1a; color: #fff; height: 100rpx; border-radius: 30rpx; 
      display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 32rpx;
      box-shadow: 0 20rpx 40rpx rgba(0,0,0,0.1); margin-top: 20rpx;
      &:active { transform: scale(0.98); }
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
  background: #fff; border-radius: 30rpx; padding: 30rpx; margin-bottom: 20rpx; border: 1px solid rgba(0,0,0,0.02);
  .poke-header { display: flex; justify-content: space-between; margin-bottom: 20rpx; .target-title { font-size: 28rpx; font-weight: bold; color: #1a1a1a; } }
  .contact-box-premium {
    background: rgba(99,102,241,0.05); border-radius: 20rpx; padding: 20rpx;
    .contact-header { font-size: 22rpx; color: #6366f1; font-weight: bold; margin-bottom: 12rpx; }
    .contact-items {
      display: flex; flex-wrap: wrap; gap: 12rpx;
      .c-tag { background: #fff; border: 1px solid rgba(99,102,241,0.1); border-radius: 12rpx; padding: 6rpx 16rpx; font-size: 24rpx; color: #333; }
    }
  }
  .status-tag { 
    font-size: 20rpx; padding: 4rpx 16rpx; border-radius: 8rpx; font-weight: bold;
    &.pending { background: #FEF3C7; color: #92400E; }
    &.accepted { background: #D1FAE5; color: #065F46; }
    &.rejected { background: #FEE2E2; color: #991B1B; }
  }
}

.empty-box-styled { 
  text-align: center; padding-top: 150rpx; 
  .empty-dot-icon { width: 12rpx; height: 12rpx; background: #e5e7eb; border-radius: 50%; margin: 0 auto 30rpx; box-shadow: 0 0 20rpx #e5e7eb; }
  .empty-text { font-size: 24rpx; color: #9ca3af; font-weight: 600; letter-spacing: 1rpx; } 
}

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
