<script setup lang="ts">
import { onLaunch, onShow, onHide } from "@dcloudio/uni-app";
import { useUserStore } from './store/user'
import { CLOUD_ENV_ID } from './config'

onLaunch(() => {
  console.log("App Launch");
  
  // 初始化云开发环境
  if (!wx.cloud) {
    console.error('请使用 2.2.3 或以上的基础库以使用云能力')
  } else {
    wx.cloud.init({
      env: CLOUD_ENV_ID,
      traceUser: true,
    })
  }

  // 触发全局登录
  const userStore = useUserStore()
  userStore.login()
});
onShow(() => {
  console.log("App Show");
});
onHide(() => {
  console.log("App Hide");
});
</script>
<style></style>
