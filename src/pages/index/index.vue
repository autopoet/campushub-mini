<template>
  <view class="container">
    <!-- 顶部导航栏：视图切换 -->
    <view v-if="!authLoading" class="header">
      <text class="page-title">需求广场</text>
      <view class="view-toggle" @click="isWaterfall = !isWaterfall">
        <text class="icon">{{ isWaterfall ? '📑' : '🗂️' }}</text>
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
      
      <view :class="['requirement-wall', isWaterfall ? 'waterfall' : 'feed-list']">
        <view 
          v-for="(item, index) in teams" 
          :key="item._id" 
          class="post-it-card animate-pop-in"
          :style="{ backgroundColor: getPostItColor(index), transform: `rotate(${getRandomRotate(index)}deg)` }"
          @click="handlePoke(item)">
          
          <!-- 标签：急缺角色 -->
          <view class="urgent-tag">急缺: {{ item.urgentRole }}</view>
          
          <!-- 核心内容：大字报 -->
          <view class="card-body text-pixel">
            {{ item.content }}
          </view>
          
          <!-- 底部：学校信息与交互 -->
          <view class="card-footer">
            <view class="publisher-info">
              <text class="school">{{ item.school || '校外精英' }}</text>
              <text class="time">{{ formatTime(item.createTime) }}</text>
            </view>
            <view class="poke-btn">戳他 🖐️</view>
          </view>
        </view>
      </view>

      <!-- 空态展示 -->
      <view v-if="!loading && teams.length === 0" class="empty-state">
        <text class="empty-icon">🏜️</text>
        <text class="empty-text">广场空荡荡，快去发一条吧</text>
      </view>
    </scroll-view>

    <!-- 悬浮发布按钮 -->
    <view class="fab-btn" @click="goToPublish">
      <text class="plus">+</text>
    </view>

    <!-- 注册强制拦截层 -->
    <view v-if="!authLoading && !userStore.isRegistered" class="auth-mask">
      <view class="auth-card">
        <text class="auth-title">👋 欢迎来到 CampusHub</text>
        <text class="auth-desc">你需要先完善校友资料才能查看需求广场</text>
        <button class="auth-btn" @click="goToRegister">去完善资料</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const isWaterfall = ref(false) // 默认大图列表
const teams = ref<any[]>([])
const loading = ref(true)
const refreshing = ref(false)
const authLoading = ref(true)

// 预设高饱和度马卡龙色系（便利贴风格）
const postItColors = ['#E9D5FF', '#CFFAFE', '#FEF9C3', '#FFDADA', '#DCFCE7']

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
    const { data } = await db.collection('teams')
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
  // 1. 调用登录（获取 OpenID 并检查注册状态）
  await userStore.login()
  authLoading.value = false
  
  // 2. 如果已注册，则拉取大厅数据
  if (userStore.isRegistered) {
    fetchTeams()
  } else {
    // 强制跳转逻辑（可选，目前已通过遮罩拦截）
    // goToRegister()
  }
})

const goToRegister = () => uni.navigateTo({ url: '/pages/register/register' })
const goToPublish = () => uni.navigateTo({ url: '/pages/publish/publish' })

// 核心互动：投递名片 (Poke)
const handlePoke = async (item: any) => {
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
        senderId: userStore.openid, // 发送者
        senderInfo: {
          nickname: userStore.userInfo.nickname,
          avatarUrl: userStore.userInfo.avatarUrl,
          contacts: userStore.userInfo.contacts,
          school: userStore.userInfo.school
        },
        status: 'pending', // pending: 待响应, accepted: 已互粉, rejected: 已忽略
        createTime: db.serverDate()
      }
    })

    // 4. 更新帖子的“感兴趣”人数 (原子加1)
    const _ = db.command
    await db.collection('teams').doc(item._id).update({
      data: { pokesCount: _.inc(1) }
    })

    uni.hideLoading()
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

.header {
  padding: 100rpx 40rpx 20rpx; background: #fff; display: flex; justify-content: space-between; align-items: center;
  .page-title { font-size: 48rpx; font-weight: 900; color: #1a1a1a; }
  .view-toggle { width: 80rpx; height: 80rpx; background: #f5f5f5; border-radius: 20rpx; display: flex; align-items: center; justify-content: center; }
}

.scroll-area { flex: 1; padding: 20rpx; box-sizing: border-box; }

/* 瀑布流 & 列表布局 */
.requirement-wall {
  display: flex; flex-wrap: wrap; gap: 30rpx;
  &.feed-list { flex-direction: column; .post-it-card { width: 100%; min-height: 420rpx; } }
  &.waterfall { display: grid; grid-template-columns: 1fr 1fr; gap: 20rpx; .post-it-card { width: 100%; min-height: 380rpx; .card-body { font-size: 32rpx; -webkit-line-clamp: 4; } } }
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
    display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 5; overflow: hidden;
  }

  .card-footer {
    margin-top: 40rpx; display: flex; justify-content: space-between; align-items: flex-end;
    .publisher-info {
      .school { font-size: 24rpx; font-weight: bold; color: #333; display: block; }
      .time { font-size: 20rpx; color: #666; margin-top: 5rpx; }
    }
    .poke-btn { background: #fff; padding: 10rpx 25rpx; border-radius: 40rpx; font-size: 24rpx; font-weight: bold; border: 4rpx solid #1a1a1a; }
  }
}

.fab-btn {
  position: fixed; bottom: 80rpx; right: 50rpx; width: 120rpx; height: 120rpx; background: #1a1a1a; border-radius: 50%; box-shadow: 0 20rpx 40rpx rgba(0,0,0,0.3);
  display: flex; align-items: center; justify-content: center; z-index: 99; color: #fff;
  .plus { font-size: 60rpx; font-weight: 300; }
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
@keyframes pop-in { from { transform: scale(0.85); opacity: 0; } to { transform: scale(1); opacity: 1; } }
</style>
