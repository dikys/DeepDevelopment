// переименовать в Систему Опыта
// Рабочим тоже опыт за добычу
// проверять, что юнит ничего не делает и держит позицию

import { activePlugins } from "active-plugins";
import { Settlement, Unit } from "library/game-logic/horde-types";
import HordePluginBase from "plugins/base-plugin";

/**
 * Вызывается до вызова "onFirstRun()" при первом запуске скрипт-машины, а так же при hot-reload
 */
export function onInitialization() {
    //activePlugins.register(new DeepDevelopmentPlugin());
}

class EraBuilding {
    public uid: string;
    public eraLevel: number;
    public eraName: string

    public constructor(uid: string, eraLevel: number, eraName: string) {
        this.uid = uid;
        this.eraLevel = eraLevel;
        this.eraName = eraName;
    }
}

class DeepDevelopmentPlugin extends HordePluginBase {
    private _settlementsEraBuildings : Map<string, Array<Unit>>;
    private _originalSettlementNames: Map<string, string>;
    private static EraBuildings : Map<string, EraBuilding> = new Map<string, EraBuilding>();

    public constructor() {
        super("Глубокое развитие");

        this._settlementsEraBuildings = new Map<string, Array<Unit>>();
        this._originalSettlementNames = new Map<string, string>();

        DeepDevelopmentPlugin.EraBuildings.set(
            "#UnitConfig_Slavyane_Mill",
            new EraBuilding("#UnitConfig_Slavyane_Mill",       2, "эра металлов"));
        DeepDevelopmentPlugin.EraBuildings.set(
            "#UnitConfig_Slavyane_Church",
            new EraBuilding("#UnitConfig_Slavyane_Church",     3, "эра стычек"));
        DeepDevelopmentPlugin.EraBuildings.set(
            "#UnitConfig_Slavyane_Labor",
            new EraBuilding("#UnitConfig_Slavyane_Labor",      4, "эра битв"));
        DeepDevelopmentPlugin.EraBuildings.set(
            "#UnitConfig_Slavyane_Factory",
            new EraBuilding("#UnitConfig_Slavyane_Factory",    5, "эра сражений"));
        DeepDevelopmentPlugin.EraBuildings.set(
            "#UnitConfig_Slavyane_Blacksmith",
            new EraBuilding("#UnitConfig_Slavyane_Blacksmith", 6, "эра господства"));
    }

    public onFirstRun() {
        this.setupSettlements();
    }

    public onEveryTick(gameTickNum: number): void {
        if (gameTickNum % 100 == 0) {
            this.updateSettlementsName();
        }
    }

    private updateSettlementsName(): void {
        const sceneSettlements = ActiveScena.GetRealScena().Settlements;
        ForEach(sceneSettlements, (settlement: Settlement) => {
            var buildings = this._settlementsEraBuildings.get(settlement.Uid);
            var originalName = this._originalSettlementNames.get(settlement.Uid);

            if (buildings && originalName) {
                var maxEraLevel = 1;
                var eraName = "деревянная эра";
                for (var i = 0; i < buildings.length; i++) {
                    var building = buildings[i];
                    var eraBuilding = DeepDevelopmentPlugin.EraBuildings.get(building.Cfg.Uid);
                    if (eraBuilding && eraBuilding.eraLevel > maxEraLevel) {
                        maxEraLevel = eraBuilding.eraLevel;
                        eraName = eraBuilding.eraName;
                    }
                }

                if (maxEraLevel > 1) {
                    settlement.data.TownName = originalName + " (" + eraName + ")";
                } else {
                    settlement.data.TownName = originalName;
                }
            }
        });
    }

    private setupSettlements(): void {
        const sceneSettlements = ActiveScena.GetRealScena().Settlements;
        ForEach(sceneSettlements, (settlement: Settlement) => {
            this._settlementsEraBuildings.set(settlement.Uid, new Array<Unit>());
            this._originalSettlementNames.set(settlement.Uid, settlement.data.TownName);

            settlement.Units.UnitsListChanged.connect(this.onUnitsListChanged.bind(this));
            ForEach(settlement.Units, (unit: Unit) => {
                if (DeepDevelopmentPlugin.EraBuildings.has(unit.Cfg.Uid)) {
                    this._settlementsEraBuildings.get(settlement.Uid)?.push(unit);
                }
            });
        });
    }

    private onUnitsListChanged(sender: any, UnitsListChangedEventArgs: HordeClassLibrary.World.Settlements.Modules.SettlementUnits.UnitsListChangedEventArgs | null) {
        if (!UnitsListChangedEventArgs) {
            return;
        }

        var unit : Unit = UnitsListChangedEventArgs.Unit;

        // если юнит добавляется, боевой и без инициализированной системы опыта
        if (UnitsListChangedEventArgs.IsAdded && DeepDevelopmentPlugin.EraBuildings.has(unit.Cfg.Uid)) {
            this._settlementsEraBuildings.get(unit.Owner.Uid)?.push(unit);
        }
        // если юнит удаляется, боевой и с инициализированной системой опыта
        else if (!UnitsListChangedEventArgs.IsAdded && DeepDevelopmentPlugin.EraBuildings.has(unit.Cfg.Uid)) {
            var buildings = this._settlementsEraBuildings.get(unit.Owner.Uid);
            if (buildings) {
                for (var i = 0; i < buildings.length; i++) {
                    if (buildings[i].Id == unit.Id) {
                        buildings.splice(i, 1);
                        break;
                    }
                }
            }
        }
    }
}