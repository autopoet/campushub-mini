<template>
  <view class="container">
    <!-- 顶部导航栏 -->
    <view v-if="!authLoading" class="hall-header">
      <view class="header-left" @click="goToProfile">
        <image class="mini-avatar" :src="userStore.userInfo?.avatarUrl || defaultAvatar" />
        <view class="title-group">
          <text class="title">学习搭子广场</text>
          <text class="subtitle">志同道合，学无止境</text>
        </view>
      </view>
      <view class="header-right">
        <!-- 切换视图按钮 -->
        <view class="action-btn" @click="isWaterfall = !isWaterfall">
          <text class="action-icon">{{ isWaterfall ? '📋' : '🔳' }}</text>
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
       <view v-for="i in 4" :key="i" class="skeleton-card" :class="{ 'half': isWaterfall }"></view>
    </view>

    <!-- 需求滚动墙 -->
    <scroll-view 
      scroll-y 
      class="scroll-area" 
      @scrolltolower="loadMore"
      refresher-enabled
      :refresher-triggered="refreshing"
      @refresherrefresh="onRefresh">
      <!-- 学术分类切换栏 -->
      <view class="category-tabs">
        <scroll-view scroll-x class="tab-scroll" :show-scrollbar="false">
          <view 
            v-for="cat in categoryTabs" 
            :key="cat.name" 
            class="tab-item"
            :class="{ active: currentTab === cat.name }"
            @click="handleTabChange(cat.name)">
            {{ cat.label }}
          </view>
        </scroll-view>
      </view>
      
      <view :class="['requirement-wall', isWaterfall ? 'waterfall' : 'feed-list']">
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
          <button class="mega-poke-btn" @click="confirmPoke">
            <text>戳他 🖐️</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const isWaterfall = ref(true) // 默认开启瀑布流
const teams = ref<any[]>([])
const loading = ref(true)
const refreshing = ref(false)
const hasNewSignals = ref(false) 
const authLoading = ref(true)
const pokingId = ref('') // 正被戳中的卡片ID
const selectedItem = ref<any>(null) // 被选中预览的项

const currentTab = ref('ALL')
const categoryTabs = [
  { name: 'ALL', label: '全部' },
  { name: 'COMPETITION', label: '项目竞赛' },
  { name: 'POSTGRAD', label: '考研上岸' },
  { name: 'CIVIL', label: '考公考编' },
  { name: 'DAILY', label: '日常学习' }
]

const handleTabChange = (name: string) => {
  currentTab.value = name
  onRefresh()
}

// 预设高饱和度马卡龙色系（便利贴风格）
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
    let query = db.collection('teams')
    
    if (currentTab.value !== 'ALL') {
      query = query.where({ category: currentTab.value }) as any
    }

    const { data } = await query
      .orderBy('createTime', 'desc')
      .limit(20)
      .get()
    teams.value = data
  } catch (e) {
    console.error('获取广场数据失败', e)
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  authLoading.value = true
  // 1. 调用登录
  await userStore.login()
  authLoading.value = false
  
  // 2. 如果已注册，则拉取大厅数据
  if (userStore.isRegistered) {
    fetchTeams()
  }
})

// 增加 onShow 检查，确保从消息中心回来后红点能实时刷新
import { onShow } from '@dcloudio/uni-app'
onShow(() => {
  if (userStore.isRegistered) {
    checkNewSignals()
  }
})

const checkNewSignals = async () => {
  try {
    const db = wx.cloud.database()
    const { total } = await db.collection('pokes')
      .where({ 
        receiverId: userStore.openid,
        status: 'pending' 
      })
      .count()
    hasNewSignals.value = total > 0
  } catch (e) {
    console.error('检查新信号失败', e)
  }
}

const goToRegister = () => uni.navigateTo({ url: '/pages/register/register' })
const goToPublish = () => uni.navigateTo({ url: '/pages/publish/publish' })
const goToNotifications = () => uni.navigateTo({ url: '/pages/notifications/notifications' })
const goToProfile = () => uni.navigateTo({ url: '/pages/profile/profile' })

// 跳转到其他校友的公开主页
const goToUserProfile = (openid: string) => {
  if (!openid) return
  uni.navigateTo({ url: `/pages/profile/profile?id=${openid}` })
}

// 点击卡片进入觉醒预览
const handleCardClick = (item: any) => {
  selectedItem.value = item
}

// 在预览中确认投递
const confirmPoke = () => {
  if (selectedItem.value) {
    handlePoke(selectedItem.value)
    // 投递成功后可以选择关闭预览
  }
}

// 底部加载更多 (待分页功能完善)
const loadMore = () => {
  if (loading.value || teams.value.length === 0) return
  console.log('Load more teams...')
  // TODO: 实现真正的分页拉取
}

// 核心互动：投递名片 (Poke)
const handlePoke = async (item: any) => {
  // 杜绝狂点拦截
  if (pokingId.value === item._id) return

  // 1. 检查自己的联系方式是否完整（之前我们在 store 注入了 isContactComplete）
  if (!userStore.isContactComplete) {
    uni.showModal({
      title: '开启社交名片',
      content: '为了让对方能联系上你，请先补全一种联系方式',
      confirmText: '去补全',
      cancelText: '再看看',
      success: (res) => {
        if (res.confirm) goToRegister()
      }
    })
    return
  }

  // 2. 不能投递给自己
  if (item._openid === userStore.openid) {
    uni.showToast({ title: '这是你自己发的动态哦', icon: 'none' })
    return
  }

  uni.showLoading({ title: '正在投递名片...' })

  try {
    const db = wx.cloud.database()
    // 3. 在 pokes 集合创建一条申请记录
    await db.collection('pokes').add({
      data: {
        targetTeamId: item._id,
        targetTeamContent: item.content,
        receiverId: item._openid, // 接收者
        receiverName: item.publisherName, // 保存接收者姓名
        receiverAvatar: item.publisherAvatar, // 保存接收者头像
        senderId: userStore.openid, // 发送者
        senderInfo: {
          nickname: userStore.userInfo.nickname,
          avatarUrl: userStore.userInfo.avatarUrl,
          contacts: userStore.userInfo.contacts,
          school: userStore.userInfo.school
        },
        status: 'pending', 
        createTime: db.serverDate()
      }
    })

    // 4. 更新帖子的“感兴趣”人数 (原子加1)
    const _ = db.command
    await db.collection('teams').doc(item._id).update({
      data: { pokesCount: _.inc(1) }
    })

    pokingId.value = item._id
    setTimeout(() => pokingId.value = '', 1000)

    uni.showToast({ title: '名片已投递！', icon: 'success' })
  } catch (e) {
    console.error('投递失败', e)
    uni.hideLoading()
    uni.showToast({ title: '网络繁忙，请重试', icon: 'none' })
  }
}
</script>

<style lang="scss" scoped>
.container {
  height: 100vh; background: #f0f2f5; display: flex; flex-direction: column;
}

.hall-header {
  position: sticky; top: 0; z-index: 100;
  margin-bottom: 50rpx; display: flex; justify-content: space-between; align-items: center; 
  padding: 100rpx 48rpx 40rpx; 
  background: rgba(248, 248, 248, 0.85); backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(0,0,0,0.05);

  .header-left { 
    flex: 1; display: flex; align-items: center; gap: 20rpx; 
    .mini-avatar { width: 92rpx; height: 92rpx; border-radius: 50%; background: #eee; border: 4rpx solid #fff; box-shadow: 0 10rpx 20rpx rgba(0,0,0,0.05); }
    .title-group { display: flex; flex-direction: column; }
  }
  .header-right { 
    display: flex; align-items: center; gap: 20rpx;
    .action-btn { 
      width: 80rpx; height: 80rpx; display: flex; align-items: center; justify-content: center; position: relative;
      background: #fff; border-radius: 24rpx; box-shadow: 0 8rpx 20rpx rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.02);
      .action-icon { font-size: 36rpx; }
      .badge { position: absolute; top: -5rpx; right: -5rpx; width: 22rpx; height: 22rpx; background: #ef4444; border-radius: 50%; border: 6rpx solid #fff; }
    }
  }
  .title { font-size: 52rpx; font-weight: 900; color: #1a1a1a; display: block; letter-spacing: 2rpx; }
  .subtitle { font-size: 24rpx; color: #9ca3af; margin-top: 10rpx; display: block; }
}

.scroll-area { flex: 1; padding: 0 32rpx; box-sizing: border-box; }

/* 瀑布流 & 列表布局 */
.requirement-wall {
  display: flex; flex-wrap: wrap; gap: 30rpx;
  padding: 10rpx 10rpx 40rpx; // 增加水平内边距，给卡片旋转腾出空间
  width: 100%; box-sizing: border-box;

  &.feed-list { 
    flex-direction: column; 
    .post-it-card { 
      width: 100%; min-height: 420rpx; 
      margin: 0 auto;
    } 
  }
  &.waterfall { 
    display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; 
    .post-it-card { 
      width: 100%; min-height: 380rpx; 
      .card-body { 
        font-size: 32rpx; 
        -webkit-line-clamp: 4; line-clamp: 4;
      } 
    } 
  }
}

.post-it-card {
  border-radius: 32rpx; padding: 40rpx; position: relative; box-shadow: 10rpx 10rpx 30rpx rgba(0,0,0,0.05);
  display: flex; flex-direction: column; justify-content: space-between; overflow: hidden;
  border-bottom: 8rpx solid rgba(0,0,0,0.1); border-right: 2rpx solid rgba(0,0,0,0.05);

  .urgent-tag {
    position: absolute; top: 30rpx; right: -20rpx; background: #1a1a1a; color: #fff; padding: 6rpx 40rpx; transform: rotate(15deg); font-size: 20rpx; font-weight: 800; border-radius: 8rpx;
  }

  .card-body {
    font-size: 44rpx; font-weight: 800; color: #1a1a1a; line-height: 1.4; margin-top: 40rpx;
    display: -webkit-box; -webkit-box-orient: vertical; 
    -webkit-line-clamp: 5; line-clamp: 5; // 双重标准确保无 Lint 警告
    overflow: hidden;
  }

  .card-footer {
    margin-top: 40rpx; display: flex; justify-content: space-between; align-items: flex-end;
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

.category-tabs {
  margin-bottom: 30rpx; padding: 0 10rpx;
  .tab-scroll {
    white-space: nowrap; width: 100%;
    .tab-item {
      display: inline-block; padding: 12rpx 36rpx; margin-right: 20rpx;
      font-size: 26rpx; font-weight: 800; color: #6b7280;
      background: #fff; border-radius: 40rpx; transition: all 0.3s;
      border: 1rpx solid rgba(0,0,0,0.05); box-shadow: 0 4rpx 10rpx rgba(0,0,0,0.02);
      &.active {
        background: linear-gradient(135deg, #6366f1, #a855f7); color: #fff;
        box-shadow: 0 10rpx 20rpx rgba(99,102,241,0.2); border-color: transparent;
      }
    }
  }
}

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
