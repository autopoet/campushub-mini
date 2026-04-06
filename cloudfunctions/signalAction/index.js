const cloud = require('wx-server-sdk')
cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})
const db = cloud.database()

// 核心逻辑：处理消息中心的所有原子操作（同意、拒绝、删除）
// 理由：云函数拥有管理员权限，可无视数据库“仅创建者可写”的物理限制
exports.main = async (event, context) => {
  const { action, id, contacts } = event
  const { OPENID } = cloud.getWXContext()

  try {
    const pokeRes = await db.collection('pokes').doc(id).get()
    const poke = pokeRes.data

    // 1. 同意邀约 (需同步自己的联系方式快照)
    if (action === 'accept') {
      if (poke.receiverId !== OPENID) return { success: false, msg: '无权操作他人邀约' }
      return await db.collection('pokes').doc(id).update({
        data: {
          status: 'accepted',
          receiverContacts: contacts,
          updateTime: db.serverDate()
        }
      })
    }

    // 2. 婉拒邀约
    if (action === 'ignore') {
      if (poke.receiverId !== OPENID) return { success: false, msg: '无权操作他人邀约' }
      return await db.collection('pokes').doc(id).update({
        data: {
          status: 'rejected',
          updateTime: db.serverDate()
        }
      })
    }

    // 3. 删除记录 (无论是发送者撤回还是接收者清理)
    if (action === 'delete') {
      // 只有邀约双方才有权删除这条互动记录
      if (poke.senderId !== OPENID && poke.receiverId !== OPENID) return { success: false, msg: '权限不足' }
      return await db.collection('pokes').doc(id).remove()
    }

    return { success: false, msg: '未定义的操作' }
  } catch (e) {
    console.error('[SignalAction] Error:', e)
    return { success: false, error: e }
  }
}
