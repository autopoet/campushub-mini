import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { CLOUD_ENV_ID } from '../config'

export const useUserStore = defineStore('user', () => {
  const openid = ref('')
  const userInfo = ref<any>(null)
  const isLogin = ref(false)
  const isRegistered = ref(false) // 记录是否已注册

  // 检查社交联系方式是否至少填了一项
  const isContactComplete = computed(() => {
    if (!userInfo.value || !userInfo.value.contacts) return false
    const { phone, qq, wechat } = userInfo.value.contacts
    return !!(phone || qq || wechat)
  })

  // 🛡️ MVP 强化：检查基础资料（昵称、学校、联系方式）是否完整
  const isProfileComplete = computed(() => {
    if (!userInfo.value) return false
    const hasBasic = !!(userInfo.value.nickname && userInfo.value.school)
    return hasBasic && isContactComplete.value
  })

  // 这里的 login 只是调用云函数获取 openid
  // 真正的“注册/补全信息”逻辑可以在后续页面完成
  const login = async () => {
    if (openid.value && isLogin.value) {
      console.log('[Login] Already logged in, skipping.')
      return
    }
    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        config: {
          env: CLOUD_ENV_ID
        }
      })
      const result = res.result as any
      if (result && result.openid) {
        openid.value = result.openid
        isLogin.value = true
        console.log('[Login] Success, OpenID:', openid.value)
        
        // 登录成功后立即检查注册状态
        await fetchUserInfo(result.openid)
      }
    } catch (e) {
      console.error('[Login] Failed:', e)
    }
  }

  const fetchUserInfo = async (id: string) => {
    const db = wx.cloud.database()
    try {
      const res = await db.collection('users').doc(id).get()
      if (res.data) {
        userInfo.value = res.data
        isRegistered.value = true
        console.log('[FetchUserInfo] Registered user:', userInfo.value)
      } else {
        isRegistered.value = false
      }
    } catch (e) {
      isRegistered.value = false
      console.log('[FetchUserInfo] User not found, redirection required.')
    }
  }

  // 注册/完善信息 Action
  const registerUser = async (formData: any) => {
    // 1. 如果 openid 为空，尝试重新登录一次
    if (!openid.value) {
      console.log('[Register] OpenID missing, retrying login...')
      await login()
    }
    
    if (!openid.value) {
      uni.showToast({ title: '无法获取用户信息，请返回重试', icon: 'none' })
      return false
    }

    const db = wx.cloud.database()
    try {
      // 2. 上传头像到云存储（如果是临时路径）
      let cloudAvatarUrl = formData.avatarUrl
      if (!formData.avatarUrl.startsWith('cloud://') && !formData.avatarUrl.startsWith('https://')) {
        console.log('[Register] Uploading avatar...')
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${openid.value}_${Date.now()}.png`,
          filePath: formData.avatarUrl
        })
        cloudAvatarUrl = uploadRes.fileID
        
        // Convert cloudID to HTTPS right away for fast loading everywhere
        try {
          const tempRes = await wx.cloud.getTempFileURL({ fileList: [cloudAvatarUrl] })
          if (tempRes.fileList && tempRes.fileList[0].tempFileURL) {
            cloudAvatarUrl = tempRes.fileList[0].tempFileURL
          }
        } catch (err) {
          console.error('[Register] Failed to convert to HTTPS:', err)
        }
      }

      // 3. 写入数据库
      const userData = {
        avatarUrl: cloudAvatarUrl,
        nickname: formData.nickname,
        school: formData.school,
        grade: formData.grade,
        skills: formData.skills,
        contacts: formData.contacts,
        createTime: db.serverDate(),
        updateTime: db.serverDate()
      }
      
      console.log('[Register] Saving doc to DB:', openid.value)
      await db.collection('users').doc(openid.value).set({ data: userData })
      
      userInfo.value = userData
      isRegistered.value = true
      return true
    } catch (e) {
      console.error('[Register] Failed final error:', e)
      uni.showToast({ title: '网络繁忙，请稍后再试', icon: 'none' })
      return false
    }
  }

  return {
    openid,
    userInfo,
    isLogin,
    isRegistered,
    isContactComplete,
    isProfileComplete,
    login,
    registerUser
  }
})
