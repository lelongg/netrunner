# Learned evaluation fit

418219 positions from 27357 games · train 334099, holdout 84120 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.549 | 0.649 | 71.8 % | 64.7 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.640 | 64.6 % |
| turns 5-8 | 21305 | 0.585 | 69.4 % |
| turns 9-12 | 19375 | 0.517 | 74.6 % |
| turns 13+ | 21597 | 0.450 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.253 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| deck:core-weyland | +0.199 |
| pointsToWin | -0.194 |
| points | +0.194 |
| threatGain | +0.174 |
| remoteProgress | +0.134 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.117 |
| rdDensity | -0.114 |
| agendasInHand | -0.089 |
| deck:core-anarch | -0.088 |
| runnerRig | -0.086 |
| runnerCoverage | -0.086 |
| deck | +0.086 |
| agendaPointsInHand | -0.071 |
| oddsRD | -0.070 |
| remoteIce | +0.069 |
| creditLead | +0.069 |
| deck:core-shaper | +0.064 |
| threatLoss | -0.062 |
| archivesAgendas | -0.061 |
| runnerBreakers | -0.060 |
| deck:core-hb | +0.058 |
| runnerCredits | -0.055 |
| remotes | -0.051 |
| hqUnrezzed | +0.045 |
| remoteUnrezzed | +0.042 |
| runnerTags | +0.039 |
| credits | +0.038 |
| rezDebt | +0.035 |
| unfunded | -0.034 |
| hand | +0.029 |
| rdIce | +0.027 |
| deck:core-criminal | +0.023 |
| oddsRemote | +0.020 |
| oddsHQ | -0.015 |
| turn | -0.012 |
| deck:core-jinteki | -0.007 |
| runnerHand | +0.005 |
| economyAssets | -0.001 |
| rdUnrezzed | -0.000 |
| badPub | +0.000 |
