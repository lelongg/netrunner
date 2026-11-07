# Learned evaluation fit

418612 positions from 27357 games · train 334351, holdout 84261 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.541 | 0.650 | 72.2 % | 64.6 % |
| holdout | 0.547 | 0.648 | 71.9 % | 64.9 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21843 | 0.638 | 64.9 % |
| turns 5-8 | 21323 | 0.585 | 69.3 % |
| turns 9-12 | 19428 | 0.516 | 74.6 % |
| turns 13+ | 21667 | 0.448 | 78.9 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.431 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.202 |
| runnerPointsToWin | +0.202 |
| deck:core-weyland | +0.197 |
| points | +0.193 |
| pointsToWin | -0.193 |
| threatGain | +0.175 |
| remoteProgress | +0.131 |
| remoteAgendaPoints | +0.130 |
| hqIce | +0.116 |
| rdDensity | -0.113 |
| agendasInHand | -0.090 |
| deck | +0.088 |
| deck:core-anarch | -0.086 |
| runnerCoverage | -0.084 |
| runnerRig | -0.081 |
| oddsRD | -0.072 |
| agendaPointsInHand | -0.072 |
| remoteIce | +0.071 |
| creditLead | +0.068 |
| archivesAgendas | -0.065 |
| deck:core-hb | +0.063 |
| runnerBreakers | -0.061 |
| deck:core-shaper | +0.060 |
| threatLoss | -0.055 |
| runnerCredits | -0.055 |
| remotes | -0.052 |
| hqUnrezzed | +0.043 |
| runnerTags | +0.040 |
| credits | +0.037 |
| remoteUnrezzed | +0.037 |
| rezDebt | +0.035 |
| unfunded | -0.035 |
| hand | +0.027 |
| rdIce | +0.027 |
| deck:core-criminal | +0.026 |
| oddsRemote | +0.019 |
| oddsHQ | -0.018 |
| turn | -0.011 |
| economyAssets | -0.010 |
| deck:core-jinteki | -0.010 |
| runnerHand | +0.005 |
| rdUnrezzed | -0.004 |
| badPub | +0.000 |
