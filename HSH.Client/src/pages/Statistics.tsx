import { useState } from "react";
import StatPanel from "../components/StatPanel";
import { STAT_TYPES } from "../data/statData";
import type { StatType } from "../data/statData";
import "./StatsPage.css";

function StatisticsPage() {
    const [compare, setCompare] = useState(false);
    const [typeValue, setTypeValue] = useState<StatType>("fires-over-time");

    const statType = STAT_TYPES.find((t) => t.value === typeValue)!;

    return (
        <div className="stats-page">
            <h2 className="map-title">Statistics</h2>

            <div className="stats-controls">
                <div className="stat-field">
                    <label>Compare</label>
                    <div className="toggle">
                        <button
                            className={
                                !compare ? "toggle-btn active" : "toggle-btn"
                            }
                            onClick={() => setCompare(false)}
                        >
                            False
                        </button>
                        <button
                            className={
                                compare ? "toggle-btn active" : "toggle-btn"
                            }
                            onClick={() => setCompare(true)}
                        >
                            True
                        </button>
                    </div>
                </div>

                <div className="stat-field">
                    <label>Statistic type</label>
                    <select
                        value={typeValue}
                        onChange={(e) =>
                            setTypeValue(e.target.value as StatType)
                        }
                    >
                        {STAT_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                                {t.label}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className={compare ? "stats-grid two" : "stats-grid"}>
                <StatPanel
                    title={compare ? "Chart A" : "Chart"}
                    statType={statType}
                />
                {compare && <StatPanel title="Chart B" statType={statType} />}
            </div>
        </div>
    );
}

export default StatisticsPage;
