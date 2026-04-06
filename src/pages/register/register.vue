<template>
  <view class="register-container">
    <view class="step-indicator">
      <view class="step-line"><view class="line-active" :style="{ width: currentStep === 1 ? '50%' : '100%' }"></view></view>
      <view class="step-nodes">
        <view class="node" :class="{ active: currentStep >= 1 }">1</view>
        <view class="node" :class="{ active: currentStep >= 2 }">2</view>
      </view>
    </view>

    <view v-if="currentStep === 1" class="glass-card animate-in">
      <view class="header"><text class="title">第一步：基础信息</text><text class="subtitle">这些是建立联系的必要信息</text></view>
      <view class="avatar-section">
        <button class="avatar-wrapper" open-type="chooseAvatar" @chooseavatar="onChooseAvatar"><image class="avatar" :src="formData.avatarUrl || defaultAvatar"></image></button>
        <text class="hint">点击设置头像</text>
      </view>
      <view class="form-body">
        <view class="input-group"><text class="label">昵称</text><input type="nickname" v-model="formData.nickname" placeholder="点击或输入昵称" @blur="onNicknameBlur" /></view>
        <view class="input-group"><text class="label">所属学校</text><view class="school-selector" @click="showSchoolSearch = true"><text :class="{ 'placeholder': !formData.school }">{{ formData.school || '搜索选择您的学校' }}</text></view></view>
        <view class="input-group"><text class="label">当前年级</text><picker :range="gradeRange" @change="onGradeChange"><view class="picker-val">{{ formData.grade || '点击选择年级' }}</view></picker></view>
        <view class="input-group"><text class="label">联系方式</text>
          <view class="contact-tabs"><view v-for="t in contactTypes" :key="t.value" class="tab" :class="{ active: formData.contactInfo.type === t.value }" @click="formData.contactInfo.type = t.value">{{ t.label }}</view></view>
          <input type="text" v-model="formData.contactInfo.value" :placeholder="'请输入您的' + currentContactLabel + '号'" />
        </view>
      </view>
      <button class="next-btn" @click="nextStep">下一步</button>
    </view>

    <view v-if="currentStep === 2" class="glass-card animate-in">
      <view class="header"><text class="title">第二步：我的技能</text><text class="subtitle">让队友更快锁定你（可跳过）</text></view>
      <view class="skills-wall"><view v-for="skill in skillOptions" :key="skill" class="skill-tag" :class="{ selected: formData.skills.includes(skill) }" @click="toggleSkill(skill)">{{ skill }}</view></view>
      <view class="custom-skill"><input type="text" v-model="newSkill" placeholder="自定义技能..." @confirm="addCustomSkill" /><view class="add-btn" @click="addCustomSkill">+</view></view>
      <view class="btn-group">
        <button class="submit-btn" :loading="submitting" @click="finish">开始组队之旅</button>
        <view class="skip-btn" @click="finish">暂时跳过，直接进入</view>
      </view>
    </view>

    <view v-if="showSchoolSearch" class="search-overlay animate-fade">
      <view class="search-box">
        <input focus type="search" placeholder="输入校名关键字搜索..." v-model="searchKey" />
        <scroll-view scroll-y class="search-results">
          <view v-for="s in filteredSchools" :key="s" class="school-item" @click="selectSchool(s)">{{ s }}</view>
          <view v-if="filteredSchools.length === 0 && searchKey" class="school-item custom" @click="selectSchool(searchKey)">找不到？使用：{{ searchKey }}</view>
        </scroll-view>
        <view class="close-btn" @click="showSchoolSearch = false">取消</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '@/store/user'
import schoolList from '@/static/schools.json'

const currentStep = ref(1)
const userStore = useUserStore()
const showSchoolSearch = ref(false)
const searchKey = ref('')
const newSkill = ref('')
const submitting = ref(false)
const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const gradeRange = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士及以上']
const skillOptions = ref(['编程', '建模', '文档撰写', 'PPT', '视频剪辑', '策划', '嵌入式', '英语', '答辩', '其它'])
const contactTypes = [{ label: '微信', value: 'wechat' }, { label: 'QQ', value: 'qq' }, { label: '手机', value: 'phone' }]

const formData = reactive({ avatarUrl: '', nickname: '', school: '', grade: '', skills: [] as string[], contactInfo: { type: 'wechat', value: '' } })

const filteredSchools = computed(() => {
  if (!searchKey.value) return schoolList.slice(0, 10)
  return schoolList.filter(s => s.includes(searchKey.value)).slice(0, 20)
})

const currentContactLabel = computed(() => contactTypes.find(t => t.value === formData.contactInfo.type)?.label || '')

const onChooseAvatar = (e: any) => formData.avatarUrl = e.detail.avatarUrl
const onNicknameBlur = (e: any) => formData.nickname = e.detail.value
const onGradeChange = (e: any) => formData.grade = gradeRange[e.detail.value]

const selectSchool = (name: string) => { formData.school = name; showSchoolSearch.value = false; searchKey.value = '' }
const toggleSkill = (s: string) => { const i = formData.skills.indexOf(s); i > -1 ? formData.skills.splice(i, 1) : formData.skills.push(s) }
const addCustomSkill = () => { if (!newSkill.value) return; if (!skillOptions.value.includes(newSkill.value)) skillOptions.value.push(newSkill.value); if (!formData.skills.includes(newSkill.value)) formData.skills.push(newSkill.value); newSkill.value = '' }

const nextStep = () => { if (!formData.avatarUrl || !formData.nickname || !formData.school || !formData.grade || !formData.contactInfo.value) { uni.showToast({ title: '核心信息不全', icon: 'none' }); return }; currentStep.value = 2 }

const finish = async () => {
  submitting.value = true
  const success = await userStore.registerUser(formData)
  submitting.value = false
  if (success) { uni.showToast({ title: '开启之旅', icon: 'success' }); setTimeout(() => uni.reLaunch({ url: '/pages/index/index' }), 1500) }
}
</script>

<style lang="scss" scoped>
.register-container {
  min-height: 100vh; background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%); padding: 80rpx 40rpx;
}
.step-indicator {
  margin-bottom: 60rpx; position: relative;
  .step-line { position: absolute; top: 50%; width: 100%; height: 4rpx; background: #ddd; .line-active { height: 100%; background: #764ba2; transition: width 0.3s; } }
  .step-nodes { display: flex; justify-content: space-between; position: relative; .node { width: 44rpx; height: 44rpx; background: #fff; border: 4rpx solid #ddd; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 24rpx; &.active { border-color: #764ba2; color: #764ba2; font-weight: bold; } } }
}
.glass-card { background: rgba(255, 255, 255, 0.9); border-radius: 40rpx; padding: 60rpx 40rpx; box-shadow: 0 10rpx 40rpx rgba(0,0,0,0.05);
  .header { text-align: center; margin-bottom: 40rpx; .title { font-size: 38rpx; font-weight: bold; color: #333; display: block; } .subtitle { font-size: 22rpx; color: #999; margin-top: 10rpx; display: block; } }
}
.avatar-section { display: flex; flex-direction: column; align-items: center; margin-bottom: 40rpx; .avatar-wrapper { padding:0; width:150rpx; height:150rpx; border-radius:50%; overflow:hidden; background:#eee; .avatar {width:100%; height:100%;} } .hint {font-size:22rpx; color:#bbb; margin-top:10rpx;} }
.input-group { margin-bottom: 25rpx; .label { font-size: 26rpx; font-weight: bold; color: #666; margin-bottom: 12rpx; display: block; } input, .picker-val, .school-selector { background: #f9f9f9; padding: 22rpx 30rpx; border-radius: 16rpx; font-size: 28rpx; } .placeholder { color: #bbb; } }
.contact-tabs { display: flex; gap: 15rpx; margin-bottom: 15rpx; .tab { flex: 1; text-align:center; padding:12rpx 0; background:#eee; border-radius:8rpx; font-size:22rpx; &.active {background:#764ba2; color:#fff;} } }
.skills-wall { display:flex; flex-wrap:wrap; gap:18rpx; margin-bottom:40rpx; .skill-tag { padding:12rpx 30rpx; background:#f0f0f0; border-radius:30rpx; font-size:24rpx; &.selected {background:#764ba2; color:#fff;} } }
.custom-skill { display:flex; gap:15rpx; background:#f9f9f9; padding:10rpx 25rpx; border-radius:12rpx; input {flex:1; font-size:24rpx;} .add-btn {color:#764ba2; font-weight:bold; font-size:40rpx;} }
.next-btn, .submit-btn { margin-top: 50rpx; width:100%; height:90rpx; line-height:90rpx; background:linear-gradient(90deg, #667eea, #764ba2); color:#fff; border-radius:45rpx; border:none; font-weight:bold; font-size:30rpx; }
.skip-btn { text-align:center; margin-top:30rpx; font-size:24rpx; color:#999; text-decoration:underline; }
.search-overlay { position:fixed; inset:0; background:rgba(0,0,0,0.7); z-index:999; display:flex; align-items:center; justify-content:center; padding:40rpx;
  .search-box { width:100%; background:#fff; border-radius:30rpx; padding:30rpx; input {background:#f0f0f0; padding:20rpx; border-radius:15rpx; margin-bottom:20rpx;} .search-results {max-height:400rpx; .school-item {padding:25rpx; border-bottom:1rpx solid #eee; font-size:26rpx; &.custom {color:#764ba2; font-weight:bold;} }} .close-btn {margin-top:20rpx; text-align:center; color:#888; font-size:24rpx;} }
}
.animate-in { animation: slideUp 0.3s ease-out; }
@keyframes slideUp { from { opacity: 0; transform: translateY(20rpx); } to { opacity: 1; transform: translateY(0); } }
</style>
