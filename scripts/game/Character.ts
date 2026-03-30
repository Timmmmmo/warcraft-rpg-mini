/**
 * 角色属性接口
 */
export interface CharacterStats {
    hp: number;
    maxHp: number;
    mp: number;
    maxMp: number;
    atk: number;
    def: number;
    speed: number;
    level: number;
    exp: number;
}

/**
 * 角色类
 */
export class Character {
    public name: string;
    public stats: CharacterStats;
    public skills: string[] = [];
    public items: string[] = [];

    constructor(name: string, stats?: Partial<CharacterStats>) {
        this.name = name;
        this.stats = {
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            atk: 10,
            def: 5,
            speed: 10,
            level: 1,
            exp: 0,
            ...stats
        };
    }

    /**
     * 是否存活
     */
    public isAlive(): boolean {
        return this.stats.hp > 0;
    }

    /**
     * 受到伤害
     */
    public takeDamage(damage: number): number {
        const actualDamage = Math.max(1, damage - this.stats.def);
        this.stats.hp = Math.max(0, this.stats.hp - actualDamage);
        return actualDamage;
    }

    /**
     * 恢复HP
     */
    public heal(amount: number) {
        this.stats.hp = Math.min(this.stats.maxHp, this.stats.hp + amount);
    }

    /**
     * 增加经验
     */
    public addExp(exp: number) {
        this.stats.exp += exp;
        this.checkLevelUp();
    }

    /**
     * 检查升级
     */
    private checkLevelUp() {
        const expNeeded = this.stats.level * 100;
        if (this.stats.exp >= expNeeded) {
            this.stats.exp -= expNeeded;
            this.stats.level++;
            this.onLevelUp();
        }
    }

    /**
     * 升级回调
     */
    private onLevelUp() {
        this.stats.maxHp += 20;
        this.stats.hp = this.stats.maxHp;
        this.stats.maxMp += 10;
        this.stats.mp = this.stats.maxMp;
        this.stats.atk += 3;
        this.stats.def += 2;
        console.log(`[Character] ${this.name} 升级到 ${this.stats.level} 级！`);
    }
}
