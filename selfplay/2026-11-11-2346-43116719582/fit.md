# Learned evaluation fit

418187 positions from 27357 games · train 334048, holdout 84139 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.548 | 0.648 | 71.9 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21841 | 0.638 | 65.0 % |
| turns 5-8 | 21303 | 0.584 | 69.5 % |
| turns 9-12 | 19398 | 0.517 | 74.6 % |
| turns 13+ | 21597 | 0.449 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.257 |
| deck:core-weyland | +0.201 |
| runnerPointsToWin | +0.201 |
| runnerPoints | -0.201 |
| points | +0.195 |
| pointsToWin | -0.195 |
| threatGain | +0.176 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.112 |
| hqIce | +0.109 |
| deck:core-anarch | -0.092 |
| agendasInHand | -0.089 |
| runnerCoverage | -0.088 |
| runnerRig | -0.086 |
| deck | +0.083 |
| agendaPointsInHand | -0.070 |
| remoteIce | +0.070 |
| creditLead | +0.068 |
| oddsRD | -0.066 |
| deck:core-shaper | +0.065 |
| deck:core-hb | +0.063 |
| runnerBreakers | -0.061 |
| archivesAgendas | -0.061 |
| threatLoss | -0.056 |
| runnerCredits | -0.053 |
| remotes | -0.052 |
| hqUnrezzed | +0.047 |
| runnerTags | +0.042 |
| remoteUnrezzed | +0.041 |
| credits | +0.039 |
| rezDebt | +0.035 |
| unfunded | -0.033 |
| hand | +0.029 |
| deck:core-criminal | +0.026 |
| rdIce | +0.025 |
| oddsHQ | -0.018 |
| oddsRemote | +0.018 |
| deck:core-jinteki | -0.011 |
| turn | -0.010 |
| runnerHand | +0.005 |
| rdUnrezzed | +0.003 |
| economyAssets | -0.002 |
| badPub | +0.000 |
