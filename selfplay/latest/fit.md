# Learned evaluation fit

418195 positions from 27357 games · train 334102, holdout 84093 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.549 | 0.648 | 71.8 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21838 | 0.639 | 64.8 % |
| turns 5-8 | 21296 | 0.585 | 69.3 % |
| turns 9-12 | 19385 | 0.517 | 74.5 % |
| turns 13+ | 21574 | 0.449 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.257 |
| runnerPointsToWin | +0.203 |
| runnerPoints | -0.203 |
| deck:core-weyland | +0.197 |
| points | +0.193 |
| pointsToWin | -0.193 |
| threatGain | +0.175 |
| remoteAgendaPoints | +0.131 |
| remoteProgress | +0.130 |
| hqIce | +0.117 |
| rdDensity | -0.111 |
| deck:core-anarch | -0.091 |
| runnerRig | -0.088 |
| agendasInHand | -0.087 |
| runnerCoverage | -0.086 |
| deck | +0.083 |
| agendaPointsInHand | -0.070 |
| remoteIce | +0.068 |
| creditLead | +0.068 |
| oddsRD | -0.067 |
| deck:core-shaper | +0.065 |
| runnerBreakers | -0.061 |
| deck:core-hb | +0.061 |
| archivesAgendas | -0.061 |
| threatLoss | -0.055 |
| runnerCredits | -0.053 |
| remotes | -0.051 |
| hqUnrezzed | +0.047 |
| runnerTags | +0.041 |
| remoteUnrezzed | +0.039 |
| credits | +0.038 |
| rezDebt | +0.036 |
| unfunded | -0.036 |
| hand | +0.029 |
| deck:core-criminal | +0.025 |
| rdIce | +0.025 |
| oddsRemote | +0.019 |
| oddsHQ | -0.019 |
| turn | -0.010 |
| economyAssets | -0.007 |
| deck:core-jinteki | -0.006 |
| runnerHand | +0.004 |
| rdUnrezzed | -0.003 |
| badPub | +0.000 |
