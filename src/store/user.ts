import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useUserStore = defineStore('user', () => {
  const openid = ref('')
  const userInfo = ref<any>(null)
  const isLogin = ref(false)
  const isRegistered = ref(false) // 记录是否已注册

  // 这里的 login 只是调用云函数获取 openid
  // 真正的“注册/补全信息”逻辑可以在后续页面完成
  const login = async () => {
    try {
      const res = await wx.cloud.callFunction({
        name: 'login',
        config: {
          env: 'cloud1-5gw9rppc5093e077'
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
    const db = wx.cloud.database()
    try {
      // 1. 上传头像到云存储（如果是临时路径）
      let cloudAvatarUrl = formData.avatarUrl
      if (formData.avatarUrl.startsWith('http://tmp') || formData.avatarUrl.startsWith('wxfile://')) {
        const uploadRes = await wx.cloud.uploadFile({
          cloudPath: `avatars/${openid.value}_${Date.now()}.png`,
          filePath: formData.avatarUrl
        })
        cloudAvatarUrl = uploadRes.fileID
      }

      // 2. 写入数据库
      const userData = {
        ...formData,
        _id: openid.value,
        avatarUrl: cloudAvatarUrl,
        createTime: new Date(),
        updateTime: new Date()
      }
      
      await db.collection('users').doc(openid.value).set({ data: userData })
      
      userInfo.value = userData
      isRegistered.value = true
      return true
    } catch (e) {
      console.error('[Register] Failed:', e)
      return false
    }
  }

  return {
    openid,
    userInfo,
    isLogin,
    isRegistered,
    login,
    registerUser
  }
})
