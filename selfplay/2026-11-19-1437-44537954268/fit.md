# Learned evaluation fit

418496 positions from 27357 games · train 334246, holdout 84250 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.549 | 0.648 | 71.8 % | 65.0 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.639 | 64.7 % |
| turns 5-8 | 21323 | 0.586 | 69.2 % |
| turns 9-12 | 19433 | 0.517 | 74.6 % |
| turns 13+ | 21652 | 0.449 | 78.8 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.431 |
| deck:core-nbn | -0.255 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| deck:core-weyland | +0.196 |
| points | +0.192 |
| pointsToWin | -0.192 |
| threatGain | +0.174 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.115 |
| rdDensity | -0.111 |
| deck:core-anarch | -0.091 |
| agendasInHand | -0.089 |
| runnerRig | -0.087 |
| runnerCoverage | -0.085 |
| deck | +0.084 |
| agendaPointsInHand | -0.071 |
| oddsRD | -0.070 |
| creditLead | +0.070 |
| remoteIce | +0.069 |
| deck:core-shaper | +0.064 |
| archivesAgendas | -0.062 |
| deck:core-hb | +0.061 |
| runnerBreakers | -0.061 |
| threatLoss | -0.057 |
| runnerCredits | -0.054 |
| remotes | -0.049 |
| hqUnrezzed | +0.042 |
| runnerTags | +0.041 |
| credits | +0.040 |
| remoteUnrezzed | +0.039 |
| rezDebt | +0.038 |
| hand | +0.031 |
| unfunded | -0.030 |
| deck:core-criminal | +0.026 |
| rdIce | +0.021 |
| oddsRemote | +0.020 |
| oddsHQ | -0.018 |
| turn | -0.011 |
| deck:core-jinteki | -0.007 |
| runnerHand | +0.003 |
| economyAssets | -0.003 |
| rdUnrezzed | -0.001 |
| badPub | +0.000 |
