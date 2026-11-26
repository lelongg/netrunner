# Learned evaluation fit

418208 positions from 27357 games · train 334107, holdout 84101 (by game)

| set | log-loss | baseline log-loss | accuracy | corp win rate |
|---|---|---|---|---|
| train | 0.540 | 0.649 | 72.2 % | 64.7 % |
| holdout | 0.551 | 0.650 | 71.6 % | 64.5 % |

| holdout slice | n | log-loss | accuracy |
|---|---|---|---|
| turns 1-4 | 21839 | 0.641 | 64.5 % |
| turns 5-8 | 21293 | 0.587 | 69.3 % |
| turns 9-12 | 19358 | 0.519 | 74.5 % |
| turns 13+ | 21611 | 0.452 | 78.6 % |

Weights on standardized features (positive favours the Corp):

| feature | weight |
|---|---|
| staticValue | +0.431 |
| deck:core-nbn | -0.254 |
| runnerPoints | -0.203 |
| runnerPointsToWin | +0.203 |
| deck:core-weyland | +0.197 |
| points | +0.194 |
| pointsToWin | -0.194 |
| threatGain | +0.175 |
| remoteProgress | +0.132 |
| remoteAgendaPoints | +0.131 |
| hqIce | +0.112 |
| rdDensity | -0.112 |
| agendasInHand | -0.090 |
| deck:core-anarch | -0.088 |
| runnerRig | -0.086 |
| runnerCoverage | -0.086 |
| deck | +0.084 |
| agendaPointsInHand | -0.071 |
| creditLead | +0.070 |
| oddsRD | -0.068 |
| remoteIce | +0.066 |
| deck:core-shaper | +0.064 |
| archivesAgendas | -0.062 |
| deck:core-hb | +0.062 |
| runnerBreakers | -0.061 |
| threatLoss | -0.059 |
| runnerCredits | -0.054 |
| remotes | -0.050 |
| hqUnrezzed | +0.048 |
| remoteUnrezzed | +0.041 |
| runnerTags | +0.041 |
| credits | +0.040 |
| rezDebt | +0.038 |
| hand | +0.031 |
| unfunded | -0.029 |
| rdIce | +0.027 |
| deck:core-criminal | +0.022 |
| oddsRemote | +0.020 |
| oddsHQ | -0.019 |
| turn | -0.010 |
| deck:core-jinteki | -0.009 |
| rdUnrezzed | -0.004 |
| economyAssets | -0.003 |
| runnerHand | +0.003 |
| badPub | +0.000 |
