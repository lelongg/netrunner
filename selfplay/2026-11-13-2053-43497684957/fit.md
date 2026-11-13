# Learned evaluation fit

418448 positions from 27357 games · train 334162, holdout 84286 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.7 % |
| holdout | 0.547 | 0.647 | 72.0 % | 65.1 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.636 | 65.1 % |
| turns 5-8 | 21306 | 0.583 | 69.7 % |
| turns 9-12 | 19406 | 0.515 | 74.7 % |
| turns 13+ | 21731 | 0.449 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.428 |
| deck:core-nbn | -0.253 |
| runnerPoints | -0.204 |
| runnerPointsToWin | +0.204 |
| deck:core-weyland | +0.195 |
| pointsToWin | -0.194 |
| points | +0.194 |
| threatGain | +0.175 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.131 |
| rdDensity | -0.116 |
| hqIce | +0.113 |
| agendasInHand | -0.088 |
| runnerCoverage | -0.085 |
| deck:core-anarch | -0.085 |
| deck | +0.083 |
| runnerRig | -0.081 |
| creditLead | +0.071 |
| agendaPointsInHand | -0.070 |
| remoteIce | +0.068 |
| oddsRD | -0.065 |
| deck:core-hb | +0.064 |
| runnerBreakers | -0.063 |
| deck:core-shaper | +0.061 |
| archivesAgendas | -0.060 |
| threatLoss | -0.059 |
| runnerCredits | -0.055 |
| remotes | -0.054 |
| hqUnrezzed | +0.044 |
| runnerTags | +0.041 |
| credits | +0.040 |
| remoteUnrezzed | +0.039 |
| rezDebt | +0.038 |
| unfunded | -0.032 |
| hand | +0.029 |
| rdIce | +0.023 |
| deck:core-criminal | +0.023 |
| oddsRemote | +0.019 |
| oddsHQ | -0.018 |
| turn | -0.012 |
| deck:core-jinteki | -0.010 |
| economyAssets | -0.003 |
| runnerHand | +0.001 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
