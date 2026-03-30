# API 文档

## GameManager

### 方法

#### getInstance()
获取 GameManager 单例

```typescript
const gameManager = GameManager.getInstance();
```

#### loadScene(sceneName: string)
加载场景

```typescript
gameManager.loadScene('MainScene');
```

#### saveGame(data: any)
保存游戏

```typescript
gameManager.saveGame(playerData);
```

#### loadGame()
加载游戏

```typescript
const data = gameManager.loadGame();
```

## BattleSystem

### 方法

#### startBattle(player: Character, enemy: Character)
开始战斗

```typescript
battleSystem.startBattle(player, enemy);
```

#### executeSkill(skill: Skill, caster: Character, target: Character)
执行技能

```typescript
battleSystem.executeSkill(skill, player, enemy);
```

#### calculateDamage(attacker: Character, defender: Character)
计算伤害

```typescript
const damage = battleSystem.calculateDamage(attacker, defender);
```

## CharacterSystem

### 方法

#### createCharacter(name: string, class: string)
创建角色

```typescript
const character = characterSystem.createCharacter('Hero', 'Warrior');
```

#### addExperience(character: Character, exp: number)
增加经验

```typescript
characterSystem.addExperience(character, 100);
```

#### levelUp(character: Character)
升级

```typescript
characterSystem.levelUp(character);
```

---

**版本**: 1.0
**最后更新**: 2026-03-30
