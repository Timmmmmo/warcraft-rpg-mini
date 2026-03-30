import { _decorator, Component, Node } from 'cc';
const { ccclass, property } = _decorator;

/**
 * GameManager - 游戏全局管理器
 * 负责游戏状态管理、场景切换、存档等核心功能
 */
@ccclass('GameManager')
export class GameManager extends Component {
    private static _instance: GameManager = null;

    // 游戏状态
    private _isGameRunning: boolean = false;
    private _currentLevel: number = 1;
    private _playerData: any = null;

    /**
     * 获取单例
     */
    public static getInstance(): GameManager {
        return GameManager._instance;
    }

    onLoad() {
        if (GameManager._instance) {
            this.destroy();
            return;
        }
        GameManager._instance = this;
        // 跨场景保持
        // director.addPersistRootNode(this.node);
        this.init();
    }

    /**
     * 初始化
     */
    private init() {
        console.log('[GameManager] 初始化...');
        this._playerData = this.loadGame();
    }

    /**
     * 开始游戏
     */
    public startGame() {
        this._isGameRunning = true;
        console.log('[GameManager] 游戏开始');
    }

    /**
     * 暂停游戏
     */
    public pauseGame() {
        this._isGameRunning = false;
        console.log('[GameManager] 游戏暂停');
    }

    /**
     * 保存游戏
     */
    public saveGame(data?: any) {
        const saveData = data || this._playerData;
        try {
            localStorage.setItem('warcraft_rpg_save', JSON.stringify(saveData));
            console.log('[GameManager] 游戏已保存');
        } catch (e) {
            console.error('[GameManager] 保存失败:', e);
        }
    }

    /**
     * 加载游戏
     */
    public loadGame(): any {
        try {
            const data = localStorage.getItem('warcraft_rpg_save');
            if (data) {
                console.log('[GameManager] 游戏已加载');
                return JSON.parse(data);
            }
        } catch (e) {
            console.error('[GameManager] 加载失败:', e);
        }
        return this.getDefaultPlayerData();
    }

    /**
     * 获取默认玩家数据
     */
    private getDefaultPlayerData() {
        return {
            name: '英雄',
            level: 1,
            exp: 0,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            atk: 10,
            def: 5,
            gold: 0,
            items: [],
            quests: []
        };
    }

    /**
     * 获取当前关卡
     */
    public getCurrentLevel(): number {
        return this._currentLevel;
    }

    /**
     * 设置当前关卡
     */
    public setCurrentLevel(level: number) {
        this._currentLevel = level;
    }

    /**
     * 游戏是否运行中
     */
    public isGameRunning(): boolean {
        return this._isGameRunning;
    }
}
