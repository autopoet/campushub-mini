<template>
  <view class="container">
    <view class="glass-card">
      <view class="header">
        <text class="title">完善个人资料</text>
        <text class="subtitle">让搭子们更好地认识你</text>
      </view>

      <!-- 头像选择 -->
      <view class="avatar-section">
        <button class="avatar-wrapper" open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
          <image class="avatar" :src="formData.avatarUrl || defaultAvatar"></image>
          <view class="edit-badge">
            <text class="uni-icons-camera"></text>
          </view>
        </button>
        <text class="hint">点击上传头像</text>
      </view>

      <!-- 表单部分 -->
      <view class="form-group">
        <view class="input-item">
          <text class="label">昵称</text>
          <input type="nickname" v-model="formData.nickname" class="input" placeholder="请输入或获取昵称" @blur="onNicknameBlur" />
        </view>

        <view class="input-item">
          <text class="label">年级</text>
          <picker :range="gradeRange" @change="onGradeChange">
            <view class="picker-val">{{ formData.grade || '请选择年级' }}</view>
          </picker>
        </view>

        <view class="input-item">
          <text class="label">常用技能 (多选)</text>
          <view class="tag-cloud">
            <view v-for="skill in skillOptions" :key="skill" class="tag" 
                  :class="{ active: formData.skills.includes(skill) }"
                  @click="toggleSkill(skill)">
              {{ skill }}
            </view>
          </view>
        </view>

        <view class="input-item">
          <text class="label">联系方式</text>
          <view class="contact-type">
            <view v-for="type in contactTypes" :key="type.value" class="type-btn"
                  :class="{ active: formData.contactInfo.type === type.value }"
                  @click="formData.contactInfo.type = type.value">
              {{ type.label }}
            </view>
          </view>
          <input type="text" v-model="formData.contactInfo.value" class="input" :placeholder="'请输入您的' + currentContactLabel" />
        </view>
      </view>

      <button class="submit-btn" :loading="loading" @click="submit">开启组队之旅</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useUserStore } from '@/store/user'

const userStore = useUserStore()
const loading = ref(false)
const defaultAvatar = 'https://mmbiz.qpic.cn/mmbiz/icTdbqWNOwNRna42FI242Lcia07jQodd2FJGIYQfG0LAJGFxM4FbnQP6yfMxBgJ0F3YRqJCJ1aPAK2dQagdusBZg/0'

const gradeRange = ['大一', '大二', '大三', '大四', '研一', '研二', '研三', '博士及以上']
const skillOptions = ['编程', '建模', '文档撰写', 'PPT', '英语', '答辩']
const contactTypes = [
  { label: '微信', value: 'wechat' },
  { label: 'QQ', value: 'qq' },
  { label: '手机', value: 'phone' }
]

const formData = reactive({
  avatarUrl: '',
  nickname: '',
  grade: '',
  skills: [] as string[],
  contactInfo: {
    type: 'wechat',
    value: ''
  }
})

const currentContactLabel = computed(() => {
  return contactTypes.find(t => t.value === formData.contactInfo.type)?.label || ''
})

const onChooseAvatar = (e: any) => {
  formData.avatarUrl = e.detail.avatarUrl
}

const onNicknameBlur = (e: any) => {
  formData.nickname = e.detail.value
}

const onGradeChange = (e: any) => {
  formData.grade = gradeRange[e.detail.value]
}

const toggleSkill = (skill: string) => {
  const index = formData.skills.indexOf(skill)
  if (index > -1) {
    formData.skills.splice(index, 1)
  } else {
    formData.skills.push(skill)
  }
}

const submit = async () => {
  if (!formData.avatarUrl || !formData.nickname || !formData.grade || !formData.contactInfo.value) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }

  loading.value = true
  const success = await userStore.registerUser(formData)
  loading.value = false

  if (success) {
    uni.showToast({ title: '注册成功', icon: 'success' })
    setTimeout(() => {
      uni.reLaunch({ url: '/pages/index/index' })
    }, 1500)
  }
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx;
  display: flex;
  align-items: center;
}

.glass-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(20px);
  border-radius: 40rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0,0,0,0.1);
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
  .title { font-size: 44rpx; font-weight: 700; color: #333; display: block; }
  .subtitle { font-size: 26rpx; color: #888; margin-top: 10rpx; display: block; }
}

.avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 40rpx;
  
  .avatar-wrapper {
    padding: 0;
    width: 160rpx;
    height: 160rpx;
    border-radius: 50%;
    margin-bottom: 10rpx;
    background: #f0f0f0;
    overflow: hidden;
    position: relative;
    .avatar { width: 100%; height: 100%; }
  }
  .hint { font-size: 24rpx; color: #999; }
}

.form-group {
  .input-item {
    margin-bottom: 30rpx;
    .label { font-size: 28rpx; color: #666; font-weight: 600; margin-bottom: 15rpx; display: block; }
    .input { 
      background: #f8f8f8; 
      padding: 20rpx 30rpx; 
      border-radius: 12rpx; 
      font-size: 28rpx; 
    }
    .picker-val {
      background: #f8f8f8;
      padding: 20rpx 30rpx;
      border-radius: 12rpx;
      font-size: 28rpx;
      color: #333;
    }
  }
}

.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
  .tag {
    padding: 10rpx 30rpx;
    background: #f0f0f0;
    border-radius: 30rpx;
    font-size: 24rpx;
    color: #666;
    transition: all 0.3s;
    &.active {
      background: #764ba2;
      color: #fff;
    }
  }
}

.contact-type {
  display: flex;
  gap: 20rpx;
  margin-bottom: 15rpx;
  .type-btn {
    flex: 1;
    text-align: center;
    padding: 15rpx 0;
    background: #f0f0f0;
    border-radius: 10rpx;
    font-size: 24rpx;
    color: #666;
    &.active {
      background: #764ba2;
      color: #fff;
    }
  }
}

.submit-btn {
  margin-top: 60rpx;
  background: linear-gradient(90deg, #667eea, #764ba2);
  color: #fff;
  border-radius: 50rpx;
  font-weight: 600;
  border: none;
}
</style>
