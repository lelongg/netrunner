# Learned evaluation fit

417587 positions from 27357 games · train 333414, holdout 84173 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.6 % |
| holdout | 0.549 | 0.650 | 71.7 % | 64.7 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21834 | 0.639 | 64.6 % |
| turns 5-8 | 21299 | 0.587 | 69.3 % |
| turns 9-12 | 19395 | 0.517 | 74.5 % |
| turns 13+ | 21645 | 0.450 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.432 |
| deck:core-nbn | -0.251 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| deck:core-weyland | +0.193 |
| pointsToWin | -0.192 |
| points | +0.192 |
| threatGain | +0.173 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.129 |
| rdDensity | -0.112 |
| hqIce | +0.111 |
| agendasInHand | -0.090 |
| deck:core-anarch | -0.089 |
| runnerCoverage | -0.086 |
| deck | +0.084 |
| runnerRig | -0.083 |
| remoteIce | +0.075 |
| agendaPointsInHand | -0.071 |
| creditLead | +0.068 |
| oddsRD | -0.067 |
| archivesAgendas | -0.062 |
| deck:core-shaper | +0.062 |
| runnerBreakers | -0.061 |
| deck:core-hb | +0.060 |
| threatLoss | -0.060 |
| runnerCredits | -0.054 |
| remotes | -0.048 |
| hqUnrezzed | +0.045 |
| runnerTags | +0.041 |
| remoteUnrezzed | +0.039 |
| credits | +0.038 |
| rezDebt | +0.035 |
| unfunded | -0.031 |
| hand | +0.028 |
| deck:core-criminal | +0.027 |
| rdIce | +0.026 |
| oddsRemote | +0.019 |
| oddsHQ | -0.017 |
| turn | -0.010 |
| deck:core-jinteki | -0.006 |
| economyAssets | -0.004 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.003 |
| badPub | +0.000 |
