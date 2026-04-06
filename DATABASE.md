# CampusHub Mini - 数据库设计 (WeChat Cloud DB)

微信云开发是基于 Document 的 NoSQL 数据库。针对 MVP 版，设计了以下三个核心集合：

### 1. `users` (用户集合)
存储用户的基本画像和高度隐私的联系方式。
- `_id`: **String** (微信 OpenID，由云开发自动生成)
- `nickname`: **String** (用户昵称)
- `avatarUrl`: **String** (头像云存储访问地址)
- `skills`: **Array<String>** (核心技能标签)
- `grade`: **String** (年级)
- `contactInfo`: **Object**
  - `type`: **String** ('wechat' / 'phone' / 'qq')
  - `value`: **String** (具体的通讯账号)
- `createTime`: **Date** (注册时间)
- `updateTime`: **Date** (更新时间)

### 2. `teams` (队伍/需求集合)
存储招募卡片的信息。
- `_id`: **String**
- `creatorId`: **String** (关联 users._id)
- `title`: **String** (竞赛/活动名称)
- `roleGap`: **String** (角色缺口)
- `description`: **String** (详细描述)
- `status`: **Number** (0-招募中, 1-已招满, 2-已失效)
- `applyCount`: **Number** (当前申请人数)
- `createTime`: **Date**

### 3. `applications` (申请记录集合)
双向解锁的核心纽带。
- `_id`: **String**
- `teamId`: **String** (关联队伍 ID)
- `applicantId`: **String** (申请人 OpenID)
- `creatorId`: **String** (队长 OpenID，为了查询方便冗余存储)
- `status`: **Number** (0-审批中, 1-已通过-解锁, 2-已拒绝)
- `applyMsg`: **String** (申请信息/自我介绍)
- `createTime`: **Date**
