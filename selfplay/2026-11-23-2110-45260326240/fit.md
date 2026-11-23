# Learned evaluation fit

418480 positions from 27357 games · train 334156, holdout 84324 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.542 | 0.650 | 72.1 % | 64.7 % |
| holdout | 0.549 | 0.649 | 71.8 % | 64.8 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21842 | 0.638 | 64.7 % |
| turns 5-8 | 21302 | 0.585 | 69.3 % |
| turns 9-12 | 19400 | 0.517 | 74.6 % |
| turns 13+ | 21780 | 0.452 | 78.7 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.429 |
| deck:core-nbn | -0.252 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| deck:core-weyland | +0.194 |
| points | +0.192 |
| pointsToWin | -0.192 |
| threatGain | +0.175 |
| remoteProgress | +0.133 |
| remoteAgendaPoints | +0.130 |
| rdDensity | -0.113 |
| hqIce | +0.111 |
| agendasInHand | -0.090 |
| runnerRig | -0.088 |
| deck:core-anarch | -0.087 |
| runnerCoverage | -0.086 |
| deck | +0.083 |
| agendaPointsInHand | -0.071 |
| oddsRD | -0.071 |
| remoteIce | +0.070 |
| creditLead | +0.069 |
| deck:core-shaper | +0.063 |
| archivesAgendas | -0.062 |
| deck:core-hb | +0.061 |
| runnerBreakers | -0.061 |
| threatLoss | -0.057 |
| runnerCredits | -0.054 |
| remotes | -0.049 |
| hqUnrezzed | +0.045 |
| runnerTags | +0.042 |
| remoteUnrezzed | +0.041 |
| credits | +0.038 |
| rezDebt | +0.037 |
| unfunded | -0.033 |
| hand | +0.030 |
| rdIce | +0.026 |
| deck:core-criminal | +0.023 |
| oddsRemote | +0.018 |
| oddsHQ | -0.017 |
| turn | -0.011 |
| deck:core-jinteki | -0.008 |
| runnerHand | +0.006 |
| rdUnrezzed | -0.002 |
| economyAssets | +0.002 |
| badPub | +0.000 |
