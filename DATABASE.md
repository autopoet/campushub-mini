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
- `category`: **String** ('COMPETITION' | 'POSTGRAD' | 'CIVIL' | 'DAILY')
- `color`: **String** (背景颜色代码)
- `publisherName`: **String** (冗余存储)
- `publisherAvatar`: **String** (冗余存储)
- `school`: **String** (发布校友的所属学校)
- `pokesCount`: **Number** (原子计数：感兴趣的人数)
- `createTime`: **Date**

### 3. `pokes` (信号/戳一戳集合)
双向解锁的核心纽带。
- `_id`: **String**
- `targetTeamId`: **String** (关联 teams._id)
- `targetTeamContent`: **String** (需求快照，方便列表展示)
- `receiverId`: **String** (接收者 OpenID)
- `receiverName`: **String** (接收者昵称)
- `receiverAvatar`: **String** (接收者头像)
- `receiverContacts`: **Object** (接收者同意后回填的联系方式)
- `senderId`: **String** (发送者 OpenID)
- `senderInfo`: **Object** (包含 nickname, avatar, contacts, school)
- `status`: **String** ('pending' | 'accepted' | 'ignored')
- `createTime`: **Date**
