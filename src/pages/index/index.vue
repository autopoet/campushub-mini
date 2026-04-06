<template>
  <view class="container" :style="{ paddingTop: headerSafeHeight + 'px' }">
    <!-- 顶部导航栏 -->
    <view v-if="!authLoading" class="page-header" :style="{ 
      paddingTop: statusBarHeight + 10 + 'px', 
      paddingRight: menuButtonWidth + 20 + 'px',
      minHeight: navBarHeight + 60 + 'px'
    }">
      <view class="header-left" @click="goToProfile">
        <image class="mini-avatar" :src="userStore.userInfo?.avatarUrl || defaultAvatar" />
        <view class="title-group">
          <text class="title">学习搭子广场</text>
          <text class="subtitle">找到最懂你的学术拍档</text>
        </view>
      </view>
    </view>

    <!-- 全屏初始化加载 (防止黑屏) -->
    <view v-if="authLoading" class="boot-loading">
      <view class="spinner"></view>
      <text class="loading-text">环境初始化中...</text>
    </view>

    <!-- 骨架屏/加载中 -->
    <view v-if="!authLoading && loading && teams.length === 0" class="loading-wall">
       <view v-for="i in 4" :key="i" class="skeleton-card"></view>
    </view>

    <!-- 需求滚动墙 -->
    <scroll-view 
      scroll-y 
      class="scroll-area" 
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh">
      <!-- iOS 风格极简搜索组 -->
      <view class="ios-search-section">
        <view class="search-bar-integrated">
          <view class="ios-search-icon-css"></view>
          <input 
            class="ios-input" 
            v-model="searchKeyword" 
            placeholder="搜索学霸搭子..." 
            @input="onSearchInput"
            placeholder-class="ios-placeholder" />
          <view class="ios-divider"></view>
          <view class="ios-filter-trigger" @click="showFilterDrawer = true">
            <text class="filter-label">筛选</text>
            <view class="active-dot" v-if="hasActiveFilter"></view>
          </view>
        </view>
      </view>
      
      <view :class="['requirement-wall', 'single-column']">
        <view 
          v-for="(item, index) in teams" 
          :key="item._id" 
          class="post-it-card animate-pop-in"
          :style="{ 
            backgroundColor: item.color || getPostItColor(index), 
            transform: `rotate(${getRandomRotate(index)}deg)`,
            animationDelay: `${index * 0.1}s` 
          }"
          @click="handleCardClick(item)">
          
          <!-- 标签：急缺角色 -->
          <view class="urgent-tag">急缺: {{ item.urgentRole }}</view>
          
          <!-- 核心内容：大字报 -->
          <view class="card-body text-pixel">
            {{ item.content }}
          </view>
          
          <!-- 底部：学校信息与分类标签 -->
          <view class="card-footer">
            <view class="publisher-info">
              <text class="school">{{ item.school || '校友' }}</text>
              <text class="time">{{ formatTime(item.createTime) }}</text>
            </view>
            <view class="category-badge">
              <text class="cat-text">{{ item.category }}</text>
            </view>
          </view>

          <!-- 戳一戳反馈动效层 -->
          <view v-if="pokingId === item._id" class="poke-feedback">🖐️</view>
        </view>
      </view>

      <!-- 空态展示 -->
      <view v-if="!loading && teams.length === 0" class="empty-state">
        <text class="empty-icon">🏜️</text>
        <text class="empty-text">广场空荡荡，快发布你的第一个学习需求吧</text>
      </view>
    </scroll-view>

    <!-- 悬浮按钮组 -->
    <view class="fab-group">
      <view class="fab-btn msg-btn" @click="goToNotifications">
        <text class="msg-icon">💬</text>
        <view class="badge" v-if="hasNewSignals"></view>
      </view>
      <view class="fab-btn publish-btn" @click="goToPublish">
        <text class="plus">+</text>
      </view>
    </view>

    <!-- 注册强制拦截层 -->
    <view v-if="!authLoading && !userStore.isRegistered" class="auth-mask">
      <view class="auth-card">
        <text class="auth-title">👋 欢迎加入学习搭子</text>
        <text class="auth-desc">你需要先完善学习名片才能查看搭子广场</text>
        <button class="auth-btn" @click="goToRegister">去完善名片</button>
      </view>
    </view>

    <!-- 🌟 酷炫筛选抽屉 -->
    <view v-if="showFilterDrawer" class="filter-drawer-mask" @click="showFilterDrawer = false">
      <view class="filter-drawer animate-slide-up" @click.stop>
        <view class="drawer-header">
          <text class="drawer-title">全局筛选</text>
          <view class="reset-link" @click="resetFilters">重置</view>
        </view>
        
        <view class="filter-group">
          <text class="group-label">主要领域</text>
          <view class="options-grid">
            <view 
              v-for="cat in categoryTabs" 
              :key="cat.name" 
              @click="currentTab = cat.name"
              :class="['option-pill', { active: currentTab === cat.name }]">
              {{ cat.label }}
            </view>
          </view>
        </view>

        <view class="filter-group">
          <text class="group-label">学校范围</text>
          <view class="options-grid">
            <view 
              @click="schoolFilter = 'ALL'"
              :class="['option-pill', { active: schoolFilter === 'ALL' }]">
              不限
            </view>
            <view 
              @click="schoolFilter = 'SAME'"
              :class="['option-pill', { active: schoolFilter === 'SAME' }]">
              仅看同校
            </view>
          </view>
        </view>

        <button class="apply-btn" @click="applyFilters">查看结果</button>
      </view>
    </view>

    <!-- 🌟 酷炫觉醒预览层 -->
    <view v-if="selectedItem" class="detail-overlay" @click.self="selectedItem = null">
      <view class="detail-card animate-zoom-in" :style="{ backgroundColor: selectedItem.color }">
        <view class="detail-header">
          <text class="detail-cat">任务类型：{{ selectedItem.category }}</text>
          <text class="close-btn" @click="selectedItem = null">×</text>
        </view>
        
        <scroll-view scroll-y class="detail-content">
          <text class="main-text">{{ selectedItem.content }}</text>
          <view class="publisher-meta">
            <text class="pub-label">发布人信息</text>
            <view class="pub-row" @click="goToUserProfile(selectedItem._openid)">
              <image class="pub-avatar" :src="selectedItem.publisherAvatar || defaultAvatar" />
              <view class="pub-text">
                <text class="pub-name">{{ selectedItem.publisherName || '校友' }}</text>
                <text class="pub-school">{{ selectedItem.school }}</text>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="detail-footer">
          <view class="poke-info">已有 {{ selectedItem.pokesCount || 0 }} 人发出了组队信号</view>
          <button class="mega-poke-btn" @click="handlePoke(selectedItem)">
            <text>戳他 🖐️</text>
          </button>
        </view>
      </view>
    </view>

    <!-- 🌟 投递留言面板 -->
    <view v-if="showApplyPanel" class="detail-overlay" @click.self="showApplyPanel = false">
      <view class="detail-panel animate-panel-up" @click.stop style="min-height: 400rpx; padding-bottom: 60rpx;">
        <view class="panel-header">
          <text class="p-title">你想对他说点什么？</text>
          <view class="close-btn" @click="showApplyPanel = false">✕</view>
        </view>
        <view class="apply-input-wrap">
          <textarea 
            class="msg-input" 
            v-model="applyMsg" 
            placeholder="简短的留言能提高成功率哦 (30字以内)" 
            maxlength="30"
            auto-focus />
          <text class="char-count">{{ applyMsg.length }}/30</text>
        </view>
        <button class="primary-btn" @click="confirmPoke">发送学习信号</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import { onShow } from '@dcloudio/uni-app'

const userStore = useUserStore()
const teams = ref<any[]>([])
const loading = ref(true)
const refreshing = ref(false)
const hasNewSignals = ref(false) 
const authLoading = ref(true)
const pokingId = ref('') // 正被戳中的卡片ID
const selectedItem = ref<any>(null) // 被选中预览的项
const showApplyPanel = ref(false)
const applyMsg = ref('')

const searchKeyword = ref('')
const showFilterDrawer = ref(false)
const schoolFilter = ref('ALL') // ALL | SAME
const currentTab = ref('ALL')
const categoryTabs = [
  { name: 'ALL', label: '全部' },
  { name: 'COMPETITION', label: '项目竞赛' },
  { name: 'POSTGRAD', label: '考研上岸' },
  { name: 'CIVIL', label: '考公考编' },
  { name: 'DAILY', label: '日常学习' }
]

const hasActiveFilter = computed(() => currentTab.value !== 'ALL' || schoolFilter.value !== 'ALL')

const onSearchInput = () => {
  clearTimeout((onSearchInput as any).timer)
  ;(onSearchInput as any).timer = setTimeout(() => {
    fetchTeams()
  }, 500)
}

const applyFilters = () => {
  if (schoolFilter.value === 'SAME' && !userStore.userInfo?.school) {
    uni.showToast({ title: '请先在名片中填写所属学校', icon: 'none' })
    schoolFilter.value = 'ALL'
    return
  }
  showFilterDrawer.value = false
  onRefresh()
}

const resetFilters = () => {
  currentTab.value = 'ALL'
  schoolFilter.value = 'ALL'
  searchKeyword.value = ''
  onRefresh()
}

// 胶囊避让逻辑
const statusBarHeight = ref(0)
const navBarHeight = ref(44)
const menuButtonWidth = ref(0)
const headerSafeHeight = ref(0)

const initNavigation = () => {
  const sys = uni.getSystemInfoSync()
  statusBarHeight.value = sys.statusBarHeight || 0
  const menu = uni.getMenuButtonBoundingClientRect()
  menuButtonWidth.value = sys.windowWidth - menu.left
  navBarHeight.value = (menu.top - sys.statusBarHeight!) * 2 + menu.height
  headerSafeHeight.value = statusBarHeight.value + navBarHeight.value + 60
}

const postItColors = ['#E9D5FF', '#CFFAFE', '#FEF9C3', '#FFDADA', '#DCFCE7']
const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const getPostItColor = (i: number) => postItColors[i % postItColors.length]
const getRandomRotate = (i: number) => (i % 2 === 0 ? -1.5 : 1.5)

const formatTime = (date: any) => {
  if (!date) return ''
  const d = new Date(date)
  return `${d.getMonth() + 1}-${d.getDate()}`
}

const onRefresh = async () => {
  refreshing.value = true
  await fetchTeams()
  refreshing.value = false
}

const fetchTeams = async () => {
  loading.value = true
  try {
    const db = wx.cloud.database()
    let query = db.collection('teams') as any
    if (currentTab.value !== 'ALL') query = query.where({ category: currentTab.value })
    if (schoolFilter.value === 'SAME' && userStore.userInfo?.school) query = query.where({ school: userStore.userInfo.school })
    if (searchKeyword.value) {
      query = query.where({ content: db.RegExp({ regexp: searchKeyword.value, options: 'i' }) })
    }
    const { data } = await query.orderBy('createTime', 'desc').limit(20).get()
    teams.value = data
  } catch (e) {
    console.error('获取广场数据失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  initNavigation()
  authLoading.value = true
  await userStore.login()
  authLoading.value = false
  if (userStore.isRegistered) fetchTeams()
})

onShow(() => {
  if (userStore.isRegistered) checkNewSignals()
})

const checkNewSignals = async () => {
  try {
    const db = wx.cloud.database()
    const { total } = await db.collection('pokes').where({ receiverId: userStore.openid, status: 'pending' }).count()
    hasNewSignals.value = total > 0
  } catch (e) {
    console.error('检查新信号失败', e)
  }
}

const goToRegister = () => uni.navigateTo({ url: '/pages/register/register' })
const goToPublish = () => uni.navigateTo({ url: '/pages/publish/publish' })
const goToNotifications = () => uni.navigateTo({ url: '/pages/notifications/notifications' })
const goToProfile = () => uni.navigateTo({ url: '/pages/profile/profile' })
const goToUserProfile = (openid: string) => { if (openid) uni.navigateTo({ url: `/pages/profile/profile?id=${openid}` }) }

const handleCardClick = (item: any) => { selectedItem.value = item }

const handlePoke = (item: any) => {
  if (!userStore.isContactComplete) {
    uni.showModal({
      title: '完整名片',
      content: '补全一种联系方式后，才能发送组队信号哦',
      confirmText: '去补全',
      success: (res) => { if (res.confirm) goToRegister() }
    })
    return
  }
  selectedItem.value = item
  applyMsg.value = ''
  showApplyPanel.value = true
}

const confirmPoke = async () => {
  const item = selectedItem.value
  uni.showLoading({ title: '正在发射...' })
  try {
    const db = wx.cloud.database()
    const _ = db.command
    await db.collection('pokes').add({
      data: {
        targetTeamId: item._id,
        targetTeamContent: item.content,
        receiverId: item._openid,
        receiverName: item.publisherName || '校友',
        receiverAvatar: item.publisherAvatar || '',
        status: 'pending',
        senderId: userStore.openid,
        applyMsg: applyMsg.value || '学霸，带我飞！',
        senderInfo: {
          nickname: userStore.userInfo.nickname,
          avatarUrl: userStore.userInfo.avatarUrl,
          school: userStore.userInfo.school,
          contacts: userStore.userInfo.contacts
        },
        createTime: db.serverDate()
      }
    })
    await db.collection('teams').doc(item._id).update({ data: { pokesCount: _.inc(1) } })
    showApplyPanel.value = false
    selectedItem.value = null
    uni.showToast({ title: '信号已发射！' })
  } catch (e) {
    uni.showToast({ title: '网络有些拥挤', icon: 'none' })
  }
}

const loadMore = () => { if (loading.value || teams.value.length === 0) return }
</script>

<style lang="scss" scoped>
.container {
  height: 100vh; background: #f0f2f5; display: flex; flex-direction: column;
}

.page-header {
  position: fixed; top: 0; left: 0; width: 100%; z-index: 1000;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 40rpx; background: rgba(255, 255, 255, 0.85); backdrop-filter: blur(20px);
  box-sizing: border-box; border-bottom: 1px solid rgba(0,0,0,0.05);

  .header-left { 
    flex: 1; display: flex; align-items: center; gap: 24rpx; padding-bottom: 20rpx;
    .mini-avatar { width: 88rpx; height: 88rpx; border-radius: 50%; background: #eee; border: 4rpx solid #fff; box-shadow: 0 10rpx 40rpx rgba(0,0,0,0.08); }
    .title-group { display: flex; flex-direction: column; gap: 8rpx; }
    .title { font-size: 44rpx; font-weight: 900; color: #111827; letter-spacing: 2rpx; }
    .subtitle { font-size: 24rpx; color: #6b7280; font-weight: 500; }
  }
}

.scroll-area { flex: 1; width: 100%; box-sizing: border-box; }

.requirement-wall {
  display: flex; flex-direction: column; gap: 40rpx;
  padding: 40rpx 0 100rpx;
  width: 100%; box-sizing: border-box;

  .post-it-card { 
    width: 86%; min-height: 280rpx; 
    margin: 0 auto;
  }
}

.post-it-card {
  border-radius: 32rpx; padding: 30rpx 40rpx; position: relative; box-shadow: 10rpx 10rpx 30rpx rgba(0,0,0,0.05);
  display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
  border-bottom: 8rpx solid rgba(0,0,0,0.1); border-right: 2rpx solid rgba(0,0,0,0.05);

  .urgent-tag {
    position: absolute; top: 30rpx; right: 10rpx; background: #1a1a1a; color: #fff; padding: 6rpx 30rpx; transform: rotate(15deg); font-size: 20rpx; font-weight: 800; border-radius: 8rpx;
  }

  .card-body {
    font-size: 34rpx; font-weight: 800; color: #1a1a1a; line-height: 1.4; margin-top: 40rpx;
    display: -webkit-box; -webkit-box-orient: vertical; 
    -webkit-line-clamp: 4; line-clamp: 4; 
    overflow: hidden;
  }

  .card-footer {
    margin-top: 30rpx; display: flex; justify-content: space-between; align-items: flex-end;
    .publisher-info {
      .school { font-size: 24rpx; font-weight: bold; color: #333; display: block; }
      .time { font-size: 20rpx; color: #666; margin-top: 5rpx; }
    }
    .category-badge { 
      background: rgba(255,255,255,0.4); padding: 8rpx 20rpx; border-radius: 12rpx; border: 2rpx solid rgba(0,0,0,0.05);
      .cat-text { color: #1a1a1a; font-size: 20rpx; font-weight: 800; }
    }
  }

  .poke-feedback {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    font-size: 120rpx; background: rgba(255,255,255,0.4); backdrop-filter: blur(4px);
    animation: poke-high-five 0.8s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
  }
}

@keyframes poke-high-five {
  0% { transform: scale(0.5); opacity: 0; }
  30% { transform: scale(1.4); opacity: 1; }
  100% { transform: scale(1.8) translateY(-40rpx); opacity: 0; }
}

.ios-search-section {
  padding: 0 40rpx 40rpx;
  .search-bar-integrated {
    height: 80rpx; background: rgba(118, 118, 128, 0.12); border-radius: 20rpx;
    display: flex; align-items: center; padding: 0 24rpx;
    
    .ios-input { flex: 1; font-size: 30rpx; color: #000; }
    .ios-placeholder { color: #8E8E93; }
    
    .ios-divider { width: 1rpx; height: 32rpx; background: rgba(0,0,0,0.1); margin: 0 20rpx; }
    
    .ios-search-icon-css { 
      width: 28rpx; height: 28rpx; border: 3rpx solid #8E8E93; border-radius: 50%; position: relative; margin-right: 12rpx;
      &::after { content: ''; position: absolute; bottom: -6rpx; right: -6rpx; width: 10rpx; height: 3rpx; background: #8E8E93; transform: rotate(45deg); }
    }
    
    .ios-filter-trigger {
      display: flex; align-items: center; position: relative; padding: 10rpx 0;
      .filter-label { font-size: 28rpx; font-weight: 600; color: #6366F1; }
      .active-dot { position: absolute; top: 0; right: -10rpx; width: 10rpx; height: 10rpx; background: #6366F1; border-radius: 50%; }
    }
  }
}

.filter-drawer-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.4); backdrop-filter: blur(10px); z-index: 1200;
  display: flex; align-items: flex-end;
  .filter-drawer {
    width: 100%; background: #fff; border-radius: 60rpx 60rpx 0 0; padding: 60rpx 48rpx;
    animation: drawerUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
    .drawer-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 50rpx;
      .drawer-title { font-size: 40rpx; font-weight: 900; color: #1a1a1a; }
      .reset-link { font-size: 26rpx; color: #9ca3af; font-weight: 800; }
    }
    .filter-group {
      margin-bottom: 50rpx;
      .group-label { font-size: 24rpx; font-weight: 800; color: #9ca3af; margin-bottom: 24rpx; display: block; }
      .options-grid {
        display: flex; flex-wrap: wrap; gap: 20rpx;
        .option-pill {
          padding: 18rpx 36rpx; background: #f3f4f6; border-radius: 40rpx; font-size: 26rpx; font-weight: 800; color: #6b7280; transition: all 0.3s;
          &.active { background: linear-gradient(135deg, #6366f1, #a855f7); color: #fff; box-shadow: 0 8rpx 20rpx rgba(99,102,241,0.2); }
        }
      }
    }
    .apply-btn { background: #1a1a1a; color: #fff; border-radius: 30rpx; padding: 25rpx 0; font-size: 32rpx; font-weight: 800; margin-top: 40rpx; }
  }
}

@keyframes drawerUp { from { transform: translateY(100%); } to { transform: translateY(0); } }

.fab-group {
  position: fixed; bottom: 80rpx; right: 40rpx; display: flex; flex-direction: column; gap: 30rpx; z-index: 99;
  .fab-btn {
    width: 108rpx; height: 108rpx; border-radius: 50%; box-shadow: 0 15rpx 35rpx rgba(0,0,0,0.15);
    display: flex; align-items: center; justify-content: center; color: #fff; transition: transform 0.2s;
    &:active { transform: scale(0.9); }
    
    &.msg-btn { 
      background: #fff; border: 1rpx solid rgba(0,0,0,0.05); position: relative;
      .msg-icon { font-size: 40rpx; }
      .badge { position: absolute; top: 0; right: 0; width: 20rpx; height: 20rpx; background: #ef4444; border-radius: 50%; border: 4rpx solid #fff; }
    }
    &.publish-btn {
      background: linear-gradient(135deg, #6366f1, #a855f7);
      .plus { font-size: 60rpx; font-weight: 300; }
    }
  }
}

/* 强拦截层样式 */
.auth-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 40rpx;
  .auth-card {
    background: #fff; border-radius: 40rpx; padding: 60rpx; width: 100%; text-align: center; animation: popIn 0.4s ease-out;
    .auth-title { font-size: 38rpx; font-weight: bold; display: block; margin-bottom: 20rpx; }
    .auth-desc { font-size: 26rpx; color: #666; display: block; margin-bottom: 50rpx; line-height: 1.5; }
    .auth-btn { background: #764ba2; color: #fff; border-radius: 30rpx; font-weight: bold; }
  }
}

.boot-loading {
  position: fixed; inset: 0; background: #ffffff; z-index: 2000; display: flex; flex-direction: column; align-items: center; justify-content: center;
  .spinner { width: 60rpx; height: 60rpx; border: 6rpx solid #f3f3f3; border-top: 6rpx solid #764ba2; border-radius: 50%; animation: spin 1s linear infinite; }
  .loading-text { margin-top: 30rpx; font-size: 24rpx; color: #999; }
}

@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }

.loading-wall { padding: 140rpx 40rpx; display: flex; flex-direction: column; gap: 30rpx; }
.skeleton-card { height: 400rpx; background: #e0e0e0; border-radius: 30rpx; &.half { height: 300rpx; } }

@keyframes popIn { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
@keyframes pop-in { 
  from { transform: scale(0.8) translateY(40rpx) rotate(0deg); opacity: 0; } 
  to { transform: scale(1) translateY(0) rotate(var(--rotate, 0deg)); opacity: 1; } 
}
.animate-pop-in { 
  animation: pop-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both; 
}

/* 觉醒模式样式 */
.detail-overlay {
  position: fixed; inset: 0; background: rgba(0,0,0,0.6); backdrop-filter: blur(20px);
  z-index: 1100; display: flex; align-items: center; justify-content: center; padding: 40rpx;
  
  .detail-card {
    width: 100%; max-height: 80vh; border-radius: 60rpx; padding: 60rpx;
    display: flex; flex-direction: column; position: relative;
    box-shadow: 0 40rpx 100rpx rgba(0,0,0,0.3); border: 2rpx solid rgba(255,255,255,0.2);
    
    .detail-header {
      display: flex; justify-content: space-between; align-items: center; margin-bottom: 40rpx;
      .detail-cat { font-size: 22rpx; font-weight: 900; background: rgba(0,0,0,0.1); padding: 8rpx 20rpx; border-radius: 12rpx; }
      .close-btn { font-size: 60rpx; color: #1a1a1a; line-height: 1; }
    }
    
    .detail-content {
      flex: 1; overflow: hidden;
      .main-text { font-size: 48rpx; font-weight: 900; color: #1a1a1a; line-height: 1.3; }
      .publisher-meta {
        margin-top: 60rpx; padding-top: 40rpx; border-top: 1px solid rgba(0,0,0,0.05);
        .pub-label { font-size: 20rpx; color: #666; margin-bottom: 20rpx; display: block; }
        .pub-row {
          display: flex; align-items: center; gap: 20rpx;
          .pub-avatar { width: 80rpx; height: 80rpx; border-radius: 50%; }
          .pub-text {
            .pub-name { font-size: 28rpx; font-weight: bold; display: block; }
            .pub-school { font-size: 22rpx; color: #666; }
          }
        }
      }
    }
    
    .detail-footer {
      margin-top: 60rpx; text-align: center;
      .poke-info { font-size: 24rpx; color: #666; margin-bottom: 30rpx; }
      .mega-poke-btn {
        background: #1a1a1a; color: #fff; border-radius: 40rpx; padding: 30rpx;
        font-weight: 900; filter: drop-shadow(0 10rpx 20rpx rgba(0,0,0,0.2));
        &:active { transform: scale(0.95); }
      }
    }
  }
}

@keyframes zoomIn { from { opacity: 0; transform: scale(0.8) translateY(100rpx); } to { opacity: 1; transform: scale(1) translateY(0); } }
.animate-zoom-in { animation: zoomIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); }
</style>
