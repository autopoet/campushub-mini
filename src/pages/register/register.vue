<template>
  <view class="register-container">
    <!-- 顶部极简进度条 -->
    <view class="progress-bar">
      <view class="progress-inner" :style="{ width: currentStep === 1 ? '50%' : '100%' }"></view>
    </view>

    <!-- 主卡片 -->
    <view class="glass-card animate-slide-up">
      <!-- 第一步：基础资料 -->
      <view v-if="currentStep === 1">
        <view class="header">
          <text class="title">完善资料</text>
          <text class="subtitle">让校园搭子更了解你</text>
        </view>

        <view class="avatar-section">
          <button class="avatar-btn" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
            <image class="avatar" :src="formData.avatarUrl || defaultAvatar"></image>
            <view class="camera-icon">📸</view>
          </button>
        </view>

        <view class="form-body">
          <view class="input-item">
            <text class="label">昵称</text>
            <input type="nickname" v-model="formData.nickname" placeholder="获取微信昵称" placeholder-class="placeholder" @blur="onNicknameBlur" />
          </view>

          <view class="input-item">
            <text class="label">所属学校</text>
            <view class="selector-box" @click="openSchoolDrawer">
              <text :class="{ 'placeholder': !formData.school }">{{ formData.school || '搜索您的学校' }}</text>
            </view>
          </view>

          <view class="input-item">
            <text class="label">当前年级</text>
            <picker :range="gradeRange" @change="onGradeChange">
              <view class="selector-box" :class="{ 'placeholder': !formData.grade }">{{ formData.grade || '选择年级' }}</view>
            </picker>
          </view>

          <view class="input-item">
            <view class="label-row">
              <text class="label">展示联系方式</text>
              <text class="label-sub">(选填)</text>
            </view>
            <view class="contact-selector">
              <view v-for="t in contactTypes" :key="t.value" 
                    @click="activeContactType = t.value"
                    :class="['type-pill', { active: activeContactType === t.value, hasValue: !!(formData.contacts as any)[t.value] }]">
                {{ t.label }}
                <view v-if="(formData.contacts as any)[t.value]" class="dot"></view>
              </view>
            </view>
            
            <view class="dynamic-input-wrap" :key="activeContactType">
              <input v-if="activeContactType === 'phone'" type="number" v-model="formData.contacts.phone" placeholder="手机号，方便搭子飞速找到你" placeholder-class="placeholder" />
              <input v-if="activeContactType === 'qq'" type="number" v-model="formData.contacts.qq" placeholder="QQ号，深情交流不迷路" placeholder-class="placeholder" />
              <input v-if="activeContactType === 'wechat'" type="text" v-model="formData.contacts.wechat" placeholder="微信号，扩列必备" placeholder-class="placeholder" />
            </view>
          </view>
        </view>

        <button class="primary-btn" @click="currentStep = 2">下一步</button>
      </view>

      <!-- 第二步：技能标签 (可选) -->
      <view v-if="currentStep === 2" class="step-content-full">
        <view class="top-content">
          <view class="header">
            <text class="title">自荐名片</text>
            <text class="subtitle">让搭子更了解你，学习不再孤单</text>
          </view>

          <view class="skills-container">
            <view v-for="s in skillOptions" :key="s" 
                  @click="toggleSkill(s)"
                  :class="['skill-pill', { selected: formData.skills.includes(s) }]">
              {{ s }}
            </view>
          </view>

          <view class="custom-add">
            <input type="text" v-model="newSkill" placeholder="添加其它技能..." @confirm="addCustomSkill" />
            <view class="add-circle" @click="addCustomSkill">+</view>
          </view>
        </view>

        <!-- 视觉平衡插画：拼图几何 (居中填充) -->
        <view class="puzzle-illustration large">
          <view class="puzzle-piece main"></view>
          <view class="puzzle-piece floating"></view>
          <text class="puzzle-text">You are the last piece</text>
        </view>

        <view class="footer-btns">
          <button class="primary-btn" :loading="submitting" @click="finish">开启学习之旅</button>
          <text class="skip-link" @click="finish">暂时跳过</text>
        </view>
      </view>
    </view>

    <!-- 全屏搜索抽屉 -->
    <view v-if="showDrawer" class="drawer-mask" @click="closeSchoolDrawer">
      <view class="drawer-content" @click.stop>
        <view class="drawer-header">
          <text class="drawer-title">搜索学校</text>
          <view class="close-btn" @click="closeSchoolDrawer">✕</view>
        </view>
        <view class="search-input-wrap">
          <input focus confirm-type="search" v-model="searchKey" placeholder="输入关键字，如'北京'..." />
        </view>
        <scroll-view scroll-y class="search-results">
          <view v-if="searchKey.length > 0">
            <view v-for="s in filteredSchools" :key="s" class="result-item" @click="selectSchool(s)">
              {{ s }}
            </view>
            <view v-if="filteredSchools.length === 0" class="result-item custom" @click="selectSchool(searchKey)">
              ✨ 手填：{{ searchKey }}
            </view>
          </view>
          <view v-else class="search-empty">
             输入文字开始搜索
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useUserStore } from '@/store/user'
import schoolList from '@/static/schools.json'

const userStore = useUserStore()
const currentStep = ref(1)
const showDrawer = ref(false)
const activeContactType = ref('phone')
const searchKey = ref('')
const newSkill = ref('')
const submitting = ref(false)
const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const gradeRange = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士及以上']
const skillOptions = ref(['数学建模', '算法编程', '雅思/托福', '资料共享', '图书馆钉子户', '咖啡监督', '互背单词', '申论批改', '简历优化', '论文润色'])
const contactTypes = [{ label: '手机', value: 'phone' }, { label: 'QQ', value: 'qq' }, { label: '微信', value: 'wechat' }]

const formData = reactive({ avatarUrl: '', nickname: '', school: '', grade: '', skills: [] as string[], contacts: { wechat: '', qq: '', phone: '' } })

onMounted(() => {
  // 资料回显：如果 store 里已经有用户信息，直接塞进表单
  if (userStore.userInfo) {
    const { avatarUrl, nickname, school, grade, skills, contacts } = userStore.userInfo
    formData.avatarUrl = avatarUrl || ''
    formData.nickname = nickname || ''
    formData.school = school || ''
    formData.grade = grade || ''
    formData.skills = skills ? [...skills] : []
    if (contacts) {
      formData.contacts = { 
        wechat: contacts.wechat || '', 
        qq: contacts.qq || '', 
        phone: contacts.phone || '' 
      }
    }
  }
})

const filteredSchools = computed(() => {
  if (!searchKey.value) return []
  return (schoolList as string[]).filter(s => s.includes(searchKey.value)).slice(0, 30)
})

// 移除不再使用的 computed 属性以消除 lint 警告识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识识（修正 Lint）

const onChooseAvatar = (e: any) => formData.avatarUrl = e.detail.avatarUrl
const onNicknameBlur = (e: any) => formData.nickname = e.detail.value
const onGradeChange = (e: any) => formData.grade = gradeRange[e.detail.value]

const openSchoolDrawer = () => { showDrawer.value = true; searchKey.value = '' }
const closeSchoolDrawer = () => showDrawer.value = false
const selectSchool = (name: string) => { formData.school = name; closeSchoolDrawer() }

const toggleSkill = (s: string) => {
  const i = formData.skills.indexOf(s)
  i > -1 ? formData.skills.splice(i, 1) : formData.skills.push(s)
}

const addCustomSkill = () => {
  if (!newSkill.value) return
  if (!skillOptions.value.includes(newSkill.value)) skillOptions.value.push(newSkill.value)
  if (!formData.skills.includes(newSkill.value)) formData.skills.push(newSkill.value)
  newSkill.value = ''
}

const finish = async () => {
  const { avatarUrl, nickname, school, grade } = formData

  if (!avatarUrl || !nickname || !school || !grade) {
    uni.showToast({ title: '基础资料未完善', icon: 'none' }); return
  }
  submitting.value = true
  const success = await userStore.registerUser(formData)
  submitting.value = false
  if (success) {
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1000)
  }
}
</script>

<style lang="scss" scoped>
.register-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 100rpx 40rpx;
  position: relative;
}

.progress-bar {
  position: fixed; top: 0; left: 0; width: 100%; height: 8rpx; z-index: 99; background: rgba(255,255,255,0.1);
  .progress-inner { height: 100%; background: #a5f3fc; border-radius: 0 4rpx 4rpx 0; box-shadow: 0 0 10rpx #a5f3fc; transition: width 0.4s ease; }
}

.glass-card {
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(40px);
  border-radius: 56rpx;
  padding: 80rpx 48rpx;
  box-shadow: 0 50rpx 120rpx rgba(0,0,0,0.15);
  min-height: calc(100vh - 240rpx);
  display: flex;
  flex-direction: column;
}

.step-content-full {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.header {
  text-align: center; margin-bottom: 60rpx;
  .title { font-size: 48rpx; font-weight: 800; color: #1a1a1a; display: block; letter-spacing: 2rpx; }
  .subtitle { font-size: 26rpx; color: #888; margin-top: 16rpx; display: block; }
}

.avatar-section {
  display: flex; justify-content: center; margin-bottom: 70rpx;
  .avatar-btn {
    width: 180rpx; height: 180rpx; border-radius: 50%; padding: 0; background: #fff; box-shadow: 0 15rpx 40rpx rgba(0,0,0,0.08); position: relative;
    .avatar { width: 100%; height: 100%; border-radius: 50%; }
    .camera-icon { position: absolute; bottom: 4rpx; right: 4rpx; background: #764ba2; color: #fff; width: 56rpx; height: 56rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 26rpx; border: 6rpx solid #fff; }
  }
}

.input-item {
  margin-bottom: 48rpx;
  .label-row { display: flex; align-items: baseline; margin-bottom: 20rpx; padding-left: 12rpx; }
  .label { font-size: 28rpx; font-weight: 700; color: #374151; }
  .label-sub { font-size: 22rpx; color: #9ca3af; margin-left: 12rpx; }
  input, .selector-box { background: rgba(0,0,0,0.035); border-radius: 24rpx; padding: 30rpx 40rpx; font-size: 32rpx; color: #111827; height: auto; min-height: 1.5em; transition: background 0.3s; }
  input:focus { background: rgba(0,0,0,0.015); }
  .placeholder { color: #9ca3af !important; font-weight: 400; font-size: 28rpx; }
}

.contact-selector {
  display: flex; gap: 20rpx; margin-bottom: 24rpx;
  .type-pill { 
    flex: 1; text-align: center; padding: 18rpx 0; background: rgba(0,0,0,0.04); border-radius: 16rpx; font-size: 24rpx; color: #6b7280; position: relative; transition: all 0.3s;
    &.active { background: #764ba2; color: #fff; font-weight: bold; box-shadow: 0 8rpx 20rpx rgba(118,75,162,0.25); }
    &.hasValue:not(.active) { color: #764ba2; background: rgba(118,75,162,0.08); }
    .dot { position: absolute; top: 10rpx; right: 10rpx; width: 10rpx; height: 10rpx; background: #a5f3fc; border-radius: 50%; box-shadow: 0 0 10rpx #a5f3fc; }
  }
}

.dynamic-input-wrap {
  input { background: rgba(0,0,0,0.035); border-radius: 24rpx; padding: 30rpx 40rpx; font-size: 32rpx; }
}

.skills-container {
  display: flex; flex-wrap: wrap; gap: 24rpx; margin-bottom: 50rpx;
  .skill-pill { padding: 16rpx 36rpx; background: rgba(118,75,162,0.08); color: #764ba2; border-radius: 40rpx; font-size: 26rpx; transition: all 0.2s; &.selected { background: #764ba2; color: #fff; box-shadow: 0 10rpx 25rpx rgba(118,75,162,0.3); } }
}

.custom-add {
  display: flex; align-items: center; background: rgba(0,0,0,0.03); border-radius: 24rpx; padding: 15rpx 30rpx; margin-bottom: 50rpx;
  input { flex: 1; background: transparent; font-size: 28rpx; }
  .add-circle { width: 56rpx; height: 56rpx; background: #764ba2; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 36rpx; margin-left: 20rpx; }
}

.puzzle-illustration {
  height: 240rpx; position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: visible; margin: 60rpx 0;
  &.large { height: 450rpx; }
  .puzzle-piece {
    position: absolute; width: 110rpx; height: 110rpx; border-radius: 24rpx; opacity: 0.7; box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.1);
    &.main {
      background: linear-gradient(135deg, #6366f1, #a855f7); transform: rotate(15deg); left: 28%;
      animation: float 4.5s ease-in-out infinite;
    }
    &.floating {
      background: #a5f3fc; transform: rotate(-20deg); right: 28%; 
      animation: float 3.2s ease-in-out infinite reverse;
    }
  }
  .puzzle-text { font-size: 26rpx; color: #a1a1aa; margin-top: 180rpx; letter-spacing: 4rpx; font-style: italic; font-weight: 300; }
}

@keyframes float { 0%, 100% { transform: translateY(0) rotate(-20deg); } 50% { transform: translateY(-40rpx) rotate(-10deg); } }

.primary-btn {
  background: linear-gradient(to right, #6366f1, #a855f7); color: #fff; border-radius: 30rpx; padding: 25rpx 0; font-size: 32rpx; font-weight: 700; box-shadow: 0 10rpx 40rpx rgba(168,85,247,0.4); border: none; line-height: 1.5;
}

.footer-btns {
  text-align: center; display: flex; flex-direction: column; gap: 30rpx;
  .skip-link { font-size: 24rpx; color: #999; text-decoration: underline; }
}

.drawer-mask {
  position: fixed; inset: 0; background: rgba(0,0,0,0.5); backdrop-filter: blur(5px); z-index: 999; display: flex; align-items: flex-end;
}
.drawer-content {
  width: 100%; background: #fff; border-radius: 40rpx 40rpx 0 0; padding: 40rpx; min-height: 50vh; animation: drawerUp 0.3s ease-out;
  .drawer-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30rpx; .drawer-title { font-size: 34rpx; font-weight: bold; } .close-btn { font-size: 32rpx; color: #999; padding: 10rpx; } }
  .search-input-wrap { background: #f3f4f6; border-radius: 20rpx; padding: 20rpx 30rpx; margin-bottom: 30rpx; input { font-size: 30rpx; } }
  .search-results { max-height: 600rpx; .result-item { padding: 30rpx 10rpx; border-bottom: 1rpx solid #f3f4f6; font-size: 30rpx; color: #374151; &.custom { color: #a855f7; font-weight: bold; } } .search-empty { text-align: center; padding: 100rpx 0; color: #9ca3af; font-size: 28rpx; } }
}

@keyframes drawerUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
@keyframes slideUp { from { opacity: 0; transform: translateY(30rpx); } to { opacity: 1; transform: translateY(0); } }
.animate-slide-up { animation: slideUp 0.5s ease-out; }
</style>
