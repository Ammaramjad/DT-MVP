import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  TrendingUp,
  CloudRain,
  Radio,
  Zap,
  Sparkles,
  ArrowRight,
  Send,
  CheckCircle2,
  MapPin,
  Sun,
  CloudLightning,
} from 'lucide-react'
import { PanelHeader } from '../../components/layout/PanelHeader'
import { FleetOsNav } from '../../components/fleetos/FleetOsNav'
import { Badge } from '../../components/ui/Badge'
import { Button } from '../../components/ui/Button'
import {
  SEED_ZONE_DEMAND_FORECASTS,
  SEED_REBALANCE_RECOMMENDATIONS,
  SEED_WEATHER_MATRIX,
} from '../../data/forecastSeed'
import type { RebalanceRecommendation, ZoneDemandForecast } from '../../types'
import { useLang } from '../../i18n'
import clsx from 'clsx'

export default function ForecastPanel() {
  const { t, lang } = useLang()
  const [timeHorizon, setTimeHorizon] = useState<'24H' | '7D'>('24H')
  const [recommendations, setRecommendations] = useState<RebalanceRecommendation[]>(SEED_REBALANCE_RECOMMENDATIONS)
  const [selectedZone, setSelectedZone] = useState<ZoneDemandForecast>(SEED_ZONE_DEMAND_FORECASTS[0])
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null)

  const handleExecuteRebalance = (rec: RebalanceRecommendation) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.id === rec.id ? { ...r, status: 'EXECUTED' } : r)),
    )
    setBroadcastSuccess(
      lang === 'zh'
        ? `已成功發布調度廣播！調派指令已推播至 ${rec.sourceZoneZh} 區域之 ${rec.recommendedVehicles} 輛 ${rec.vehicleCategory} 司機端 APP。`
        : `Auto-Rebalance Broadcast successfully dispatched! Instructions pushed to ${rec.recommendedVehicles} ${rec.vehicleCategory} drivers in ${rec.sourceZone}.`,
    )
    setTimeout(() => {
      setBroadcastSuccess(null)
    }, 4500)
  }

  return (
    <div className="min-h-screen bg-[#030712] bg-noise pb-32 text-white" data-testid="forecast-panel">
      <PanelHeader
        title={t('fleetos.forecast.title')}
        subtitle={t('fleetos.forecast.subtitle')}
        icon={<TrendingUp className="h-5 w-5" />}
      />

      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <FleetOsNav />

        {/* Global Broadcast Success Alert Toast */}
        <AnimatePresence>
          {broadcastSuccess && (
            <motion.div
              initial={{ opacity: 0, y: -16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              className="mb-6 flex items-center justify-between gap-3 rounded-2xl border border-emerald-500/40 bg-emerald-950/80 p-4 shadow-[0_0_20px_rgba(16,185,129,0.3)] backdrop-blur-xl"
              data-testid="rebalance-broadcast-toast"
            >
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                <p className="text-sm font-bold text-emerald-200">{broadcastSuccess}</p>
              </div>
              <button
                type="button"
                onClick={() => setBroadcastSuccess(null)}
                className="text-xs font-semibold text-emerald-400 hover:text-emerald-200"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Top Summary Banner */}
        <div className="glass-panel-glow mb-6 grid grid-cols-1 gap-4 rounded-3xl p-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="flex items-center gap-4 border-b border-white/5 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-cyan-500/15 border border-cyan-400/30 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.2)]">
              <Zap className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '預測尖峰需量缺口' : 'Predicted Supply Deficit'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-cyan-300">-70 Vehicles</p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? '雙北/桃機/中高生活圈' : '4 Major Metropolitan Hubs'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-white/5 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/15 border border-purple-400/30 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.2)]">
              <Radio className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '待發布調度建議' : 'Actionable Rebalances'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-purple-300">
                {recommendations.filter((r) => r.status === 'PENDING').length} Recommendations
              </p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? 'AI 即時動態建議' : 'Real-time AI Suggested'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 border-b border-white/5 pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-500/15 border border-amber-400/30 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
              <CloudRain className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '天氣加乘影響' : 'Weather Surge Factor'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-amber-300">+25% Heavy Rain</p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? '雙北盆地午後對流雨' : 'Taipei Convective Storms'}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/15 border border-emerald-400/30 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
              <Sparkles className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? 'AI 預測準確率' : 'Prediction Model Accuracy'}
              </p>
              <p className="mt-0.5 text-2xl font-black text-emerald-300">96.4%</p>
              <p className="text-[11px] text-slate-400">{lang === 'zh' ? '集成多源航班與氣象' : 'Flight & Met Ensemble'}</p>
            </div>
          </div>
        </div>

        {/* Section 1: AI Rebalance Recommendation Action Cards */}
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-purple-500/20 text-purple-300">
                <Radio className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-lg font-bold text-white">
                {lang === 'zh' ? 'AI 車隊智慧重平衡調度建議' : 'AI Fleet Rebalance Recommendations'}
              </h3>
            </div>
            <span className="text-xs text-slate-400">
              {lang === 'zh' ? '點擊一鍵發布廣播即可通知司機端 APP' : 'Click to broadcast reposition alerts to drivers'}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3" data-testid="rebalance-recommendations-grid">
            {recommendations.map((rec) => {
              const isExecuted = rec.status === 'EXECUTED'
              return (
                <motion.div
                  key={rec.id}
                  layout
                  className={clsx(
                    'glass-panel relative flex flex-col justify-between overflow-hidden rounded-3xl p-5 shadow-xl transition',
                    isExecuted
                      ? 'border-emerald-500/30 bg-emerald-950/20'
                      : 'border-purple-400/30 hover:border-purple-400/60 shadow-[0_0_15px_rgba(168,85,247,0.15)]',
                  )}
                  data-testid={`rebalance-card-${rec.id}`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <Badge tone={isExecuted ? 'green' : 'purple'}>
                        {isExecuted
                          ? lang === 'zh'
                            ? '已發布廣播 (EXECUTED)'
                            : 'BROADCAST SENT'
                          : lang === 'zh'
                            ? `預計 ${rec.estimatedTimeToSpikeMin} 分鐘後尖峰`
                            : `Spike in ${rec.estimatedTimeToSpikeMin}m`}
                      </Badge>
                      <span className="font-mono text-xs font-bold text-purple-300">
                        +{rec.recommendedVehicles} {rec.vehicleCategory}
                      </span>
                    </div>

                    <div className="mt-3 flex items-center gap-2 text-xs font-bold text-slate-200">
                      <span className="truncate text-slate-400">{lang === 'zh' ? rec.sourceZoneZh : rec.sourceZone}</span>
                      <ArrowRight className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                      <span className="truncate text-cyan-300">{lang === 'zh' ? rec.targetZoneZh : rec.targetZone}</span>
                    </div>

                    <p className="mt-2.5 text-xs leading-relaxed text-slate-300">{lang === 'zh' ? rec.reasonZh : rec.reason}</p>
                  </div>

                  <div className="mt-4 border-t border-white/5 pt-3">
                    {isExecuted ? (
                      <div className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500/15 py-2 text-xs font-bold text-emerald-300 border border-emerald-500/30">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>{lang === 'zh' ? '已發布調度廣播 · 司機響應中' : 'Alert Broadcasted · Drivers En Route'}</span>
                      </div>
                    ) : (
                      <Button
                        size="sm"
                        fullWidth
                        variant="primary"
                        onClick={() => handleExecuteRebalance(rec)}
                        data-testid={`execute-rebalance-btn-${rec.id}`}
                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 shadow-lg shadow-purple-500/25"
                      >
                        <Send className="h-3.5 w-3.5" />
                        <span>{lang === 'zh' ? '發布調度廣播 (Execute Alert)' : 'Execute Auto-Rebalance Alert'}</span>
                      </Button>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>

        {/* Section 2: 24-Hour & 7-Day Zone Demand Heatmap & Forecast */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Zone Selector Column */}
          <div className="glass-panel rounded-3xl p-5">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <MapPin className="h-4 w-4 text-cyan-400" />
                {lang === 'zh' ? '監控熱區 (Monitored Hubs)' : 'Monitored Hubs'}
              </h4>
              <div className="flex rounded-lg bg-white/5 p-0.5 text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setTimeHorizon('24H')}
                  className={clsx(
                    'rounded-md px-2 py-0.5 transition',
                    timeHorizon === '24H' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white',
                  )}
                >
                  24H
                </button>
                <button
                  type="button"
                  onClick={() => setTimeHorizon('7D')}
                  className={clsx(
                    'rounded-md px-2 py-0.5 transition',
                    timeHorizon === '7D' ? 'bg-cyan-400 text-slate-950' : 'text-slate-400 hover:text-white',
                  )}
                >
                  7D
                </button>
              </div>
            </div>

            <div className="mt-3 space-y-2" data-testid="forecast-zone-list">
              {SEED_ZONE_DEMAND_FORECASTS.map((zone) => {
                const isSelected = selectedZone.zoneId === zone.zoneId
                return (
                  <button
                    key={zone.zoneId}
                    type="button"
                    onClick={() => setSelectedZone(zone)}
                    data-testid={`forecast-zone-btn-${zone.zoneId}`}
                    className={clsx(
                      'flex w-full flex-col rounded-2xl p-3 text-left transition',
                      isSelected
                        ? 'bg-cyan-500/20 border border-cyan-400/50 shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                        : 'bg-white/[0.03] border border-white/5 hover:bg-white/[0.08]',
                    )}
                  >
                    <div className="flex items-center justify-between gap-1">
                      <p className="text-xs font-bold text-white">{lang === 'zh' ? zone.zoneNameZh : zone.zoneName}</p>
                      <Badge tone={zone.demandTrend === 'SURGING' ? 'red' : zone.demandTrend === 'HIGH' ? 'amber' : 'cyan'}>
                        {zone.demandTrend}
                      </Badge>
                    </div>
                    <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                      <span>{lang === 'zh' ? `目前供給: ${zone.currentSupply}` : `Supply: ${zone.currentSupply}`}</span>
                      <span className="font-bold text-cyan-300">
                        {lang === 'zh' ? `預測需量: ${zone.predictedDemand}` : `Forecast: ${zone.predictedDemand}`}
                      </span>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Zone Detail & Hourly Surge Chart */}
          <div className="glass-panel col-span-1 lg:col-span-2 rounded-3xl p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="rounded-lg bg-cyan-500/20 px-2 py-0.5 text-xs font-bold text-cyan-300 border border-cyan-400/30">
                    {selectedZone.region}
                  </span>
                  <h3 className="text-base font-bold text-white">
                    {lang === 'zh' ? selectedZone.zoneNameZh : selectedZone.zoneName}
                  </h3>
                </div>
                <p className="mt-1 text-xs text-slate-400">{lang === 'zh' ? selectedZone.keyDriverZh : selectedZone.keyDriver}</p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-[10px] uppercase tracking-wider text-slate-500">Deficit / Surplus</p>
                  <p className="text-lg font-black text-rose-400">{selectedZone.deficitOrSurplus} Vehicles</p>
                </div>
              </div>
            </div>

            {/* Hourly Forecast Bar Breakdown */}
            <div className="mt-5">
              <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                {lang === 'zh' ? '24 小時逐時需量 vs. 供給與費率乘數' : '24-Hour Predicted Demand vs. Supply & Surge Multiplier'}
              </p>

              <div className="grid grid-cols-7 gap-2">
                {selectedZone.hourlyForecast.map((item) => {
                  const maxVal = 70
                  const demandHeight = Math.min(100, (item.demand / maxVal) * 100)
                  const supplyHeight = Math.min(100, (item.supply / maxVal) * 100)
                  const isSurge = item.surgeFactor > 1.0

                  return (
                    <div key={item.hour} className="flex flex-col items-center gap-1.5 rounded-xl bg-white/[0.03] p-2 border border-white/5">
                      <span className="font-mono text-[11px] font-bold text-slate-300">{item.hour}</span>

                      {/* Bar Visualization */}
                      <div className="relative flex h-24 w-full items-end justify-center gap-1">
                        {/* Supply Bar */}
                        <div
                          style={{ height: `${supplyHeight}%` }}
                          className="w-2.5 rounded-t bg-cyan-600/70"
                          title={`Supply: ${item.supply}`}
                        />
                        {/* Demand Bar */}
                        <div
                          style={{ height: `${demandHeight}%` }}
                          className={clsx(
                            'w-2.5 rounded-t transition-all',
                            isSurge ? 'bg-gradient-to-t from-rose-500 to-amber-400 shadow-[0_0_8px_rgba(244,63,94,0.6)]' : 'bg-indigo-500',
                          )}
                          title={`Demand: ${item.demand}`}
                        />
                      </div>

                      {/* Values */}
                      <div className="text-center">
                        <span className="font-mono text-[10px] font-bold text-rose-300">{item.demand}d</span>
                        <span className="text-[10px] text-slate-500">/{item.supply}s</span>
                      </div>

                      <span
                        className={clsx(
                          'rounded px-1 text-[9px] font-mono font-bold',
                          isSurge ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'text-slate-500',
                        )}
                      >
                        {item.surgeFactor}x
                      </span>
                    </div>
                  )
                })}
              </div>

              <div className="mt-4 flex items-center justify-center gap-6 text-xs text-slate-400 border-t border-white/5 pt-3">
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-indigo-500" />
                  <span>{lang === 'zh' ? '預測需求 (Predicted Demand)' : 'Predicted Demand'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-cyan-600/70" />
                  <span>{lang === 'zh' ? '目前供給 (Current Supply)' : 'Current Supply'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded bg-amber-400" />
                  <span>{lang === 'zh' ? '動態費率加乘 (Dynamic Surge)' : 'Dynamic Surge'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Weather Impact Matrix */}
        <div className="glass-panel rounded-3xl p-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-amber-300">
                <CloudRain className="h-3.5 w-3.5" />
              </div>
              <h3 className="text-base font-bold text-white">
                {lang === 'zh' ? '全台主要營運區氣象與動態溢價矩陣' : 'Taiwan Weather Impact & Surge Multiplier Matrix'}
              </h3>
            </div>
            <span className="text-xs text-slate-400">{lang === 'zh' ? '即時氣象局氣象連線' : 'Connected to Met Office Telemetry'}</span>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5" data-testid="weather-matrix-grid">
            {SEED_WEATHER_MATRIX.map((w) => (
              <div
                key={w.region}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-slate-950/60 p-4 transition hover:border-amber-400/40"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black text-cyan-300">{w.region}</span>
                    {w.condition === 'HEAVY_RAIN' ? (
                      <CloudLightning className="h-4 w-4 text-amber-400" />
                    ) : w.condition === 'RAIN' ? (
                      <CloudRain className="h-4 w-4 text-cyan-400" />
                    ) : (
                      <Sun className="h-4 w-4 text-amber-300" />
                    )}
                  </div>
                  <p className="mt-1 text-xs font-bold text-white">{w.regionNameZh}</p>
                  <p className="mt-2 text-2xl font-black text-slate-100">{w.temperatureC}°C</p>
                </div>

                <div className="mt-3 space-y-1.5 border-t border-white/5 pt-2.5 text-[11px]">
                  <div className="flex justify-between text-slate-400">
                    <span>{lang === 'zh' ? '降雨機率' : 'Rain Prob.'}:</span>
                    <span className="font-bold text-cyan-300">{w.precipitationProbability}%</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{lang === 'zh' ? '費率係數' : 'Surge'}:</span>
                    <span className="font-bold text-amber-300">{w.surgeMultiplier}x</span>
                  </div>
                  <div className="flex justify-between text-slate-400">
                    <span>{lang === 'zh' ? '班機延誤風險' : 'Flight Risk'}:</span>
                    <span
                      className={clsx(
                        'font-bold',
                        w.flightDelayRisk === 'HIGH' ? 'text-rose-400' : w.flightDelayRisk === 'MEDIUM' ? 'text-amber-400' : 'text-emerald-400',
                      )}
                    >
                      {w.flightDelayRisk}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
