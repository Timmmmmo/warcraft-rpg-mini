# 魔兽RPG小游戏

基于 Cocos Creator 开发的魔兽主题 RPG 小游戏。

## 项目概述

这是一个轻量级的 RPG 游戏项目，采用 Cocos Creator 引擎开发，支持 Web、iOS、Android 等多平台发布。

## 项目结构

```
warcraft-rpg-mini/
├── README.md              # 项目说明
├── .gitignore            # Git 忽略规则
├── assets/               # 美术资源目录
│   ├── images/          # 图片资源
│   ├── audio/           # 音频资源
│   └── animations/      # 动画资源
├── scripts/             # 脚本目录（TypeScript/JavaScript）
│   ├── game/           # 游戏逻辑
│   ├── ui/             # UI 相关脚本
│   ├── utils/          # 工具函数
│   └── config/         # 配置文件
├── src/                # 源代码目录
│   ├── scenes/        # 场景文件
│   ├── prefabs/       # 预制体
│   └── components/    # 组件
└── docs/              # 文档目录
    ├── design.md      # 游戏设计文档
    ├── architecture.md # 架构设计
    └── api.md         # API 文档
```

## 快速开始

### 环境要求

- Cocos Creator 3.x 或更高版本
- Node.js 14+
- Git

### 安装步骤

1. 克隆仓库
```bash
git clone https://github.com/Timmmmmo/warcraft-rpg-mini.git
cd warcraft-rpg-mini
```

2. 使用 Cocos Creator 打开项目
   - 打开 Cocos Creator
   - 选择 "打开项目"
   - 选择本项目目录

3. 安装依赖（如有 package.json）
```bash
npm install
```

## 开发指南

### 代码规范

- 使用 TypeScript 编写脚本
- 遵循 Cocos Creator 最佳实践
- 提交前运行代码检查

### 分支管理

- `main` - 主分支，稳定版本
- `develop` - 开发分支
- `feature/*` - 功能分支
- `bugfix/*` - 修复分支

### 提交规范

使用 Conventional Commits 规范：
- `feat: 新功能`
- `fix: 修复`
- `docs: 文档`
- `style: 代码风格`
- `refactor: 重构`
- `test: 测试`

## 功能特性

- [ ] 角色系统
- [ ] 战斗系统
- [ ] 任务系统
- [ ] 装备系统
- [ ] 技能系统
- [ ] 存档系统

## 构建与发布

### Web 版本

```bash
# 构建 Web 版本
cocos build --platform web
```

### 移动平台

```bash
# 构建 Android
cocos build --platform android

# 构建 iOS
cocos build --platform ios
```

## 文档

详细文档请查看 `docs/` 目录：
- [游戏设计文档](docs/design.md)
- [架构设计](docs/architecture.md)
- [API 文档](docs/api.md)

## 贡献指南

欢迎提交 Issue 和 Pull Request！

## 许可证

MIT License

## 联系方式

如有问题，请通过以下方式联系：
- 提交 Issue
- 发送邮件至项目维护者

---

**最后更新**: 2026-03-30
