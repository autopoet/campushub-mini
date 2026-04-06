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
            <input type="nickname" v-model="formData.nickname" placeholder="获取微信昵称" @blur="onNicknameBlur" />
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
              <view class="selector-box">{{ formData.grade || '选择年级' }}</view>
            </picker>
          </view>

          <view class="input-item">
            <text class="label">联系方式</text>
            <view class="contact-selector">
              <view v-for="t in contactTypes" :key="t.value" 
                    @click="formData.contactInfo.type = t.value"
                    :class="['type-pill', { active: formData.contactInfo.type === t.value }]">
                {{ t.label }}
              </view>
            </view>
            <input type="text" v-model="formData.contactInfo.value" :placeholder="'请输入您的' + currentContactLabel + '号'" />
          </view>
        </view>

        <button class="primary-btn" @click="currentStep = 2">下一步</button>
      </view>

      <!-- 第二步：技能标签 (可选) -->
      <view v-if="currentStep === 2" class="step-content-full">
        <view class="top-content">
          <view class="header">
            <text class="title">我的技能</text>
            <text class="subtitle">展示特长，匹配更精准</text>
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
          <button class="primary-btn" :loading="submitting" @click="finish">开启组队之旅</button>
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
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '@/store/user'
import schoolList from '@/static/schools.json'

const userStore = useUserStore()
const currentStep = ref(1)
const showDrawer = ref(false)
const searchKey = ref('')
const newSkill = ref('')
const submitting = ref(false)
const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const gradeRange = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士及以上']
const skillOptions = ref(['编程', '建模', '文档撰写', 'PPT', '视频剪辑', '策划', '嵌入式', '英语', '答辩'])
const contactTypes = [{ label: '微信', value: 'wechat' }, { label: 'QQ', value: 'qq' }, { label: '手机', value: 'phone' }]

const formData = reactive({ avatarUrl: '', nickname: '', school: '', grade: '', skills: [] as string[], contactInfo: { type: 'wechat', value: '' } })

const filteredSchools = computed(() => {
  if (!searchKey.value) return []
  return (schoolList as string[]).filter(s => s.includes(searchKey.value)).slice(0, 30)
})

const currentContactLabel = computed(() => contactTypes.find(t => t.value === formData.contactInfo.type)?.label || '')

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
  if (!formData.avatarUrl || !formData.nickname || !formData.school || !formData.grade || !formData.contactInfo.value) {
    uni.showToast({ title: '基础信息必填项未完成', icon: 'none' }); return
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
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(25px);
  border-radius: 48rpx;
  padding: 60rpx 45rpx;
  box-shadow: 0 40rpx 100rpx rgba(0,0,0,0.2);
  min-height: 85vh;
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
  text-align: center; margin-bottom: 50rpx;
  .title { font-size: 46rpx; font-weight: 800; color: #1a1a1a; display: block; }
  .subtitle { font-size: 24rpx; color: #666; margin-top: 12rpx; display: block; }
}

.avatar-section {
  display: flex; justify-content: center; margin-bottom: 50rpx;
  .avatar-btn {
    width: 170rpx; height: 170rpx; border-radius: 50%; padding: 0; background: #fff; box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.1); position: relative;
    .avatar { width: 100%; height: 100%; border-radius: 50%; }
    .camera-icon { position: absolute; bottom: 0; right: 0; background: #764ba2; color: #fff; width: 50rpx; height: 50rpx; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; border: 4rpx solid #fff; }
  }
}

.input-item {
  margin-bottom: 35rpx;
  .label { font-size: 26rpx; font-weight: 700; color: #4b5563; margin-bottom: 12rpx; display: block; padding-left: 10rpx; }
  input, .selector-box { background: rgba(0,0,0,0.03); border-radius: 20rpx; padding: 25rpx 35rpx; font-size: 30rpx; color: #1f2937; }
  .placeholder { color: #9ca3af; }
}

.contact-selector {
  display: flex; gap: 15rpx; margin-bottom: 15rpx;
  .type-pill { flex: 1; text-align: center; padding: 12rpx 0; background: rgba(0,0,0,0.05); border-radius: 12rpx; font-size: 24rpx; color: #6b7280; &.active { background: #764ba2; color: #fff; font-weight: bold; } }
}

.skills-container {
  display: flex; flex-wrap: wrap; gap: 18rpx; margin-bottom: 40rpx;
  .skill-pill { padding: 14rpx 32rpx; background: rgba(118,75,162,0.08); color: #764ba2; border-radius: 40rpx; font-size: 26rpx; transition: all 0.2s; &.selected { background: #764ba2; color: #fff; box-shadow: 0 8rpx 20rpx rgba(118,75,162,0.3); } }
}

.custom-add {
  display: flex; align-items: center; background: rgba(0,0,0,0.03); border-radius: 20rpx; padding: 10rpx 25rpx; margin-bottom: 40rpx;
  input { flex: 1; background: transparent; font-size: 26rpx; }
  .add-circle { width: 50rpx; height: 50rpx; background: #764ba2; color: #fff; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 32rpx; margin-left: 20rpx; }
}

.puzzle-illustration {
  height: 240rpx; position: relative; width: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; overflow: visible; margin: 60rpx 0;
  &.large { height: 450rpx; }
  .puzzle-piece {
    position: absolute; width: 110rpx; height: 110rpx; border-radius: 24rpx; opacity: 0.7; box-shadow: 0 10rpx 30rpx rgba(0,0,0,0.1);
    &.main {
      background: linear-gradient(135deg, #6366f1, #a855f7); transform: rotate(15deg); left: 28%;
    }
    &.floating {
      background: #a5f3fc; transform: rotate(-20deg); right: 28%; animation: float 3.5s ease-in-out infinite;
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
