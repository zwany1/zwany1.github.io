---
layout: page
title: 聊天室
keywords: 聊天室,chat,在线聊天,实时聊天,群聊
description: 打开就能一起聊的在线房间，手机、平板、电脑互通。
permalink: /chat/
comments: false
aside: false
---

{% include chat-room.html
   station="朱的小屋 · 聊天室"
   rooms="大厅|一起聊聊天，随便聊什么都行,技术|代码、踩坑与折腾记录,闲聊|无关紧要的日常,吐槽|有话直说"
   transport="ws"
   ws="wss://chat.myzwy.qzz.io/ws" %}

## 怎么用

1. 手机 / 平板 / 电脑分别打开这个网址，各自起一个昵称。
2. 左侧选一个房间（大厅 / 技术 / 闲聊 / 吐槽），消息实时互达。
3. 后进来的人也能看到最近的聊天记录。

鼠标移到消息上可以**加表情回应**，输入框里输入 `@昵称` 会渲染成高亮提及，
消息内容是一条图片链接时会**自动内嵌成图片**。

## 这个聊天室是怎么跑起来的

页面本身是静态的（托管在 GitHub Pages），实时部分连的是**自建后端**：

```
浏览器（GitHub Pages 静态页）
   │  WebSocket / wss://chat.myzwy.qzz.io/ws?room=大厅
   ▼
Cloudflare Worker（入口 + 身份签发 + 人机校验）
   ▼
Durable Object「一个房间一个实例」（SQLite 存历史与表情回应）
```

服务端负责这些客户端做不了的事：

- **消息历史持久化**——换设备也能看到，不只存在浏览器里
- **服务端时间戳**——跨设备排序不受各人手机时钟影响
- **服务端限流**——消息与表情回应都在服务端计数
- **服务端签发身份**——`uid` 由服务端签名下发，客户端伪造无效

### 身份与登录

首次进入先过一次**人机校验**（Cloudflare Turnstile，隐形模式），通过后服务端签发一张
**匿名身份凭证**存在本地；之后进入不再校验。点左下角的图标可以用 **GitHub 登录**，
登录后换设备也是同一个身份。

> 目前仍不支持踢人 / 禁言——身份已经立起来了，但还没有管理入口。

## 复用到其他页面

{% raw %}
```liquid
{% include chat-room.html rooms="大厅|一起聊聊天,技术|代码与踩坑" %}
```
{% endraw %}

可用参数：

| 参数 | 默认值 | 说明 |
| --- | --- | --- |
| `rooms` | `大厅` | 房间列表，逗号分隔；每项 `名称` 或 `名称\|主题` |
| `room` | 第一项 | 默认进入哪个房间 |
| `station` | `聊天室` | 左上角站点名 |
| `transport` | `ws` | 通道：`ws`(自建后端，功能最全) / `mqtt`(公共频道) / `local`(仅本机多标签) |
| `ws` | 空 | 自建服务端地址（`transport="ws"` 时必填） |
| `broker` | `wss://broker.emqx.io:8084/mqtt` | 公共频道地址（`transport="mqtt"` 时用） |
| `key` | 空 | 公共频道的房间口令 |
| `limit` | `200` | 保留的历史条数 |
| `height` | `620` | 面板高度（px） |
| `notice` | 自动 | 顶部提示文案；`notice="off"` 可关闭 |

> 表情回应目前只有 `transport="ws"`（自建后端）支持；用 `mqtt` / `local` 时不会显示回应按钮。

组件自带样式与脚本（`assets/chat-room/`），引用时会自动注入一次，无需在页面里手动引入。
服务端源码在仓库 `chat-worker/`，改动后用 `npx wrangler deploy` 发布。
