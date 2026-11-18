# Learned evaluation fit

418655 positions from 27357 games · train 334350, holdout 84305 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.549 | 0.649 | 71.7 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.640 | 64.6 % |
| turns 5-8 | 21319 | 0.586 | 69.1 % |
| turns 9-12 | 19410 | 0.517 | 74.5 % |
| turns 13+ | 21733 | 0.449 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.430 |
| deck:core-nbn | -0.258 |
| runnerPointsToWin | +0.204 |
| runnerPoints | -0.204 |
| deck:core-weyland | +0.198 |
| points | +0.193 |
| pointsToWin | -0.193 |
| threatGain | +0.174 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.110 |
| hqIce | +0.108 |
| deck:core-anarch | -0.094 |
| agendasInHand | -0.087 |
| runnerCoverage | -0.086 |
| runnerRig | -0.084 |
| deck | +0.081 |
| agendaPointsInHand | -0.070 |
| creditLead | +0.069 |
| deck:core-shaper | +0.068 |
| remoteIce | +0.068 |
| oddsRD | -0.066 |
| deck:core-hb | +0.063 |
| runnerBreakers | -0.059 |
| archivesAgendas | -0.058 |
| runnerCredits | -0.054 |
| threatLoss | -0.054 |
| remotes | -0.050 |
| hqUnrezzed | +0.041 |
| runnerTags | +0.039 |
| credits | +0.038 |
| rezDebt | +0.036 |
| remoteUnrezzed | +0.035 |
| unfunded | -0.031 |
| hand | +0.029 |
| rdIce | +0.028 |
| deck:core-criminal | +0.025 |
| oddsHQ | -0.023 |
| oddsRemote | +0.020 |
| turn | -0.009 |
| deck:core-jinteki | -0.007 |
| economyAssets | -0.005 |
| rdUnrezzed | +0.002 |
| runnerHand | +0.001 |
| badPub | +0.000 |
