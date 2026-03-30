import { Character } from './Character';

/**
 * 战斗结果
 */
export interface BattleResult {
    winner: 'player' | 'enemy';
    rounds: number;
    expGained: number;
    goldGained: number;
}

/**
 * 战斗系统
 */
export class BattleSystem {
    private static _instance: BattleSystem = null;

    public static getInstance(): BattleSystem {
        if (!BattleSystem._instance) {
            BattleSystem._instance = new BattleSystem();
        }
        return BattleSystem._instance;
    }

    /**
     * 开始战斗
     */
    public startBattle(player: Character, enemy: Character): BattleResult {
        console.log(`[BattleSystem] 战斗开始: ${player.name} vs ${enemy.name}`);
        
        let rounds = 0;
        
        while (player.isAlive() && enemy.isAlive()) {
            rounds++;
            
            // 玩家攻击
            const playerDamage = this.calculateDamage(player, enemy);
            enemy.takeDamage(playerDamage);
            console.log(`[BattleSystem] ${player.name} 攻击 ${enemy.name}，造成 ${playerDamage} 伤害`);
            
            if (!enemy.isAlive()) break;
            
            // 敌人攻击
            const enemyDamage = this.calculateDamage(enemy, player);
            player.takeDamage(enemyDamage);
            console.log(`[BattleSystem] ${enemy.name} 攻击 ${player.name}，造成 ${enemyDamage} 伤害`);
        }
        
        const winner = player.isAlive() ? 'player' : 'enemy';
        const expGained = winner === 'player' ? enemy.stats.level * 50 : 0;
        const goldGained = winner === 'player' ? enemy.stats.level * 20 : 0;
        
        if (winner === 'player') {
            player.addExp(expGained);
        }
        
        console.log(`[BattleSystem] 战斗结束，胜者: ${winner}，回合数: ${rounds}`);
        
        return { winner, rounds, expGained, goldGained };
    }

    /**
     * 计算伤害
     */
    public calculateDamage(attacker: Character, defender: Character): number {
        const baseDamage = attacker.stats.atk;
        const variance = Math.floor(Math.random() * 5) - 2; // -2 到 +2 的随机波动
        return Math.max(1, baseDamage + variance);
    }
}
