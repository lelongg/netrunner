# Learned evaluation fit

418239 positions from 27357 games · train 334027, holdout 84212 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.5 % |
| holdout | 0.549 | 0.649 | 71.7 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.639 | 64.8 % |
| turns 5-8 | 21314 | 0.585 | 69.3 % |
| turns 9-12 | 19395 | 0.518 | 74.4 % |
| turns 13+ | 21660 | 0.450 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.427 |
| deck:core-nbn | -0.256 |
| runnerPointsToWin | +0.202 |
| runnerPoints | -0.202 |
| pointsToWin | -0.193 |
| points | +0.193 |
| deck:core-weyland | +0.189 |
| threatGain | +0.176 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.131 |
| rdDensity | -0.113 |
| hqIce | +0.112 |
| deck:core-anarch | -0.093 |
| agendasInHand | -0.090 |
| runnerCoverage | -0.088 |
| deck | +0.086 |
| runnerRig | -0.081 |
| remoteIce | +0.073 |
| creditLead | +0.070 |
| oddsRD | -0.068 |
| agendaPointsInHand | -0.067 |
| deck:core-hb | +0.067 |
| deck:core-shaper | +0.065 |
| archivesAgendas | -0.064 |
| runnerBreakers | -0.063 |
| threatLoss | -0.058 |
| runnerCredits | -0.057 |
| remotes | -0.050 |
| hqUnrezzed | +0.044 |
| runnerTags | +0.041 |
| remoteUnrezzed | +0.040 |
| credits | +0.037 |
| rezDebt | +0.035 |
| unfunded | -0.033 |
| deck:core-criminal | +0.027 |
| hand | +0.026 |
| rdIce | +0.025 |
| oddsRemote | +0.018 |
| oddsHQ | -0.017 |
| turn | -0.010 |
| deck:core-jinteki | -0.005 |
| runnerHand | +0.004 |
| economyAssets | -0.004 |
| rdUnrezzed | +0.003 |
| badPub | +0.000 |
