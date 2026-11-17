# Learned evaluation fit

418341 positions from 27357 games · train 334299, holdout 84042 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.549 | 0.648 | 71.7 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21835 | 0.639 | 64.8 % |
| turns 5-8 | 21292 | 0.585 | 69.4 % |
| turns 9-12 | 19356 | 0.517 | 74.5 % |
| turns 13+ | 21559 | 0.452 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.252 |
| runnerPoints | -0.200 |
| runnerPointsToWin | +0.200 |
| pointsToWin | -0.193 |
| points | +0.193 |
| deck:core-weyland | +0.193 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.113 |
| hqIce | +0.111 |
| deck:core-anarch | -0.093 |
| agendasInHand | -0.092 |
| runnerRig | -0.086 |
| deck | +0.085 |
| runnerCoverage | -0.083 |
| agendaPointsInHand | -0.073 |
| remoteIce | +0.073 |
| creditLead | +0.069 |
| oddsRD | -0.069 |
| deck:core-shaper | +0.066 |
| deck:core-hb | +0.065 |
| archivesAgendas | -0.064 |
| runnerBreakers | -0.058 |
| threatLoss | -0.056 |
| runnerCredits | -0.052 |
| remotes | -0.051 |
| hqUnrezzed | +0.045 |
| credits | +0.040 |
| remoteUnrezzed | +0.040 |
| runnerTags | +0.035 |
| unfunded | -0.034 |
| rezDebt | +0.033 |
| hand | +0.029 |
| rdIce | +0.028 |
| deck:core-criminal | +0.026 |
| oddsHQ | -0.020 |
| oddsRemote | +0.018 |
| turn | -0.015 |
| deck:core-jinteki | -0.010 |
| economyAssets | -0.008 |
| runnerHand | +0.006 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
